'use client';

import { useEffect, useState, useMemo, Fragment } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { backtestAPI } from '@/lib/api';
import { ArrowLeft, Download, Calendar, TrendingUp, TrendingDown, Target, Search } from 'lucide-react';

export default function BacktestDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [run, setRun] = useState<any>(null);
    const [stats, setStats] = useState<any[]>([]);

    useEffect(() => {
        if (id === 'strategies') {
            router.replace('/strategies');
        }
    }, [id, router]);
    // WAIT: Top 5 logic needs ALL trades. If we paginate server side, we can't calculate top 5 client side easily unless we fetch all summary or just keep fetching all for stats but paginate table?
    // User asked to paginate based on backend. 
    // Let's assume Top 5 can be calculated from the full list or maybe we should fetch full list for stats in background?
    // Actually, "list_of_trades_json" is still in the "getRunById" response (unless we defer it). 
    // The current "getRunById" returns the full object including the JSON.
    // So we HAVE the full data. The user specifically asked "it should return based on backend".
    // This implies we should NOT rely on the full blob in getRunById for the table.
    // BUT we might still get it for now.
    // Ideally, we should use the new endpoint for the table.

    const [predictions, setPredictions] = useState<any[]>([]);
    const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total_count: 0 });
    const [loading, setLoading] = useState(true);
    const [tableLoading, setTableLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (id && !isNaN(Number(id))) {
            loadMetadata();
        }
    }, [id]);

    // Re-fetch results when page or search changes
    useEffect(() => {
        if (id && !isNaN(Number(id))) fetchResults();
    }, [id, pagination.page, searchTerm]);

    async function loadMetadata() {
        try {
            const res = await backtestAPI.getRunById(Number(id));
            setRun(res.data.data);
            // Calculate Top 5 from the full data if available, or we need a stats endpoint.
            // For now, let's assume getRunById still returns the big blob and we calculate Top 5 from it,
            // BUT we render the table using the paginated endpoint to satisfy the "backend logic" requirement.
        } catch (err) {
            console.error("Failed to load backtest data", err);
        }
        setLoading(false);
    }

    async function fetchResults() {
        setTableLoading(true);
        try {
            const res = await backtestAPI.getResults(Number(id), {
                page: pagination.page,
                page_size: 10,
                search: searchTerm
            });
            if (res.data.data) {
                setPredictions(res.data.data.results);
                setPagination(prev => ({
                    ...prev,
                    total_pages: res.data.data.pagination.total_pages,
                    total_count: res.data.data.pagination.total_count
                }));
            }
        } catch (err) {
            console.error("Failed to load results", err);
        }
        setTableLoading(false);
    }

    // Top 5 Logic (Computed from the main run object which still has the full list for now)
    const topStocks = useMemo(() => {
        if (!run || !run.list_of_trades_json) return [];
        // Helper to calc stats from full list...
        const stats: Record<string, { wins: number, total: number }> = {};
        run.list_of_trades_json.forEach((trade: any) => {
            const sym = trade.stock_symbol;
            if (!stats[sym]) stats[sym] = { wins: 0, total: 0 };
            stats[sym].total += 1;
            if (trade.result === 'WIN') stats[sym].wins += 1;
        });
        return Object.entries(stats)
            .map(([symbol, data]) => ({
                symbol,
                wins: data.wins,
                total: data.total,
                rate: (data.wins / data.total) * 100
            }))
            .sort((a, b) => b.rate - a.rate || b.wins - a.wins)
            .slice(0, 5);
    }, [run]);

    // Handle Page Change
    const handlePageChange = (newPage: number) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    // Handle Search
    // We need to debounce or just effect hook is fine for now

    if (loading)
        return <div className="flex justify-center items-center h-60 text-gray-600">Loading Report...</div>;

    if (!run)
        return <div className="flex justify-center items-center h-60 text-gray-500">Backtest Not Found</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-10 pb-20">

            {/* ───────── Header ───────── */}
            <div className="flex justify-between items-start">
                <div>
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-600 hover:text-black transition mb-3"
                    >
                        <ArrowLeft size={18} /> Back to List
                    </button>

                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        {run.strategy_details?.name || `Strategy #${run.strategy_predefined}`}
                    </h1>

                    <div className="flex items-center text-sm gap-4 text-gray-500">
                        <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                            <Calendar size={14} /> {run.start_date} → {run.end_date}
                        </span>
                        <span className="bg-gray-100 px-2 py-1 rounded capitalize">Mode: {run.selection_mode}</span>
                    </div>
                </div>

                <div className="text-right">
                    <p className="text-sm text-gray-500 mb-1">Win Rate</p>
                    <div className={`text-5xl font-bold ${Number(run.win_rate) >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                        {run.win_rate}%
                    </div>
                </div>
            </div>


            {/* ───────── High Level Stats ───────── */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card label="Total Predictions" value={run.total_signals} />
                <Card label="Successful Predictions" value={run.win_count} color="text-green-600" />
                <Card label="Failed Predictions" value={run.loss_count} color="text-red-500" />
                <Card
                    label="Criteria"
                    value={run.criteria_type === 'magnitude'
                        ? `Magnitude (${run.magnitude_threshold}%)`
                        : 'Direction Only'}
                    size="text-lg"
                />
            </div>

            {/* ───────── PnL Stats (If Enabled & Trades Executed) ───────── */}
            {Number(run.initial_wallet_amount) > 0 && Number(run.number_of_trades) > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card label="Total Invested" value={`₹${Number(run.initial_wallet_amount).toLocaleString()}`} />
                    <Card label="Final Amount" value={`₹${Number(run.final_wallet_amount || run.initial_wallet_amount).toLocaleString()}`} />
                    <Card label="Total Trades" value={run.number_of_trades} />
                    <Card
                        label="Total PnL"
                        value={
                            <span>
                                {`${Number(run.total_pnl) >= 0 ? '+' : ''}₹${Number(run.total_pnl || 0).toLocaleString()}`}
                                <span className="text-sm ml-2 opacity-80">
                                    ({Number(run.pnl_percentage || 0).toFixed(2)}%)
                                </span>
                            </span>
                        }
                        color={Number(run.total_pnl) >= 0 ? "text-green-600" : "text-red-600"}
                    />
                </div>
            )}


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* ───────── MAIN: Detailed Predictions Table ───────── */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-900">Prediction Details</h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search Stock..."
                                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-48 focus:ring-2 focus:ring-black focus:outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3">Stock</th>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3 text-right">Actual</th>
                                    <th className="px-6 py-3 text-right">Expected</th>
                                    <th className="px-6 py-3 text-center">Result</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {tableLoading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                            Loading Results...
                                        </td>
                                    </tr>
                                ) : predictions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                            No predictions found.
                                        </td>
                                    </tr>
                                ) : (
                                    predictions.map((row: any, i: number) => (
                                        <Fragment key={i}>
                                            {(i === 0 || row.stock_symbol !== predictions[i - 1].stock_symbol) && (
                                                <tr className="bg-gray-100 dark:bg-gray-800">
                                                    <td colSpan={5} className="px-6 py-2 font-bold text-sm text-gray-800 dark:text-gray-200">
                                                        {row.stock_symbol}
                                                    </td>
                                                </tr>
                                            )}
                                            <tr className="hover:bg-gray-50 transition">
                                                <td className="px-6 py-4 font-medium text-gray-900">{row.stock_symbol}</td>
                                                <td className="px-6 py-4 text-gray-500">{row.signal_date}</td>
                                                <td className="px-6 py-4 text-right font-mono">
                                                    <div className={`flex items-center justify-end gap-1 ${row.actual_close > row.prev_close ? 'text-green-600' : row.actual_close < row.prev_close ? 'text-red-600' : 'text-gray-700'}`}>
                                                        <span>₹{row.actual_close}</span>
                                                        {row.actual_close > row.prev_close ? <TrendingUp size={14} /> : row.actual_close < row.prev_close ? <TrendingDown size={14} /> : null}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <span className="font-mono">₹{row.expected_price.toFixed(2)}</span>
                                                        {row.signal === 'UP'
                                                            ? <TrendingUp size={14} className="text-green-500" />
                                                            : <TrendingDown size={14} className="text-red-500" />
                                                        }
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${row.result === 'WIN'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-red-100 text-red-700'
                                                        }`}>
                                                        {row.result === 'WIN' ? '+1' : '0'}
                                                    </span>
                                                </td>
                                            </tr>
                                        </Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>

                        {/* Pagination Controls */}
                        {predictions.length > 0 && (
                            <div className="flex justify-between items-center p-4 border-t border-gray-100">
                                <div className="text-xs text-gray-500">
                                    Page {pagination.page} of {pagination.total_pages} ({pagination.total_count} items)
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
                                        disabled={pagination.page === 1 || tableLoading}
                                        className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 text-xs font-medium"
                                    >
                                        Prev
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(Math.min(pagination.total_pages, pagination.page + 1))}
                                        disabled={pagination.page === pagination.total_pages || tableLoading}
                                        className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 text-xs font-medium"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>


                {/* ───────── RIGHT: Top Performers ───────── */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Target size={20} className="text-orange-500" /> Top Performers
                    </h2>

                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-2 space-y-1">
                        {topStocks.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm">No data available</div>
                        ) : (
                            topStocks.map((stock, i) => (
                                <div key={stock.symbol} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'
                                            }`}>
                                            {i + 1}
                                        </span>
                                        <div>
                                            <div className="font-bold text-gray-900">{stock.symbol}</div>
                                            <div className="text-xs text-gray-500">{stock.wins} wins / {stock.total} total</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-green-600">{stock.rate.toFixed(1)}%</div>
                                        <div className="text-xs text-gray-400">Win Rate</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
                        <p className="font-semibold mb-1">💡 Insight</p>
                        These stocks showed the highest accuracy with your chosen strategy. Consider adding them to your primary watchlist.
                    </div>
                </div>

            </div>
        </div>
    );
}


/* ░░░ Components ░░░ */

function Card({ label, value, color = "text-gray-900", size = "text-3xl" }: { label: string, value: any, color?: string, size?: string }) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <p className="text-sm text-gray-500">{label}</p>
            <p className={`${size} font-bold mt-1 ${color}`}>{value}</p>
        </div>
    );
}
