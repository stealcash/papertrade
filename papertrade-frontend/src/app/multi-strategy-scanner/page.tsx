"use client";

import { useEffect, useState } from "react";
import {
    Scan, TrendingUp, TrendingDown, ArrowRight,
    Search, Check, X, AlertCircle, Lock, Clock
} from "lucide-react";
import api, { subscriptionsAPI } from "@/lib/api";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useToast } from "@/context/ToastContext";
import Link from 'next/link';
import PredictionModal from '@/components/predictions/PredictionModal';

interface Strategy {
    id: number;
    name: string;
    code: string;
    description: string;
    type: string; // 'SYSTEM' or 'USER'
}

interface Sector {
    id: number;
    name: string;
    symbol: string;
}

interface Category {
    id: number;
    name: string;
}

interface ScanSignal {
    stock_id: number;
    stock_symbol: string;
    stock_name: string;
    direction: 'UP' | 'DOWN';
    entry_price: number;
    expected_value: number;
    latest_price?: number;
    latest_date?: string;
}

interface ScanResult {
    date: string | null;
    signals: ScanSignal[];
    count: number;
}

interface HistoryItem {
    id: number;
    strategies: { id: number; name: string }[];
    filters: {
        date: string;
        requested_date?: string;
        direction: 'UP' | 'DOWN';
        sector_id?: string;
        category_id?: string;
    };
    results: ScanSignal[];
    created_at: string;
}

