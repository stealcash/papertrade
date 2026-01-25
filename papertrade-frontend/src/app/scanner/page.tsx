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
            const res = await api.get('/strategies/master/?scope=system');
            let data = res.data.data ? res.data.data : res.data;

            if (!Array.isArray(data)) {
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
        setScanResult(null);
        setIsLoadingScan(true);

        try {
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
        <div className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
            <main className="p-4 lg:p-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
                        <Scan className="text-blue-600" size={28} />
                        Market Scanner
                    </h1>

                    {/* Strategy Selector & Info */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Select Strategy
                        </label>

                        {isLoadingStrategies ? (
                            <LoadingSpinner size="sm" />
                        ) : (
                            <div className="relative">
                                <select
                                    className="w-full md:w-1/2 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg appearance-none text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={selectedStrategy?.id || ''}
                                    onChange={(e) => {
                                        const strat = strategies.find(s => s.id === Number(e.target.value));
                                        if (strat) handleSelectStrategy(strat);
                                    }}
                                >
                                    {strategies.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-1/2 flex items-center px-2 pointer-events-none text-gray-500">
                                    <ChevronRight className="rotate-90" size={16} />
                                </div>
                            </div>
                        )}

                        {selectedStrategy && (
                            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {selectedStrategy.description}
                                </p>
                                <div className="flex gap-2 mt-2">
                                    <span className="px-2 py-0.5 text-xs font-mono bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                                        {selectedStrategy.type}
                                    </span>
                                    <span className="px-2 py-0.5 text-xs font-mono bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                                        {selectedStrategy.code}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Results */}
                    <div className="space-y-4">
                        {isLoadingScan ? (
                            <div className="py-20 flex justify-center">
                                <LoadingSpinner size="lg" />
                            </div>
                        ) : !scanResult || (scanResult.signals.length === 0) ? (
                            <div className="bg-white dark:bg-gray-900 rounded-xl p-10 text-center border border-dashed border-gray-300 dark:border-gray-700">
                                <AlertCircle size={40} className="mx-auto text-gray-400 mb-3" />
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No Signals Found</h3>
                                <p className="text-gray-500 mt-2">
                                    {scanResult?.message || "No signals generated for the latest trading session."}
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-bold">Scan Results</h2>
                                    <div className="text-right">
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <Calendar size={14} />
                                            <span>{scanResult.date}</span>
                                        </div>
                                    </div>
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
                                                    <td className="px-6 py-4 text-right text-gray-900 dark:text-gray-100 font-mono text-sm font-semibold">
                                                        {sig.expected_value ? sig.expected_value.toFixed(2) : '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
