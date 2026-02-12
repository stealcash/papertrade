'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ChevronLeft } from 'lucide-react';
import { optionStrategiesAPI, subscriptionsAPI } from '@/lib/api';
import Link from 'next/link';

// --- Types ---
interface StopLoss {
    enabled: boolean;
    type: 'points' | '%' | 'Spot %';
    value: string;
    ref: 'CLOSE' | 'OPEN' | 'BOTH';
}

interface TakeProfit {
    enabled: boolean;
    type: 'points' | '%' | 'Spot %';
    value: string;
    ref: 'CLOSE' | 'OPEN' | 'BOTH';
}

interface TrailingStopLoss {
    enabled: boolean;
    type: 'points' | '%' | 'Spot %';
    value: string;
    ref: 'CLOSE' | 'OPEN' | 'BOTH';
}

interface ExitCriteria {
    type: 'DAYS_BEFORE_EXPIRY'; // For Expiry Based
    dailyExitType?: 'SAME_DAY' | 'NEXT_DAY' | 'AFTER_DAYS'; // For Daily Mode
    dailyExitDays?: string; // Number of days for AFTER_DAYS
    daysBeforeExpiry: string; // "0" = Expiry, "1" = 1 Day Before
    exitTimeRef: 'CLOSE' | 'OPEN'; // Time (Open/Close)
    allowReentry: boolean; // Re-enter if exited early
    riskManagementMode: 'GLOBAL' | 'LEG_WISE';
    stopLoss: StopLoss;
    takeProfit: TakeProfit;
    trailingStopLoss: TrailingStopLoss;
}

interface EntryCriteria {
    mode: 'EXPIRY_BASED' | 'DAILY';
    daysBeforeExpiry: string; // "0" for Expiry Day, "1" for 1 Day Before
    flexibleEntry: boolean; // Enter ASAP if holidays reduce days
    priceRef: 'CLOSE' | 'OPEN';
    minVolume: string;
    waitAndTrade: {
        enabled: boolean;
        type: 'INCREASE' | 'DECREASE';
        value: string;
        ref: 'PREV_CLOSE' | 'TODAY_OPEN' | 'PREV_OPEN';
    };
}

interface StrategyLeg {
    id: string;
    type: 'CE' | 'PE';
    action: 'BUY' | 'SELL';
    strikeSelection: 'ATM' | 'ATM_PLUS' | 'ATM_MINUS';
    strikeOffsetType: '%' | 'Pt';
    strikeOffset: string;
    selectBy: 'STRIKE' | 'PREMIUM';
    targetPremium: string;
    premiumTolerance: string;
    minPremium: string;
    maxPremium: string;
    lotMultiplier: number;
    stopLoss: StopLoss;
    takeProfit: TakeProfit;
    trailingStopLoss: TrailingStopLoss;
}

// --- Helper Components ---
const Note = ({ children }: { children: React.ReactNode }) => (
    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-300 rounded border border-blue-100 dark:border-blue-900/50">
        <span className="font-bold">Note:</span> {children}
    </div>
);

const ErrorMsg = ({ children }: { children: React.ReactNode }) => (
    <div className="mt-1 text-xs text-red-600 dark:text-red-400">
        {children}
    </div>
);

const isValidOptionInput = (val: string) => {
    if (val === '') return true;
    const numericOrRegex = /^[0-9.\-\[\]()*+?|^$\\]*$/;
    return numericOrRegex.test(val);
};

