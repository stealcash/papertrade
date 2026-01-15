"use client";

import { useEffect, useState } from "react";
import {
    Scan, TrendingUp, TrendingDown, ArrowRight,
    ChevronRight, Calendar, AlertCircle
} from "lucide-react";
import api from "@/lib/api";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useToast } from "@/context/ToastContext";

interface Strategy {
    id: number;
    name: string;
    code: string;
    description: string;
    type: string;
}

interface ScanSignal {
    stock_symbol: string;
    stock_name: string;
    direction: 'UP' | 'DOWN';
    entry_price: number;
    expected_value: number;
}

interface ScanResult {
    date: string | null;
    signals: ScanSignal[];
    count: number;
    message?: string;
}

export default function ScannerPage() {
    const { showToast } = useToast();

    // State
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [isLoadingStrategies, setIsLoadingStrategies] = useState(true);

    const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [isLoadingScan, setIsLoadingScan] = useState(false);

    // Initial Load
    useEffect(() => {
        fetchSystemStrategies();
    }, []);

    const fetchSystemStrategies = async () => {
        try {
            setIsLoadingStrategies(true);
            // Fetch only system strategies (MANUAL or Admin-created)
            const res = await api.get('/strategies/master/?scope=system');
            let data = res.data.data ? res.data.data : res.data;

            if (!Array.isArray(data)) {
                console.warn("API did not return a strategy array:", data);
                // If data.results exists (pagination fallback)
                if (data.results && Array.isArray(data.results)) {
                    data = data.results;
                } else {
                    data = [];
                }
            }

            setStrategies(data);
            if (data.length > 0) {
                // Auto-select first
                handleSelectStrategy(data[0]);
            }
        } catch (error) {
            console.error(error);
            showToast("Failed to load strategies", "error");
        } finally {
            setIsLoadingStrategies(false);
        }
    };

    const handleSelectStrategy = async (strategy: Strategy) => {
        if (selectedStrategy?.id === strategy.id) return;

        setSelectedStrategy(strategy);
        setScanResult(null); // Clear previous
        setIsLoadingScan(true);

        try {
            // Fetch Scan Results
            // Assuming endpoint is strategies/{id}/scan_results/
            // Note: You added this as a detail action to strategy-master viewset
            const res = await api.get(`/strategies/master/${strategy.id}/scan_results/`);
            setScanResult(res.data);
        } catch (error) {
            console.error(error);
            showToast("Failed to fetch scan results", "error");
        } finally {
            setIsLoadingScan(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            {/* Header */}
            <header className="h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => window.location.href = '/dashboard'}
                        className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                        <ArrowRight className="rotate-180" size={16} />
                        Back to Dashboard
                    </button>
                    <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-2"></div>
                    <h1 className="text-lg font-bold flex items-center gap-2">
                        <Scan className="text-blue-600" size={20} />
                        Market Scanner
                    </h1>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">

                {/* Sidebar: Strategy List */}
                <div className="w-1/3 min-w-[300px] border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-y-auto">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Scan size={20} className="text-blue-600" />
                            System Strategies
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            Select a strategy to see latest signals.
                        </p>
                    </div>

                    <div className="p-2 space-y-1">
                        {isLoadingStrategies ? (
                            <div className="flex justify-center py-10">
                                <LoadingSpinner size="sm" />
                            </div>
                        ) : strategies.length === 0 ? (
                            <div className="text-center py-10 text-gray-400">
                                No strategies found.
                            </div>
                        ) : (
                            strategies.map(strat => (
                                <button
                                    key={strat.id}
                                    onClick={() => handleSelectStrategy(strat)}
                                    className={`w-full text-left p-3 rounded-lg transition-all border ${selectedStrategy?.id === strat.id
                                        ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 shadow-sm'
                                        : 'bg-white dark:bg-gray-900 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={`font-semibold ${selectedStrategy?.id === strat.id ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'
                                            }`}>
                                            {strat.name}
                                        </span>
                                        {selectedStrategy?.id === strat.id && <ChevronRight size={16} className="text-blue-500" />}
                                    </div>
                                    {strat.description && (
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{strat.description}</p>
                                    )}
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="text-[10px] font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500">{strat.code}</span>
                                        <span className="text-[10px] uppercase font-bold text-gray-400">{strat.type}</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Area: Results */}
                <div className="flex-1 bg-gray-50 dark:bg-black/20 overflow-y-auto p-6">

                    {!selectedStrategy ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <Scan size={48} className="mb-4 opacity-50" />
                            <p className="text-lg font-medium">Select a strategy from the list</p>
                            <p className="text-sm">Scan results for the latest trading day will appear here.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{selectedStrategy.name}</h1>
                                    <p className="text-gray-500 dark:text-gray-400 max-w-2xl">{selectedStrategy.description}</p>
                                </div>
                            </div>

                            {/* Content */}
                            {isLoadingScan ? (
                                <div className="py-20 flex justify-center">
                                    <LoadingSpinner size="lg" />
                                </div>
                            ) : !scanResult || (scanResult.signals.length === 0) ? (
                                <div className="bg-white dark:bg-gray-900 rounded-xl p-8 text-center border border-gray-200 dark:border-gray-800 shadow-sm">
                                    <AlertCircle size={40} className="mx-auto text-gray-400 mb-3" />
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No Signals Found</h3>
                                    <p className="text-gray-500 mt-2">
                                        {scanResult?.message || "No signals generated for the latest trading session."}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-3 rounded-lg flex items-center gap-3">
                                        <Calendar size={18} className="text-blue-600 dark:text-blue-400" />
                                        <span className="text-sm text-blue-800 dark:text-blue-200">
                                            Result for <strong>{scanResult.date}</strong> (Latest Available)
                                        </span>
                                        <span className="ml-auto text-xs font-semibold bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 px-2 py-1 rounded-full">
                                            {scanResult.count} Signals
                                        </span>
                                    </div>

                                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
                                        <table className="w-full text-left">
                                            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-sm">
                                                <tr>
                                                    <th className="px-6 py-4 font-medium">Stock</th>
                                                    <th className="px-6 py-4 font-medium">Signal</th>
                                                    <th className="px-6 py-4 font-medium text-right">Reference Price</th>
                                                    <th className="px-6 py-4 font-medium text-right">Expected Price</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                                {scanResult.signals.map((sig, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition">
                                                        <td className="px-6 py-4">
                                                            <div>
                                                                <p className="font-bold text-gray-900 dark:text-gray-100">{sig.stock_symbol}</p>
                                                                <p className="text-xs text-gray-500 truncate max-w-[150px]">{sig.stock_name}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${sig.direction === 'UP'
                                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                                }`}>
                                                                {sig.direction === 'UP' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                                {sig.direction}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-mono text-sm text-gray-600 dark:text-gray-400">
                                                            {sig.entry_price ? sig.entry_price.toFixed(2) : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                                {sig.expected_value ? sig.expected_value.toFixed(2) : '-'}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
