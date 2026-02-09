'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { strategiesAPI } from '@/lib/api';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function TradesPage() {
    const params = useParams();
    const router = useRouter();
    const strategyId = params.id as string;
    const stockId = params.stockId as string;

    const [signals, setSignals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stockSymbol, setStockSymbol] = useState('');
    const [strategyName, setStrategyName] = useState('');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const itemsPerPage = 20;

    useEffect(() => {
        if (strategyId && stockId) {
            loadData();
        }
    }, [strategyId, stockId, currentPage]);

    async function loadData() {
        setLoading(true);
        try {
            // Fetch strategy details to get name and code
            const stratRes = await strategiesAPI.get(strategyId);
            const strat = stratRes.data.data || stratRes.data;
            setStrategyName(strat.name || strat.code);

            // Fetch signals for this stock+strategy
            const res = await strategiesAPI.getSignals({
                strategy: strat.code,
                stock: stockId,
                page: currentPage,
                page_size: itemsPerPage
            });

            const data = res.data.data || res.data;
            const results = data.results || [];

            setSignals(results);

            // Set stock symbol from first result or fetch separately
            if (results.length > 0 && results[0].stock_symbol) {
                setStockSymbol(results[0].stock_symbol);
            }

            // Calculate total pages if pagination info is available
            if (data.count) {
                setTotalPages(Math.ceil(data.count / itemsPerPage));
            } else {
                setTotalPages(1);
            }
        } catch (e) {
            console.error('Failed to load trades', e);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto py-10 px-4">
            {/* Header */}
            <div className="mb-8">
                <Link
                    href={`/strategies/${strategyId}`}
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft size={18} />
                    Back to Strategy
                </Link>
                <h1 className="text-3xl font-bold">Trade History</h1>
                <p className="text-gray-500 mt-1">
                    {stockSymbol} • {strategyName}
                </p>
            </div>

            {/* Trades Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Direction</th>
                                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Entry</th>
                                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Exit</th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Result</th>
                                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">PnL</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {signals.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                                        No trades found for this stock
                                    </td>
                                </tr>
                            ) : (
                                signals.map((sig, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 text-gray-700">
                                            {sig.date || new Date(sig.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-bold ${sig.signal_direction === 'UP'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-red-100 text-red-700'
                                                    }`}
                                            >
                                                {sig.signal_direction}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-600">
                                            {sig.entry_price ? `₹${Number(sig.entry_price).toFixed(2)}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium">
                                            {sig.exit_price ? `₹${Number(sig.exit_price).toFixed(2)}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {sig.status === 'WIN' && (
                                                <span className="text-green-600 font-bold text-sm">WIN</span>
                                            )}
                                            {sig.status === 'LOSS' && (
                                                <span className="text-red-600 font-bold text-sm">LOSS</span>
                                            )}
                                            {sig.status === 'PENDING' && (
                                                <span className="text-gray-400 text-xs">PENDING</span>
                                            )}
                                        </td>
                                        <td
                                            className={`px-6 py-4 text-right font-mono font-medium ${Number(sig.pnl) > 0
                                                    ? 'text-green-600'
                                                    : Number(sig.pnl) < 0
                                                        ? 'text-red-600'
                                                        : 'text-gray-400'
                                                }`}
                                        >
                                            {sig.pnl ? `${Number(sig.pnl) > 0 ? '+' : ''}${sig.pnl}` : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            Page {currentPage} of {totalPages}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <ChevronLeft size={16} />
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                Next
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