export default function StockFinderPage() {
    const { showToast } = useToast();

    // -- State --
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [isLoadingStrategies, setIsLoadingStrategies] = useState(true);

    const [selectedStrategies, setSelectedStrategies] = useState<Strategy[]>([]);
    const [signalDirection, setSignalDirection] = useState<'UP' | 'DOWN'>('UP');
    const [selectedDate, setSelectedDate] = useState<string>(''); // Day 0

    // Metadata State
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedSector, setSelectedSector] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');

    const [isScanning, setIsScanning] = useState(false);
    const [scanResults, setScanResults] = useState<ScanSignal[] | null>(null);
    const [scanDate, setScanDate] = useState<string | null>(null);

    // History State
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);

    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [upgradeMessage, setUpgradeMessage] = useState("");

    const [isPlanChecking, setIsPlanChecking] = useState(true);
    const [isPlanAllowed, setIsPlanAllowed] = useState(false);

    // Prediction Modal State
    const [isPredictionModalOpen, setIsPredictionModalOpen] = useState(false);
    const [selectedStockForPrediction, setSelectedStockForPrediction] = useState<any>(null);
    const [predictionDescription, setPredictionDescription] = useState("");

    // -- Init --
    useEffect(() => {
        checkPlanAndInit();
        fetchMetadata();
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            setIsHistoryLoading(true);
            const res = await api.get('/strategies/stock-finder/');
            const data = res.data.data || res.data;
            setHistory(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch history", error);
        } finally {
            setIsHistoryLoading(false);
        }
    };

    const fetchMetadata = async () => {
        try {
            const [sectorRes, catRes] = await Promise.all([
                api.get('/sectors/'),
                api.get('/stocks/categories/')
            ]);

            let sData = sectorRes.data.data || sectorRes.data;
            if (sData.results) sData = sData.results;
            setSectors(Array.isArray(sData) ? sData : []);

            let cData = catRes.data.data || catRes.data;
            if (cData.results) cData = cData.results;
            setCategories(Array.isArray(cData) ? cData : []);

        } catch (error) {
            console.error("Failed to load metadata", error);
        }
    };

    const checkPlanAndInit = async () => {
        try {
            const subRes = await subscriptionsAPI.getCurrent();
            const plan = subRes.data?.data?.plan;
            const featureConfig = plan?.features?.['STOCK_FINDER_SCAN'];
            const allowed = featureConfig?.enabled === true;
            setIsPlanAllowed(allowed);
            if (allowed) {
                await fetchAllStrategies();
            }
        } catch (error) {
            console.error("Plan check failed", error);
            setIsPlanAllowed(false);
        } finally {
            setIsPlanChecking(false);
        }
    };

    const fetchAllStrategies = async () => {
        try {
            setIsLoadingStrategies(true);
            const sysRes = await api.get('/strategies/master/?scope=system');
            let sysData = sysRes.data.data ? sysRes.data.data : sysRes.data;
            if (sysData.results && Array.isArray(sysData.results)) sysData = sysData.results;
            if (!Array.isArray(sysData)) sysData = [];

            const userRes = await api.get('/strategies/rule-based/');
            let userData = userRes.data.data ? userRes.data.data : userRes.data;
            if (userData.results && Array.isArray(userData.results)) userData = userData.results;
            if (!Array.isArray(userData)) userData = [];

            const combined = [
                ...sysData.map((s: any) => ({ ...s, type: 'SYSTEM' })),
                ...userData.map((s: any) => ({ ...s, type: 'USER' }))
            ];
            setStrategies(combined);
        } catch (error) {
            console.error("Failed to load strategies", error);
            showToast("Failed to load strategies", "error");
        } finally {
            setIsLoadingStrategies(false);
        }
    };

    const toggleStrategy = (strategy: Strategy) => {
        if (selectedStrategies.find(s => s.id === strategy.id)) {
            setSelectedStrategies(prev => prev.filter(s => s.id !== strategy.id));
        } else {
            if (selectedStrategies.length >= 3) {
                showToast("You can select up to 3 strategies only", "error");
                return;
            }
            setSelectedStrategies(prev => [...prev, strategy]);
        }
    };

    const handleScan = async () => {
        if (selectedStrategies.length === 0) {
            showToast("Please select at least one strategy", "error");
            return;
        }
        setIsScanning(true);
        setScanResults(null);
        setSelectedHistoryId(null);
        try {
            const payload = {
                strategies: selectedStrategies.map(s => ({ id: s.id, type: s.type })),
                direction: signalDirection,
                date: selectedDate,
                sector: selectedSector,
                category: selectedCategory
            };
            const res = await api.post('/strategies/stock-finder/scan/', payload);
            const data = res.data.data || res.data;
            setScanDate(data.date);
            setScanResults(data.results);
            setSelectedHistoryId(data.history_id);
            showToast(`Scan complete. Found ${data.count} matches.`, "success");
            fetchHistory();
        } catch (error: any) {
            console.error(error);
            const resData = error.response?.data;
            const code = resData?.code || resData?.details?.code || resData?.detail?.code;
            const msg = resData?.details?.message || resData?.detail?.message || resData?.message || "An error occurred";
            if (code === 'PLAN_LIMIT_REACHED' || (resData?.code === 'PERMISSION_DENIED' && msg.includes('limit'))) {
                setUpgradeMessage(msg);
                setIsUpgradeModalOpen(true);
            } else {
                showToast(msg, "error");
            }
        } finally {
            setIsScanning(false);
        }
    };

    const loadHistory = (item: HistoryItem) => {
        setScanResults(item.results);
        setScanDate(item.filters.date);
        setSignalDirection(item.filters.direction);
        setSelectedHistoryId(item.id);
        const activeStrats = strategies.filter(s => item.strategies.some(his => his.id === s.id));
        setSelectedStrategies(activeStrats);
        showToast("Loaded results from history", "success");
    };

    const handleAddPrediction = (sig: ScanSignal) => {
        setSelectedStockForPrediction({
            id: sig.stock_id,
            symbol: sig.stock_symbol,
            name: sig.stock_name
        });
        const stratNames = selectedStrategies.map(s => s.name).join(', ');
        setPredictionDescription(stratNames);
        setIsPredictionModalOpen(true);
    };

    if (isPlanChecking) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <LoadingSpinner size="lg" text="Checking your plan..." />
            </div>
        )
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
            <main className="p-4 lg:p-8">
                {!isPlanAllowed ? (
                    <div className="max-w-xl mx-auto mt-20 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-8 text-center">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Lock size={32} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <h2 className="text-2xl font-bold mb-3">Upgrade to Multi Strategy Scanner</h2>
                        <p className="text-gray-500 mb-8 dark:text-gray-400">
                            This advanced scanning feature is only available in our Pro plans. Find the best trading opportunities by scanning multiple strategies at once.
                        </p>
                        <Link
                            href="/subscription"
                            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-transform active:scale-95"
                        >
                            View Upgrade Options
                        </Link>
                    </div>
                ) : (
                    <div className="max-w-7xl mx-auto space-y-6">
                        <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
                            <Search className="text-blue-600" size={28} />
                            Multi Strategy Scanner
                        </h1>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Main Container: Controls & Results */}
                            <div className="lg:col-span-9 space-y-6">
                                {/* Controls Section */}
                                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                                    <h2 className="text-lg font-semibold mb-4">Scan Configuration</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Strategy Selector */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Select Strategies (Max 3)
                                            </label>
                                            {isLoadingStrategies ? (
                                                <div className="py-4"><LoadingSpinner size="sm" /></div>
                                            ) : (
                                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-60 overflow-y-auto p-2 space-y-1">
                                                    {strategies.map(strat => {
                                                        const isSelected = !!selectedStrategies.find(s => s.id === strat.id);
                                                        return (
                                                            <button
                                                                key={`${strat.type}-${strat.id}`}
                                                                onClick={() => toggleStrategy(strat)}
                                                                className={`w-full flex items-center justify-between p-2 rounded-md text-sm transition-colors ${isSelected
                                                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                                                                    }`}
                                                            >
                                                                <span className="truncate">{strat.name}</span>
                                                                {isSelected && <Check size={16} className="text-blue-600" />}
                                                            </button>
                                                        )
                                                    })}
                                                    {strategies.length === 0 && <p className="text-center text-gray-400 text-sm py-2">No strategies available</p>}
                                                </div>
                                            )}
                                            <p className="text-xs text-gray-500 mt-1">{selectedStrategies.length}/3 selected</p>
                                        </div>

                                        {/* Signal Date & Action */}
                                        <div className="flex flex-col gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Signal Date (Day 0)</label>
                                                <input
                                                    type="date"
                                                    className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                    value={selectedDate}
                                                    onChange={(e) => setSelectedDate(e.target.value)}
                                                    max={new Date().toISOString().split('T')[0]}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sector</label>
                                                    <select
                                                        className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                        value={selectedSector}
                                                        onChange={(e) => setSelectedSector(e.target.value)}
                                                    >
                                                        <option value="">All Sectors</option>
                                                        {sectors.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                                                    <select
                                                        className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                        value={selectedCategory}
                                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                                    >
                                                        <option value="">All Categories</option>
                                                        {categories.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Signal Direction</label>
                                                <div className="flex gap-4">
                                                    <button onClick={() => setSignalDirection('UP')} className={`flex-1 py-1.5 px-4 rounded-lg flex items-center justify-center gap-2 border font-medium ${signalDirection === 'UP' ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20' : 'bg-white dark:bg-gray-800'}`}><TrendingUp size={16} /> Buy</button>
                                                    <button onClick={() => setSignalDirection('DOWN')} className={`flex-1 py-1.5 px-4 rounded-lg flex items-center justify-center gap-2 border font-medium ${signalDirection === 'DOWN' ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20' : 'bg-white dark:bg-gray-800'}`}><TrendingDown size={16} /> Sell</button>
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleScan}
                                                disabled={isScanning || selectedStrategies.length === 0}
                                                className={`w-full py-3 rounded-lg font-bold text-white shadow-sm flex items-center justify-center gap-2 ${isScanning || selectedStrategies.length === 0 ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                                            >
                                                {isScanning ? <LoadingSpinner size="sm" /> : <Scan size={20} />} {isScanning ? 'Scanning...' : 'Find Stocks'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Results Table */}
                                {scanResults && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-xl font-bold">Scan Results</h2>
                                            <span className="text-sm text-gray-500">Signal Date: <span className="font-semibold text-gray-900 dark:text-white">{scanDate}</span></span>
                                        </div>
                                        {scanResults.length === 0 ? (
                                            <div className="bg-white dark:bg-gray-900 rounded-xl p-10 text-center border border-dashed border-gray-300">
                                                <p className="text-gray-500">No matching stocks found.</p>
                                            </div>
                                        ) : (
                                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
                                                <table className="w-full text-left">
                                                    <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 text-sm">
                                                        <tr>
                                                            <th className="px-6 py-4 font-medium">Stock</th>
                                                            <th className="px-6 py-4 font-medium">Signal</th>
                                                            <th className="px-6 py-4 font-medium text-right">Day 0 Price</th>
                                                            <th className="px-6 py-4 font-medium text-right">Latest Price</th>
                                                            <th className="px-6 py-4 font-medium text-right">Expected</th>
                                                            <th className="px-6 py-4 font-medium text-right">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                                        {scanResults.map((sig, idx) => (
                                                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition">
                                                                <td className="px-6 py-4"><p className="font-bold">{sig.stock_symbol}</p><p className="text-xs text-gray-500">{sig.stock_name}</p></td>
                                                                <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${sig.direction === 'UP' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{sig.direction}</span></td>
                                                                <td className="px-6 py-4 text-right font-mono text-sm">{sig.entry_price?.toFixed(2) || '-'}</td>
                                                                <td className="px-6 py-4 text-right"><p className="font-mono text-sm font-bold">{sig.latest_price?.toFixed(2) || '-'}</p><p className="text-[10px] text-gray-400">{sig.latest_date}</p></td>
                                                                <td className="px-6 py-4 text-right font-mono text-sm font-semibold">{sig.expected_value?.toFixed(2) || '-'}</td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <button
                                                                        onClick={() => handleAddPrediction(sig)}
                                                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors border border-blue-100"
                                                                    >
                                                                        <TrendingUp size={14} />
                                                                        Track
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Right Sidebar: History */}
                            <div className="lg:col-span-3 space-y-4">
                                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col h-fit sticky top-4">
                                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                                        <Clock size={18} className="text-blue-500" />
                                        <h3 className="font-bold">Recent Scans</h3>
                                    </div>
                                    <div className="flex-1 overflow-y-auto max-h-[500px] p-2 space-y-2">
                                        {isHistoryLoading ? (
                                            <div className="py-10 flex justify-center"><LoadingSpinner size="sm" /></div>
                                        ) : history.length === 0 ? (
                                            <p className="py-6 text-center text-gray-400 text-xs text-gray-400">No recent scans</p>
                                        ) : (
                                            history.map((item) => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => loadHistory(item)}
                                                    className={`w-full text-left p-3 rounded-lg border transition-all ${selectedHistoryId === item.id ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800 border-transparent hover:border-gray-100'}`}
                                                >
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-[10px] font-mono font-bold text-blue-600">{item.filters.date}</span>
                                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${item.filters.direction === 'UP' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{item.filters.direction}</span>
                                                    </div>
                                                    <p className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-1">{item.strategies.map(s => s.name).join(', ')}</p>
                                                    <div className="mt-2 flex items-center justify-between text-[9px] text-gray-400">
                                                        <span>{item.results.length} stocks found</span>
                                                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Upgrade Modal */}
            {isUpgradeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
                        <Lock size={40} className="mx-auto text-blue-600 mb-4" />
                        <h3 className="text-lg font-bold mb-2">Plan Limit Reached</h3>
                        <p className="text-sm text-gray-500 mb-6">{upgradeMessage}</p>
                        <Link href="/subscription" className="block w-full py-2 bg-blue-600 text-white rounded-lg font-bold mb-2">Upgrade Now</Link>
                        <button onClick={() => setIsUpgradeModalOpen(false)} className="block w-full py-2 text-gray-400 text-sm">Cancel</button>
                    </div>
                </div>
            )}

            <PredictionModal
                isOpen={isPredictionModalOpen}
                onClose={() => setIsPredictionModalOpen(false)}
                stock={selectedStockForPrediction}
                initialDescription={predictionDescription}
            />
        </div>
    );
}
