'use client';

import { useState, useEffect } from 'react';
import { X, ChevronRight, Check, Info } from 'lucide-react';
import apiClient from '@/lib/api';
import Link from 'next/link';

import { optionStrategiesAPI, subscriptionsAPI } from '@/lib/api';

const optionBacktestAPI = {
    run: (data: any) => apiClient.post('/backtest/option-backtest/run/', data),
};

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialStrategyId?: number;
}

export default function NewOptionBacktestModal({ isOpen, onClose, onSuccess, initialStrategyId }: ModalProps) {
    const [step, setStep] = useState(1);
    const [strategies, setStrategies] = useState<any[]>([]);
    const [stocks, setStocks] = useState<any[]>([]);
    const [indices, setIndices] = useState<any[]>([]);
    const [underlyingType, setUnderlyingType] = useState<'index' | 'stock'>('index');
    const [formData, setFormData] = useState({
        strategy_id: initialStrategyId || '' as string | number,
        underlying_symbol: '',
        lot_size: 50,
        start_date: '',
        end_date: '',
    });
    const [loading, setLoading] = useState(false);
    const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
    const [upgradeMessage, setUpgradeMessage] = useState('');
    const [subscription, setSubscription] = useState<any>(null);

    // Hardcoded frontend defaults for convenience
    const lotSizeDefaults: Record<string, number> = {
        'NIFTY50': 50,
        'NIFTY': 50,
        'BANKNIFTY': 25,
        'FINNIFTY': 40,
        'MIDCPNIFTY': 75,
    };

    useEffect(() => {
        if (isOpen) {
            setStep(initialStrategyId ? 2 : 1);
            fetchStrategies();
            fetchIndices();
            fetchStocks();
            fetchSubscription();

            // Explicitly reset form data on open to prevent persistence from previous runs
            setFormData({
                strategy_id: initialStrategyId || '',
                underlying_symbol: '',
                lot_size: 50,
                start_date: '',
                end_date: '',
            });
        }
    }, [isOpen, initialStrategyId]);

    async function fetchStrategies() {
        try {
            const res = await optionStrategiesAPI.getAll();
            const data = res.data.data.results || res.data.data || [];
            setStrategies(data);
        } catch (err) {
            console.error('Failed to load strategies', err);
        }
    }

    async function fetchSubscription() {
        try {
            const res = await subscriptionsAPI.getCurrent();
            if (res.data) {
                setSubscription(res.data.data || res.data);
            }
        } catch (err) {
            console.error("Failed to fetch subscription", err);
        }
    }

    async function fetchIndices() {
        try {
            const res = await apiClient.get('/stocks/?is_index=true&is_option_enable=true');
            const data = res.data.data.stocks || res.data.data.results || [];
            setIndices(data);

            // Set default symbol if type is index and no symbol is selected yet
            if (underlyingType === 'index' && data.length > 0 && !formData.underlying_symbol) {
                const firstAsset = data[0];
                setFormData(prev => ({
                    ...prev,
                    underlying_symbol: firstAsset.symbol,
                    lot_size: lotSizeDefaults[firstAsset.symbol] || 50
                }));
            }
        } catch (err) {
            console.error('Failed to load indices', err);
        }
    }

    async function fetchStocks() {
        try {
            const res = await apiClient.get('/stocks/?is_index=false&is_option_enable=true&page_size=200');
            const data = res.data.data.stocks || res.data.data.results || [];
            setStocks(data);
        } catch (err) {
            console.error('Failed to load stocks', err);
        }
    }

    const handleTypeChange = (type: 'index' | 'stock') => {
        setUnderlyingType(type);
        const assets = type === 'index' ? indices : stocks;
        const firstAsset = assets[0];
        setFormData(prev => ({
            ...prev,
            underlying_symbol: firstAsset?.symbol || '',
            lot_size: lotSizeDefaults[firstAsset?.symbol] || (type === 'index' ? 50 : 1)
        }));
    };

    const handleSymbolChange = (symbol: string) => {
        setFormData(prev => ({
            ...prev,
            underlying_symbol: symbol,
            lot_size: lotSizeDefaults[symbol] || prev.lot_size
        }));
    };

    async function handleSubmit(e: React.FormEvent) {
        if (e) e.preventDefault();

        // Safety Guard: Only allow submission if we are on step 2
        if (step !== 2) return;

        setLoading(true);
        try {
            const payload = {
                strategy_id: Number(formData.strategy_id),
                underlying_symbol: formData.underlying_symbol,
                lot_size: formData.lot_size,
                start_date: formData.start_date,
                end_date: formData.end_date,
            };
            await optionBacktestAPI.run(payload);
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Backtest Run Error:", err);
            const errData = err.response?.data;
            const subError = errData?.subscription || errData?.details?.subscription || errData?.non_field_errors;

            if (subError) {
                const msg = Array.isArray(subError) ? subError[0] : subError;
                setUpgradeMessage(msg);
                setUpgradeModalOpen(true);
            } else {
                alert(errData?.detail || errData?.message || 'Failed to run backtest');
            }
        }
        setLoading(true); // Keep loading true during onClose/onSuccess transition
        setTimeout(() => setLoading(false), 500);
    }

    if (!isOpen) return null;

    const systemStrategies = strategies.filter(s => s.is_system);
    const myStrategies = strategies.filter(s => !s.is_system);

    const getPlanLimits = () => {
        const feature = subscription?.plan?.features?.OPTION_BACKTEST_RUN;
        if (!feature) return { limit: 0, used: 0, canRun: false, unlimited: false };

        const limit = feature.limit;
        const used = subscription.usage?.OPTION_BACKTEST_RUN ?? 0;
        const unlimited = limit === -1;
        const canRun = unlimited || used < limit;

        return { limit, used, canRun, unlimited };
    };

    const { canRun } = getPlanLimits();
    const selectedStrategyName = strategies.find(s => String(s.id) === String(formData.strategy_id))?.name;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-800">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">New Option Backtest</h2>
                        <p className="text-sm text-gray-500">Step {step} of 2</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {/* STEP 1: Strategy Selection */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Select Strategy</h3>
                                <Link href="/option-strategies/create" className="text-sm text-blue-600 hover:underline font-medium">+ Create New</Link>
                            </div>

                            {strategies.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <p className="text-sm">No option strategies found.</p>
                                    <Link href="/option-strategies/create" className="text-blue-600 text-sm hover:underline mt-2 inline-block">Create your first strategy →</Link>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* My Strategies */}
                                    {myStrategies.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">My Strategies</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {myStrategies.map((strat) => (
                                                    <div key={strat.id}
                                                        onClick={() => setFormData({ ...formData, strategy_id: strat.id })}
                                                        className={`p-4 border rounded-xl cursor-pointer transition relative group ${Number(formData.strategy_id) === strat.id
                                                            ? 'border-black dark:border-white bg-gray-50 dark:bg-gray-800 ring-1 ring-black dark:ring-white'
                                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                                                            }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">{strat.name}</div>
                                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                {strat.description && (
                                                                    <div className="relative group/info">
                                                                        <Info size={14} className="text-gray-400 hover:text-gray-600" />
                                                                        <div className="absolute bottom-full mb-2 right-0 w-56 p-2.5 bg-gray-900 text-white text-xs rounded shadow-lg hidden group-hover/info:block z-50">
                                                                            {strat.description}
                                                                            <div className="w-2 h-2 bg-gray-900 rotate-45 absolute -bottom-1 right-3"></div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {Number(formData.strategy_id) === strat.id && <Check size={16} className="text-green-600" />}
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1 truncate">{strat.description || 'Custom Strategy'}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* System Strategies */}
                                    {systemStrategies.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">System Strategies</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {systemStrategies.map((strat) => (
                                                    <div key={strat.id}
                                                        onClick={() => setFormData({ ...formData, strategy_id: strat.id })}
                                                        className={`p-4 border rounded-xl cursor-pointer transition relative ${Number(formData.strategy_id) === strat.id
                                                            ? 'border-black dark:border-white bg-gray-50 dark:bg-gray-800 ring-1 ring-black dark:ring-white'
                                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                                                            }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">{strat.name}</div>
                                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                {strat.description && (
                                                                    <div className="relative group/info">
                                                                        <Info size={14} className="text-gray-400 hover:text-gray-600" />
                                                                        <div className="absolute bottom-full mb-2 right-0 w-56 p-2.5 bg-gray-900 text-white text-xs rounded shadow-lg hidden group-hover/info:block z-50">
                                                                            {strat.description}
                                                                            <div className="w-2 h-2 bg-gray-900 rotate-45 absolute -bottom-1 right-3"></div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {Number(formData.strategy_id) === strat.id && <Check size={16} className="text-green-600" />}
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1 truncate">{strat.description || 'System'}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 2: Configuration */}
                    {step === 2 && (
                        <form onSubmit={handleSubmit} id="backtestForm" className="space-y-6">
                            {/* Selected strategy badge */}
                            {selectedStrategyName && (
                                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <Check size={14} className="text-green-600 flex-shrink-0" />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Strategy:</span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{selectedStrategyName}</span>
                                </div>
                            )}

                            {/* Underlying Selection UI */}
                            <div className="space-y-4">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    Select Underlying Asset
                                </label>

                                {/* Toggle Switches */}
                                <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-full max-w-xs">
                                    <button
                                        type="button"
                                        onClick={() => handleTypeChange('index')}
                                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${underlyingType === 'index' ? 'bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Index
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleTypeChange('stock')}
                                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${underlyingType === 'stock' ? 'bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Stock
                                    </button>
                                </div>

                                {/* Symbol Selector */}
                                <div>
                                    {underlyingType === 'index' ? (
                                        <select
                                            value={formData.underlying_symbol}
                                            onChange={(e) => handleSymbolChange(e.target.value)}
                                            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-black focus:outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                                            required
                                        >
                                            {indices.length === 0 && <option value="">No Indices available</option>}
                                            {indices.map((idx) => (
                                                <option key={idx.id} value={idx.symbol}>
                                                    {idx.name} ({idx.symbol})
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <select
                                            value={formData.underlying_symbol}
                                            onChange={(e) => handleSymbolChange(e.target.value)}
                                            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-black focus:outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                                            required
                                        >
                                            <option value="">Select Stock</option>
                                            {stocks.map((stock) => (
                                                <option key={stock.id} value={stock.symbol}>
                                                    {stock.symbol} - {stock.name}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>

                            {/* Lot Size */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Lot Size (Quantity per Trade)
                                </label>
                                <input
                                    type="number"
                                    value={formData.lot_size}
                                    onChange={(e) => setFormData({ ...formData, lot_size: Number(e.target.value) })}
                                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-black focus:outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                                    placeholder="e.g., 50 for NIFTY"
                                    min="1"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Current defaults: NIFTY50=50, BANKNIFTY=25. You can edit this.
                                </p>
                            </div>

                            {/* Date Range */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-black focus:outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        End Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-black focus:outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                                        required
                                    />
                                </div>
                            </div>
                        </form>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900/50">
                    {step > 1 && (
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="px-5 py-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition"
                        >
                            Back
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-300"
                    >
                        Cancel
                    </button>

                    {step === 1 ? (
                        <button
                            key="btn-next"
                            type="button"
                            onClick={() => {
                                if (!formData.strategy_id) return alert("Please select a strategy");
                                setStep(2);
                            }}
                            className="px-6 py-2 bg-black text-white rounded-lg font-semibold flex items-center gap-2 hover:bg-gray-800 transition"
                        >
                            Next <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button
                            key="btn-run"
                            type="submit"
                            form="backtestForm"
                            disabled={loading || !canRun}
                            className="px-6 py-2 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? 'Running...' : (!canRun ? 'Limit Reached' : 'Run Backtest')}
                            {!loading && canRun && <Check size={16} />}
                        </button>
                    )}
                </div>
            </div>

            {/* Upgrade Modal */}
            {upgradeModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-60 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-sm w-full p-6 text-center space-y-4 animate-in fade-in zoom-in duration-200">
                        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                            <span className="text-2xl">⚡</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Upgrade Required</h3>
                        <p className="text-gray-600 dark:text-gray-400">{upgradeMessage || "Your current plan limits the number of backtests you can run."}</p>

                        <div className="pt-4 flex flex-col gap-2">
                            <Link href="/subscription" className="w-full py-2.5 bg-black text-white hover:bg-gray-800 rounded-lg font-medium transition text-center">
                                View Plans
                            </Link>
                            <button
                                onClick={() => setUpgradeModalOpen(false)}
                                className="w-full py-2.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg font-medium transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