export default function CreateOptionStrategyPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [legs, setLegs] = useState<StrategyLeg[]>([{
        id: Date.now().toString(),
        type: 'CE',
        action: 'BUY',
        strikeSelection: 'ATM',
        strikeOffsetType: 'Pt',
        strikeOffset: '0',
        selectBy: 'STRIKE',
        targetPremium: '100',
        premiumTolerance: '10',
        minPremium: '0',
        maxPremium: '0',
        lotMultiplier: 1,
        stopLoss: { enabled: false, type: '%', value: '5', ref: 'OPEN' },
        takeProfit: { enabled: false, type: '%', value: '10', ref: 'BOTH' },
        trailingStopLoss: { enabled: false, type: 'points', value: '10', ref: 'OPEN' }
    }]);

    const [entry, setEntry] = useState<EntryCriteria>({
        mode: 'EXPIRY_BASED',
        daysBeforeExpiry: '0',
        flexibleEntry: false,
        priceRef: 'OPEN',
        minVolume: '0',
        waitAndTrade: {
            enabled: false,
            type: 'INCREASE',
            value: '0.5',
            ref: 'PREV_CLOSE'
        }
    });

    const [exit, setExit] = useState<ExitCriteria>({
        type: 'DAYS_BEFORE_EXPIRY',
        dailyExitType: 'SAME_DAY',
        dailyExitDays: '2',
        daysBeforeExpiry: '0',
        exitTimeRef: 'CLOSE',
        allowReentry: false,
        riskManagementMode: 'GLOBAL',
        stopLoss: { enabled: false, type: '%', value: '5', ref: 'OPEN' },
        takeProfit: { enabled: false, type: '%', value: '10', ref: 'OPEN' },
        trailingStopLoss: { enabled: false, type: 'points', value: '10', ref: 'OPEN' }
    });

    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [upgradeMessage, setUpgradeMessage] = useState('');
    const [subscription, setSubscription] = useState<any>(null);
    const [isAdvanced, setIsAdvanced] = useState(false);

    useEffect(() => {
        fetchSubscription();
    }, []);

    const fetchSubscription = async () => {
        try {
            const res = await subscriptionsAPI.getCurrent();
            if (res.data) {
                setSubscription(res.data.data || res.data);
            }
        } catch (err) {
            console.error("Failed to fetch subscription", err);
        }
    };

    const addLeg = () => {
        setLegs([...legs, {
            id: Date.now().toString(),
            type: 'CE',
            action: 'BUY',
            strikeSelection: 'ATM',
            strikeOffsetType: 'Pt',
            strikeOffset: '0',
            selectBy: 'STRIKE',
            targetPremium: '100',
            premiumTolerance: '10',
            minPremium: '0',
            maxPremium: '0',
            lotMultiplier: 1,
            stopLoss: { enabled: false, type: '%', value: '5', ref: 'OPEN' },
            takeProfit: { enabled: false, type: '%', value: '10', ref: 'BOTH' },
            trailingStopLoss: { enabled: false, type: 'points', value: '10', ref: 'OPEN' }
        }]);
    };

    const updateLegRisk = (index: number, section: 'sl' | 'tp' | 'tsl', field: string, value: any) => {
        const newLegs = [...legs];
        const leg = { ...newLegs[index] };
        if (section === 'sl') {
            leg.stopLoss = { ...leg.stopLoss, [field]: value };
        } else if (section === 'tp') {
            leg.takeProfit = { ...leg.takeProfit, [field]: value };
        } else if (section === 'tsl') {
            leg.trailingStopLoss = { ...leg.trailingStopLoss, [field]: value };
        }
        newLegs[index] = leg;
        setLegs(newLegs);
    };


    const removeLeg = (index: number) => {
        setLegs(legs.filter((_, i) => i !== index));
    };

    const updateLeg = (index: number, field: string, value: any) => {
        const newLegs = [...legs];
        // @ts-ignore
        newLegs[index][field] = value;
        setLegs(newLegs);
    };

    const updateEntry = (field: string, value: any) => {
        setEntry({ ...entry, [field]: value });
    };

    const updateExit = (section: 'exit' | 'sl' | 'tp' | 'tsl', field: string, value: any) => {
        const newExit = { ...exit };
        if (section === 'exit') {
            // @ts-ignore
            newExit[field] = value;
        } else if (section === 'sl') {
            // @ts-ignore
            newExit.stopLoss[field] = value;
        } else if (section === 'tp') {
            // @ts-ignore
            newExit.takeProfit[field] = value;
        } else if (section === 'tsl') {
            // @ts-ignore
            newExit.trailingStopLoss[field] = value;
        }
        setExit(newExit);
    };


    const handleSubmit = async () => {
        if (!name) { setError('Name is required'); return; }
        if (legs.length === 0) { setError('At least one strategy leg is required.'); return; }
        setError('');

        // Global Validation
        if (entry.mode === 'DAILY') {
            const isSameDay = exit.dailyExitType === 'SAME_DAY';
            const entryTime = entry.priceRef;
            const exitTime = exit.exitTimeRef;

            if (isSameDay) {
                if (entryTime === 'CLOSE' && exitTime === 'OPEN') {
                    setError(`Error: Cannot Exit at Open if Entry is at Close (Time Travel).`);
                    return;
                }
                if (entryTime === exitTime) {
                    setError(`Error: Entry and Exit cannot be at the same time on the same day.`);
                    return;
                }
            }
        } else {
            const entryDays = parseInt(entry.daysBeforeExpiry) || 0;
            const exitDays = parseInt(exit.daysBeforeExpiry) || 0;
            const invalidTimeTravel = exitDays > entryDays;

            // Expiry Relative: Same Day logic
            const isSameDayExpiry = exitDays === entryDays;
            const expiryTimeTravel = isSameDayExpiry && (entry.priceRef === 'CLOSE' && exit.exitTimeRef === 'OPEN');
            const expirySameTime = isSameDayExpiry && (entry.priceRef === exit.exitTimeRef);

            if (invalidTimeTravel || expiryTimeTravel) {
                const msg = invalidTimeTravel
                    ? `Error: Exit (${exitDays} DTE) cannot be before Entry (${entryDays} DTE).`
                    : `Error: Cannot Exit at Open if Entry is at Close on the same day.`;
                setError(msg);
                return;
            }
            if (expirySameTime) {
                setError(`Error: Entry and Exit cannot be at the same time on the same day.`);
                return;
            }
        }

        try {
            await optionStrategiesAPI.create({
                name,
                description,
                configuration: { entry, exit, legs }
            });

            setSuccessMessage('Strategy created successfully');
            setTimeout(() => router.push('/backtest'), 1500); // Redirect to Backtest or Strategies list
        } catch (err: any) {
            console.error("Strategy Creation Error:", err);
            console.log("Error Response Data:", err.response?.data);

            // Check for subscription limit error in multiple possible fields
            const errData = err.response?.data;
            const subError = errData?.subscription || errData?.details?.subscription || errData?.non_field_errors;

            if (subError) {
                const msg = Array.isArray(subError) ? subError[0] : subError;
                setUpgradeMessage(msg);
                setIsUpgradeModalOpen(true);
            } else {
                setError(errData?.detail || errData?.message || 'Failed to save strategy');
            }
        }
    };

    // --- Dynamic Text Generator ---
    const getPlanLimits = () => {
        const feature = subscription?.plan?.features?.OPTION_STRATEGY_CREATE || subscription?.plan?.features?.STRATEGY_CREATE;
        if (!feature) return { limit: 0, used: 0, canCreate: false, unlimited: false };

        const limit = feature.limit;
        const used = subscription.usage?.OPTION_STRATEGY_CREATE ?? subscription.usage?.STRATEGY_CREATE ?? 0;
        const unlimited = limit === -1;
        const canCreate = unlimited || used < limit;

        return { limit, used, canCreate, unlimited };
    };

    const { canCreate } = getPlanLimits();

    const getEntryDayText = (days: string) => {
        const d = parseInt(days) || 0;
        if (d === 0) return "Trading will execute on the Expiry Day.";
        return `Trading will execute ${d} trading day${d > 1 ? 's' : ''} BEFORE Expiry Day.`;
    };

    const getStrikeExample = (leg: StrategyLeg) => {
        const refPrice = 25010; // Nifty Example
        const refName = entry.priceRef === 'OPEN' ? "Market Open" : "Market Close";
        const offsetVal = parseFloat(leg.strikeOffset) || 0;

        let calcPrice = refPrice;
        let formula = `${refPrice}`;

        if (leg.strikeSelection === 'ATM') {
            // Just ATM
        } else if (leg.strikeSelection === 'ATM_PLUS') {
            if (leg.strikeOffsetType === '%') {
                const add = refPrice * (offsetVal / 100);
                calcPrice += add;
                formula += ` + ${offsetVal}% (${add.toFixed(1)})`;
            } else {
                calcPrice += offsetVal;
                formula += ` + ${offsetVal}`;
            }
        } else if (leg.strikeSelection === 'ATM_MINUS') {
            if (leg.strikeOffsetType === '%') {
                const sub = refPrice * (offsetVal / 100);
                calcPrice -= sub;
                formula += ` - ${offsetVal}% (${sub.toFixed(1)})`;
            } else {
                calcPrice -= offsetVal;
                formula += ` - ${offsetVal}`;
            }
        }

        return `Example: If ${refName} is ${refPrice}, Target = ${formula} = ${calcPrice.toFixed(1)}. System will select closest available strike (e.g. 25000 or 25050).`;
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-2xl font-bold dark:text-white">Create Option Strategy</h1>
                </div>

                {error && <div className="bg-red-50 text-red-700 p-4 rounded mb-4">{error}</div>}
                {successMessage && <div className="bg-green-50 text-green-700 p-4 rounded mb-4">{successMessage}</div>}

                {/* Form */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-8">
                    <div className="flex items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700 pb-4">
                        <div className="flex-grow max-w-md">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Strategy Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm px-3 py-2 border font-bold"
                                placeholder="e.g. Short Straddle"
                            />
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">UI Mode</label>
                            <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-inner">
                                <button
                                    type="button"
                                    onClick={() => setIsAdvanced(false)}
                                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${!isAdvanced ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Basic
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsAdvanced(true)}
                                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${isAdvanced ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Advanced
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                rows={2}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm px-3 py-2 border"
                                placeholder="Describe your strategy optional"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 border-t border-gray-200 dark:border-gray-700 pt-8">
                        {/* Entry Section */}
                        <div className="space-y-6 bg-blue-50/30 dark:bg-blue-900/10 p-5 rounded-xl border border-blue-100 dark:border-blue-900/30">
                            <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 uppercase border-b border-blue-100 dark:border-blue-900/50 pb-2 mb-4 tracking-wide">Entry Timing</h4>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 uppercase">Entry Mode</label>
                                <select
                                    value={entry.mode || 'EXPIRY_BASED'}
                                    onChange={e => updateEntry('mode', e.target.value)}
                                    className="w-full rounded border-gray-300 py-2 px-3 dark:bg-gray-700 dark:text-white text-sm mb-4 focus:ring-2 focus:ring-blue-500 border"
                                >
                                    <option value="EXPIRY_BASED">Expiry Relative (Days Before)</option>
                                    <option value="DAILY">Daily / Continuous</option>
                                </select>

                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 uppercase">Execution Timing</label>
                                {entry.mode === 'EXPIRY_BASED' ? (
                                    <>
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-sm dark:text-gray-300">Expiry Day minus</span>
                                            <input
                                                type="text"
                                                min="0"
                                                value={entry.daysBeforeExpiry}
                                                onChange={e => {
                                                    if (isValidOptionInput(e.target.value)) {
                                                        updateEntry('daysBeforeExpiry', e.target.value);
                                                    }
                                                }}
                                                className="w-20 rounded border-gray-300 py-1.5 px-2 dark:bg-gray-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 border"
                                            />
                                            <span className="text-sm dark:text-gray-300">days</span>
                                        </div>
                                        <div className="flex items-center gap-2 mb-4 bg-white dark:bg-gray-900 p-2.5 rounded border border-blue-50 dark:border-blue-900/40">
                                            <input
                                                type="checkbox"
                                                checked={entry.flexibleEntry}
                                                onChange={e => updateEntry('flexibleEntry', e.target.checked)}
                                                className="h-4 w-4 text-blue-600 rounded cursor-pointer"
                                            />
                                            <label className="text-xs text-gray-700 dark:text-gray-300 cursor-pointer font-medium">Enter ASAP if holidays reduce days except weekly holiday</label>
                                        </div>
                                        <Note>{getEntryDayText(entry.daysBeforeExpiry)}</Note>
                                    </>
                                ) : (
                                    <div className="text-sm text-gray-500 mb-4 italic py-2 bg-white dark:bg-gray-900 px-3 rounded border border-blue-50 dark:border-blue-900/40">Executes every trading day.</div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 uppercase">Enter at</label>
                                <select
                                    value={entry.priceRef}
                                    onChange={e => updateEntry('priceRef', e.target.value)}
                                    className="w-full rounded border-gray-300 py-2 px-3 dark:bg-gray-700 dark:text-white text-sm border focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="OPEN">Market Open</option>
                                    <option value="CLOSE">Market Close</option>
                                </select>
                            </div>

                            {isAdvanced && (
                                <div className="pt-4 border-t border-blue-100 dark:border-blue-900/40">
                                    <label className="block text-xs font-bold text-blue-600 dark:text-blue-400 mb-1.5 uppercase flex items-center gap-2">
                                        Minimum Order Volume
                                        <span className="bg-blue-100 dark:bg-blue-900/50 text-[10px] px-2 py-0.5 rounded-full lowercase font-medium">liquidity filter</span>
                                    </label>
                                    <input
                                        type="text"
                                        min="0"
                                        value={entry.minVolume}
                                        onChange={e => {
                                            if (isValidOptionInput(e.target.value)) {
                                                updateEntry('minVolume', e.target.value);
                                            }
                                        }}
                                        className="w-full rounded border-gray-300 py-2 px-3 dark:bg-gray-700 dark:text-white text-sm border font-bold focus:ring-2 focus:ring-blue-500"
                                        placeholder="0"
                                    />
                                    <p className="text-[10px] text-gray-500 mt-2 font-medium italic">
                                        Note: If any selected strike has daily volume less than this value, the entire strategy entry will be skipped.
                                    </p>
                                </div>
                            )}

                            {isAdvanced && (
                                <div className="pt-4 border-t border-blue-100 dark:border-blue-900/40">
                                    <div className="flex items-center gap-2 mb-3">
                                        <input
                                            type="checkbox"
                                            checked={entry.waitAndTrade.enabled}
                                            onChange={e => updateEntry('waitAndTrade', { ...entry.waitAndTrade, enabled: e.target.checked })}
                                            className="h-4 w-4 text-blue-600 rounded cursor-pointer"
                                        />
                                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer uppercase tracking-wider">Wait & Trade Entry Condition</label>
                                    </div>

                                    {entry.waitAndTrade.enabled && (
                                        <div className="space-y-3 pl-6">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold dark:text-gray-400">If price</span>
                                                <select
                                                    value={entry.waitAndTrade.type}
                                                    onChange={e => updateEntry('waitAndTrade', { ...entry.waitAndTrade, type: e.target.value })}
                                                    className="rounded border-gray-300 py-1.5 px-2 dark:bg-gray-700 dark:text-white text-xs border font-bold"
                                                >
                                                    <option value="INCREASE">INCREASE</option>
                                                    <option value="DECREASE">DECREASE</option>
                                                </select>
                                                <span className="text-xs font-bold dark:text-gray-400">by</span>
                                                <input
                                                    type="text"
                                                    step="0.1"
                                                    value={entry.waitAndTrade.value}
                                                    onChange={e => {
                                                        if (isValidOptionInput(e.target.value)) {
                                                            updateEntry('waitAndTrade', { ...entry.waitAndTrade, value: e.target.value });
                                                        }
                                                    }}
                                                    className="w-16 rounded border-gray-300 py-1.5 px-2 dark:bg-gray-700 dark:text-white text-xs border font-bold"
                                                />
                                                <span className="text-xs font-bold dark:text-gray-400">% from</span>
                                            </div>
                                            <div>
                                                <select
                                                    value={entry.waitAndTrade.ref}
                                                    onChange={e => updateEntry('waitAndTrade', { ...entry.waitAndTrade, ref: e.target.value })}
                                                    className="w-full rounded border-gray-300 py-2 px-3 dark:bg-gray-700 dark:text-white text-xs border font-bold"
                                                >
                                                    <option value="PREV_CLOSE">Previous Day Close</option>
                                                    <option value="PREV_OPEN">Previous Day Open</option>
                                                    {entry.priceRef === 'CLOSE' && <option value="TODAY_OPEN">Today's Open</option>}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="space-y-6 bg-amber-50/30 dark:bg-amber-900/10 p-5 rounded-xl border border-amber-100 dark:border-amber-900/30">
                            <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300 uppercase border-b border-amber-100 dark:border-amber-900/50 pb-2 mb-4 tracking-wide">Exit & Safety</h4>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 uppercase">Exit Timing</label>
                                {entry.mode === 'DAILY' ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={exit.dailyExitType || 'SAME_DAY'}
                                                onChange={e => updateExit('exit', 'dailyExitType', e.target.value)}
                                                className="rounded border-gray-300 py-2 px-3 dark:bg-gray-700 dark:text-white text-sm border flex-grow"
                                            >
                                                <option value="SAME_DAY">Same Day</option>
                                                <option value="AFTER_DAYS">After n days</option>
                                            </select>

                                            {exit.dailyExitType === 'AFTER_DAYS' && (
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="text"
                                                        min="1"
                                                        value={exit.dailyExitDays}
                                                        onChange={e => {
                                                            if (isValidOptionInput(e.target.value)) {
                                                                updateExit('exit', 'dailyExitDays', e.target.value);
                                                            }
                                                        }}
                                                        className="w-16 rounded border-gray-300 py-1.5 px-2 dark:bg-gray-700 dark:text-white border"
                                                    />
                                                    <span className="text-xs dark:text-gray-300">days</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm dark:text-gray-300">at</span>
                                            <select
                                                value={exit.exitTimeRef}
                                                onChange={e => updateExit('exit', 'exitTimeRef', e.target.value)}
                                                className="w-full rounded border-gray-300 py-2 px-3 dark:bg-gray-700 dark:text-white text-sm border"
                                            >
                                                <option value="CLOSE">Market Close</option>
                                                <option value="OPEN">Market Open</option>
                                            </select>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm dark:text-gray-300">Expiry minus</span>
                                            <input
                                                type="text"
                                                min="0"
                                                value={exit.daysBeforeExpiry}
                                                onChange={e => {
                                                    if (isValidOptionInput(e.target.value)) {
                                                        updateExit('exit', 'daysBeforeExpiry', e.target.value);
                                                    }
                                                }}
                                                className="w-16 rounded border-gray-300 py-1.5 px-2 dark:bg-gray-700 dark:text-white border"
                                            />
                                            <span className="text-sm dark:text-gray-300">days at</span>
                                            <select
                                                value={exit.exitTimeRef}
                                                onChange={e => updateExit('exit', 'exitTimeRef', e.target.value)}
                                                className="rounded border-gray-300 py-2 px-3 dark:bg-gray-700 dark:text-white text-sm border flex-grow"
                                            >
                                                <option value="CLOSE">Market Close</option>
                                                <option value="OPEN">Market Open</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Safety Features */}
                            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800/50">
                                <div className="flex flex-col gap-2 mb-2">
                                    {isAdvanced && (
                                        <div className="flex flex-col gap-2 mb-2">
                                            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">Risk Management Mode</label>
                                            <div className="flex gap-4 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-xl border border-gray-100 dark:border-gray-700/50 shadow-inner">
                                                <label className={`flex items-center gap-2 cursor-pointer p-1.5 rounded-lg transition-all ${exit.riskManagementMode === 'GLOBAL' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'opacity-60'}`}>
                                                    <input
                                                        type="radio"
                                                        name="riskMode"
                                                        checked={exit.riskManagementMode === 'GLOBAL'}
                                                        onChange={() => updateExit('exit', 'riskManagementMode', 'GLOBAL')}
                                                        className="h-3 w-3 text-amber-600 focus:ring-amber-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Global</span>
                                                    </div>
                                                </label>
                                                <label className={`flex items-center gap-2 cursor-pointer p-1.5 rounded-lg transition-all ${exit.riskManagementMode === 'LEG_WISE' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'opacity-60'}`}>
                                                    <input
                                                        type="radio"
                                                        name="riskMode"
                                                        checked={exit.riskManagementMode === 'LEG_WISE'}
                                                        onChange={() => updateExit('exit', 'riskManagementMode', 'LEG_WISE')}
                                                        className="h-3 w-3 text-amber-600 focus:ring-amber-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Leg-wise</span>
                                                    </div>
                                                </label>
                                            </div>

                                            {exit.riskManagementMode === 'LEG_WISE' && (
                                                <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 text-[10px] text-amber-800 dark:text-amber-300 rounded-lg border border-amber-100 dark:border-amber-900/30 flex items-start gap-2 animate-pulse">
                                                    <span className="text-sm leading-none">💡</span>
                                                    <div>
                                                        <p className="font-bold uppercase tracking-wider mb-0.5">Leg-wise Risk Active</p>
                                                        <p className="font-medium opacity-80 leading-relaxed">Individual rules active. Configure them in the Leg Builder above.</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {exit.riskManagementMode === 'GLOBAL' ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <input
                                                type="checkbox"
                                                checked={exit.stopLoss.enabled}
                                                onChange={e => updateExit('sl', 'enabled', e.target.checked)}
                                                className="h-4 w-4 text-blue-600 rounded"
                                            />
                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Stop Loss</span>
                                        </div>
                                        {exit.stopLoss.enabled && (
                                            <div className="flex gap-2 pl-6 items-center">
                                                <input
                                                    type="number"
                                                    value={exit.stopLoss.value}
                                                    onChange={e => updateExit('sl', 'value', e.target.value)}
                                                    className="w-20 rounded border-gray-300 py-1.5 px-2 dark:bg-gray-700 dark:text-white text-sm border"
                                                />
                                                <select
                                                    value={exit.stopLoss.type || '%'}
                                                    onChange={e => updateExit('sl', 'type', e.target.value)}
                                                    className="rounded border-gray-300 py-1.5 px-2 dark:bg-gray-700 dark:text-white text-sm border"
                                                >
                                                    <option value="%">%</option>
                                                    <option value="points">Pt</option>
                                                    <option value="Spot %">Spot %</option>
                                                </select>
                                                <span className="text-sm">on</span>
                                                <select
                                                    value={exit.stopLoss.ref}
                                                    onChange={e => updateExit('sl', 'ref', e.target.value)}
                                                    className="rounded border-gray-300 py-1.5 px-2 dark:bg-gray-700 dark:text-white text-sm border"
                                                >
                                                    <option value="OPEN">Market Open</option>
                                                    <option value="CLOSE">Market Close</option>
                                                    <option value="BOTH">Both</option>
                                                </select>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2 mb-1">
                                            <input
                                                type="checkbox"
                                                checked={exit.takeProfit.enabled}
                                                onChange={e => updateExit('tp', 'enabled', e.target.checked)}
                                                className="h-4 w-4 text-blue-600 rounded"
                                            />
                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Take Profit</span>
                                        </div>
                                        {exit.takeProfit.enabled && (
                                            <div className="flex gap-2 pl-6 items-center">
                                                <input
                                                    type="number"
                                                    value={exit.takeProfit.value}
                                                    onChange={e => updateExit('tp', 'value', e.target.value)}
                                                    className="w-20 rounded border-gray-300 py-1.5 px-2 dark:bg-gray-700 dark:text-white text-sm border"
                                                />
                                                <select
                                                    value={exit.takeProfit.type || '%'}
                                                    onChange={e => updateExit('tp', 'type', e.target.value)}
                                                    className="rounded border-gray-300 py-1.5 px-2 dark:bg-gray-700 dark:text-white text-sm border"
                                                >
                                                    <option value="%">%</option>
                                                    <option value="points">Pt</option>
                                                    <option value="Spot %">Spot %</option>
                                                </select>
                                                <span className="text-sm">on</span>
                                                <select
                                                    value={exit.takeProfit.ref}
                                                    onChange={e => updateExit('tp', 'ref', e.target.value)}
                                                    className="rounded border-gray-300 py-1.5 px-2 dark:bg-gray-700 dark:text-white text-sm border"
                                                >
                                                    <option value="OPEN">Market Open</option>
                                                    <option value="CLOSE">Market Close</option>
                                                    <option value="BOTH">Both</option>
                                                </select>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2 mb-1">
                                            <input
                                                type="checkbox"
                                                checked={exit.trailingStopLoss.enabled}
                                                onChange={e => updateExit('tsl', 'enabled', e.target.checked)}
                                                className="h-4 w-4 text-blue-600 rounded"
                                            />
                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Trailing SL</span>
                                        </div>
                                        {exit.trailingStopLoss.enabled && (
                                            <div className="flex gap-2 pl-6 items-center">
                                                <input
                                                    type="number"
                                                    value={exit.trailingStopLoss.value}
                                                    onChange={e => updateExit('tsl', 'value', e.target.value)}
                                                    className="w-20 rounded border-gray-300 py-1.5 px-2 dark:bg-gray-700 dark:text-white text-sm border"
                                                />
                                                <select
                                                    value={exit.trailingStopLoss.type}
                                                    onChange={e => updateExit('tsl', 'type', e.target.value)}
                                                    className="rounded border-gray-300 py-1.5 px-2 dark:bg-gray-700 dark:text-white text-sm border"
                                                >
                                                    <option value="points">Points</option>
                                                    <option value="%">%</option>
                                                    <option value="Spot %">Spot %</option>
                                                </select>
                                                <span className="text-sm">on</span>
                                                <select
                                                    value={exit.trailingStopLoss.ref || 'OPEN'}
                                                    onChange={e => updateExit('tsl', 'ref', e.target.value)}
                                                    className="rounded border-gray-300 py-1.5 px-2 dark:bg-gray-700 dark:text-white text-sm border"
                                                >
                                                    <option value="OPEN">Market Open</option>
                                                    <option value="CLOSE">Market Close</option>
                                                    <option value="BOTH">Both</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-blue-50/30 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100/50 dark:border-blue-900/20">
                                        <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300">💡 Leg-wise Mode Active</p>
                                        <p className="text-[9px] text-blue-600/80 dark:text-blue-400/80 mt-0.5">Configure targets for each leg below.</p>
                                    </div>
                                )}

                                {(exit.stopLoss.enabled || exit.takeProfit.enabled) && (
                                    <div className="pt-4 mt-2 border-t border-amber-50 dark:border-amber-900/20">
                                        <label className="block text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-3">Re-entry Settings</label>
                                        <div className="flex gap-4 mb-3">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="reentry"
                                                    checked={!exit.allowReentry}
                                                    onChange={() => updateExit('exit', 'allowReentry', false)}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Exit Only</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="reentry"
                                                    checked={exit.allowReentry}
                                                    onChange={() => updateExit('exit', 'allowReentry', true)}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Exit & Re-entry</span>
                                            </label>
                                        </div>
                                        <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-medium italic leading-relaxed">
                                            Note: When Stop Loss or Take Profit is triggered, the system will ignore entry timing/DTE constraints and automatically re-enter based on your leg selection criteria.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-green-600 rounded-full"></span>
                                Strategy Legs (Option Builder)
                            </h3>
                            <button onClick={addLeg} className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-all">
                                <Plus className="w-4 h-4" /> Add Leg
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {legs.map((leg, index) => (
                                <div key={leg.id} className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 flex justify-between items-center border-b dark:border-gray-700">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">{index + 1}</div>
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={leg.action}
                                                    onChange={e => updateLeg(index, 'action', e.target.value)}
                                                    className={`rounded-lg font-bold px-4 py-1.5 text-sm cursor-pointer border-0 shadow-sm ${leg.action === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                                                >
                                                    <option value="BUY">BUY</option>
                                                    <option value="SELL">SELL</option>
                                                </select>
                                                <select
                                                    value={leg.type}
                                                    onChange={e => updateLeg(index, 'type', e.target.value)}
                                                    className="rounded-lg border-gray-200 shadow-sm px-4 py-1.5 dark:bg-gray-700 dark:text-white font-bold text-sm border cursor-pointer"
                                                >
                                                    <option value="CE">CE (Call)</option>
                                                    <option value="PE">PE (Put)</option>
                                                </select>
                                                <div className="flex items-center gap-1.5 ml-2 bg-blue-50 dark:bg-blue-900/40 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tighter">Multiplier</span>
                                                    <select
                                                        value={leg.lotMultiplier}
                                                        onChange={e => updateLeg(index, 'lotMultiplier', parseInt(e.target.value))}
                                                        className="bg-transparent border-0 text-xs font-black p-0 focus:ring-0 cursor-pointer"
                                                    >
                                                        <option value="1">1x</option>
                                                        <option value="2">2x</option>
                                                        <option value="3">3x</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => removeLeg(index)} className="text-gray-400 hover:text-red-600 transition-colors p-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m4-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>

                                    <div className="p-6">
                                        <div className="space-y-4">
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Strike Selection</label>
                                            <div className="flex items-center gap-6 mb-4">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        checked={leg.selectBy === 'STRIKE'}
                                                        onChange={() => updateLeg(index, 'selectBy', 'STRIKE')}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Target Strike</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        checked={leg.selectBy === 'PREMIUM'}
                                                        onChange={() => updateLeg(index, 'selectBy', 'PREMIUM')}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Target Premium</span>
                                                </label>
                                            </div>

                                            {leg.selectBy === 'STRIKE' ? (
                                                <div className="flex flex-wrap gap-4 items-center bg-gray-50/50 dark:bg-gray-800/30 p-4 rounded-xl border border-gray-100 dark:border-gray-800/50">
                                                    <select
                                                        value={leg.strikeSelection}
                                                        onChange={e => updateLeg(index, 'strikeSelection', e.target.value)}
                                                        className="flex-grow min-w-[200px] rounded-lg border-gray-300 py-2.5 px-4 dark:bg-gray-700 dark:text-white text-sm border focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                                    >
                                                        <option value="ATM">ATM (At The Money)</option>
                                                        <option value="ATM_PLUS">ATM + Offset (Out of Money for SELL)</option>
                                                        <option value="ATM_MINUS">ATM - Offset (In The Money for SELL)</option>
                                                    </select>

                                                    {leg.strikeSelection !== 'ATM' && (
                                                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-1 rounded-lg border dark:border-gray-700">
                                                            <input
                                                                type="text"
                                                                min="0"
                                                                value={leg.strikeOffset}
                                                                onChange={e => {
                                                                    if (isValidOptionInput(e.target.value)) {
                                                                        updateLeg(index, 'strikeOffset', e.target.value);
                                                                    }
                                                                }}
                                                                className="w-20 bg-transparent border-0 focus:ring-0 py-1.5 px-3 dark:text-white text-sm text-center font-bold"
                                                                placeholder="1"
                                                            />
                                                            <select
                                                                value={leg.strikeOffsetType}
                                                                onChange={e => updateLeg(index, 'strikeOffsetType', e.target.value)}
                                                                className="bg-white dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 py-1 px-3 text-xs font-bold shadow-sm"
                                                            >
                                                                <option value="%">%</option>
                                                                <option value="Pt">Pt</option>
                                                            </select>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-4 border-l border-gray-200 dark:border-gray-700 pl-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Min Option Price</span>
                                                            <input
                                                                type="text"
                                                                min="0"
                                                                value={leg.minPremium}
                                                                onChange={e => {
                                                                    if (isValidOptionInput(e.target.value)) {
                                                                        updateLeg(index, 'minPremium', e.target.value);
                                                                    }
                                                                }}
                                                                className="w-20 rounded-lg border-gray-200 py-1.5 px-3 dark:bg-gray-700 dark:text-white text-xs border font-bold"
                                                                placeholder="0"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Max Option Price</span>
                                                            <input
                                                                type="text"
                                                                min="0"
                                                                value={leg.maxPremium}
                                                                onChange={e => {
                                                                    if (isValidOptionInput(e.target.value)) {
                                                                        updateLeg(index, 'maxPremium', e.target.value);
                                                                    }
                                                                }}
                                                                className="w-20 rounded-lg border-gray-200 py-1.5 px-3 dark:bg-gray-700 dark:text-white text-xs border font-bold"
                                                                placeholder="0"
                                                            />
                                                        </div>
                                                    </div>
                                                    {(parseFloat(leg.minPremium) > 0 || parseFloat(leg.maxPremium) > 0) && (
                                                        <p className="w-full text-[10px] text-orange-600 font-medium italic mt-2">
                                                            Note: Trade will be skipped if option price is {parseFloat(leg.minPremium) > 0 ? `below ${leg.minPremium}` : ''} {parseFloat(leg.minPremium) > 0 && parseFloat(leg.maxPremium) > 0 ? 'or' : ''} {parseFloat(leg.maxPremium) > 0 ? `above ${leg.maxPremium}` : ''}.
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <div className="flex flex-wrap gap-4 items-center bg-gray-50/50 dark:bg-gray-800/30 p-4 rounded-xl border border-gray-100 dark:border-gray-800/50">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-gray-500 uppercase">Target Option Price</span>
                                                            <input
                                                                type="text"
                                                                value={leg.targetPremium}
                                                                onChange={e => {
                                                                    if (isValidOptionInput(e.target.value)) {
                                                                        updateLeg(index, 'targetPremium', e.target.value);
                                                                    }
                                                                }}
                                                                className="w-28 rounded-lg border-gray-300 py-2 px-3 dark:bg-gray-700 dark:text-white text-sm border font-bold focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-gray-500 uppercase">Tolerance (+/-)</span>
                                                            <input
                                                                type="text"
                                                                value={leg.premiumTolerance}
                                                                onChange={e => {
                                                                    if (isValidOptionInput(e.target.value)) {
                                                                        updateLeg(index, 'premiumTolerance', e.target.value);
                                                                    }
                                                                }}
                                                                className="w-20 rounded-lg border-gray-300 py-2 px-3 dark:bg-gray-700 dark:text-white text-sm border font-bold focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        </div>
                                                    </div>
                                                    <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium italic bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg border border-blue-100 dark:border-blue-800/30">
                                                        Note: Engine will automatically select the strike price with option price closest to {leg.targetPremium}. If no strike is found within {leg.premiumTolerance} points of your target, the trade will be skipped.
                                                    </p>
                                                </div>
                                            )}
                                            {leg.selectBy === 'STRIKE' && <Note>{getStrikeExample(leg)}</Note>}

                                            {exit.riskManagementMode === 'LEG_WISE' && (
                                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800/50 space-y-3">
                                                    <div className="flex items-center justify-between gap-2 mb-1">
                                                        <h5 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Leg Risk Management</h5>
                                                        <div className="h-px flex-grow bg-gray-100 dark:bg-gray-800/50 ml-4"></div>
                                                    </div>

                                                    {/* Leg Stop Loss */}
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <div className="flex items-center gap-2 min-w-[100px]">
                                                            <input
                                                                type="checkbox"
                                                                checked={leg.stopLoss.enabled}
                                                                onChange={e => updateLegRisk(index, 'sl', 'enabled', e.target.checked)}
                                                                className="h-3 w-3 text-amber-600 rounded cursor-pointer"
                                                            />
                                                            <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Stop Loss</span>
                                                        </div>
                                                        {leg.stopLoss.enabled && (
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={leg.stopLoss.value}
                                                                    onChange={e => {
                                                                        if (isValidOptionInput(e.target.value)) {
                                                                            updateLegRisk(index, 'sl', 'value', e.target.value);
                                                                        }
                                                                    }}
                                                                    className="w-16 rounded border-gray-300 py-1 px-2 dark:bg-gray-700 dark:text-white text-[10px] border font-bold focus:ring-1 focus:ring-amber-500"
                                                                />
                                                                <select
                                                                    value={leg.stopLoss.type || '%'}
                                                                    onChange={e => updateLegRisk(index, 'sl', 'type', e.target.value)}
                                                                    className="rounded border-gray-300 py-1 px-1 dark:bg-gray-700 dark:text-white text-[10px] border font-bold"
                                                                >
                                                                    <option value="%">%</option>
                                                                    <option value="points">Pt</option>
                                                                    <option value="Spot %">Spot %</option>
                                                                </select>
                                                                <span className="text-[10px] font-bold dark:text-gray-500">on</span>
                                                                <select
                                                                    value={leg.stopLoss.ref}
                                                                    onChange={e => updateLegRisk(index, 'sl', 'ref', e.target.value)}
                                                                    className="rounded border-gray-300 py-1 px-1 dark:bg-gray-700 dark:text-white text-[10px] border font-bold"
                                                                >
                                                                    <option value="OPEN">Open</option>
                                                                    <option value="CLOSE">Close</option>
                                                                    <option value="BOTH">Both</option>
                                                                </select>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Leg Take Profit */}
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <div className="flex items-center gap-2 min-w-[100px]">
                                                            <input
                                                                type="checkbox"
                                                                checked={leg.takeProfit.enabled}
                                                                onChange={e => updateLegRisk(index, 'tp', 'enabled', e.target.checked)}
                                                                className="h-3 w-3 text-emerald-600 rounded cursor-pointer"
                                                            />
                                                            <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Take Profit</span>
                                                        </div>
                                                        {leg.takeProfit.enabled && (
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={leg.takeProfit.value}
                                                                    onChange={e => {
                                                                        if (isValidOptionInput(e.target.value)) {
                                                                            updateLegRisk(index, 'tp', 'value', e.target.value);
                                                                        }
                                                                    }}
                                                                    className="w-16 rounded border-gray-300 py-1 px-2 dark:bg-gray-700 dark:text-white text-[10px] border font-bold focus:ring-1 focus:ring-emerald-500"
                                                                />
                                                                <select
                                                                    value={leg.takeProfit.type || '%'}
                                                                    onChange={e => updateLegRisk(index, 'tp', 'type', e.target.value)}
                                                                    className="rounded border-gray-300 py-1 px-1 dark:bg-gray-700 dark:text-white text-[10px] border font-bold"
                                                                >
                                                                    <option value="%">%</option>
                                                                    <option value="points">Pt</option>
                                                                    <option value="Spot %">Spot %</option>
                                                                </select>
                                                                <span className="text-[10px] font-bold dark:text-gray-500">on</span>
                                                                <select
                                                                    value={leg.takeProfit.ref}
                                                                    onChange={e => updateLegRisk(index, 'tp', 'ref', e.target.value)}
                                                                    className="rounded border-gray-300 py-1 px-1 dark:bg-gray-700 dark:text-white text-[10px] border font-bold"
                                                                >
                                                                    <option value="OPEN">Open</option>
                                                                    <option value="CLOSE">Close</option>
                                                                    <option value="BOTH">Both</option>
                                                                </select>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Leg Trailing SL */}
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <div className="flex items-center gap-2 min-w-[100px]">
                                                            <input
                                                                type="checkbox"
                                                                checked={leg.trailingStopLoss.enabled}
                                                                onChange={e => updateLegRisk(index, 'tsl', 'enabled', e.target.checked)}
                                                                className="h-3 w-3 text-blue-600 rounded cursor-pointer"
                                                            />
                                                            <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Trailing SL</span>
                                                        </div>
                                                        {leg.trailingStopLoss.enabled && (
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={leg.trailingStopLoss.value}
                                                                    onChange={e => {
                                                                        if (isValidOptionInput(e.target.value)) {
                                                                            updateLegRisk(index, 'tsl', 'value', e.target.value);
                                                                        }
                                                                    }}
                                                                    className="w-16 rounded border-gray-300 py-1 px-2 dark:bg-gray-700 dark:text-white text-[10px] border font-bold focus:ring-1 focus:ring-blue-500"
                                                                />
                                                                <select
                                                                    value={leg.trailingStopLoss.type}
                                                                    onChange={e => updateLegRisk(index, 'tsl', 'type', e.target.value)}
                                                                    className="rounded border-gray-300 py-1 px-1 dark:bg-gray-700 dark:text-white text-[10px] border font-bold"
                                                                >
                                                                    <option value="points">Pts</option>
                                                                    <option value="%">%</option>
                                                                    <option value="Spot %">Spot %</option>
                                                                </select>
                                                                <span className="text-[10px] font-bold dark:text-gray-500">on</span>
                                                                <select
                                                                    value={leg.trailingStopLoss.ref || 'OPEN'}
                                                                    onChange={e => updateLegRisk(index, 'tsl', 'ref', e.target.value)}
                                                                    className="rounded border-gray-300 py-1 px-1 dark:bg-gray-700 dark:text-white text-[10px] border font-bold"
                                                                >
                                                                    <option value="OPEN">Open</option>
                                                                    <option value="CLOSE">Close</option>
                                                                    <option value="BOTH">Both</option>
                                                                </select>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <button onClick={addLeg} className="w-full py-6 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl text-gray-400 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group">
                                <Plus className="w-6 h-6 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                                <span className="font-bold">Add Another Strategy Leg</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6">
                        <button onClick={() => router.back()} className="px-5 py-2 border rounded text-gray-600 hover:bg-gray-50">Cancel</button>
                        <button
                            onClick={handleSubmit}
                            disabled={!canCreate}
                            className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {canCreate ? 'Create Strategy' : 'Limit Reached'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Upgrade Modal */}
            {
                isUpgradeModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-sm w-full p-6 text-center space-y-4 animate-in fade-in zoom-in duration-200">
                            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                                <span className="text-2xl">⚡</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Upgrade Required</h3>
                            <p className="text-gray-600">{upgradeMessage || "Your current plan limits the number of strategies you can create."}</p>

                            <div className="pt-4 flex flex-col gap-2">
                                <Link href="/subscription" className="w-full py-2.5 bg-black text-white hover:bg-gray-800 rounded-lg font-medium transition">
                                    View Plans
                                </Link>
                                <button
                                    onClick={() => setIsUpgradeModalOpen(false)}
                                    className="w-full py-2.5 text-gray-500 hover:bg-gray-100 rounded-lg font-medium transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
}
