'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Target } from 'lucide-react';
import apiClient from '@/lib/api';

const optionBacktestAPI = {
    getById: (id: number) => apiClient.get(`/backtest/option-backtest/${id}/`),
    getResults: (id: number, params?: any) => apiClient.get(`/backtest/option-backtest/${id}/results/`, { params }),
};

export default function OptionBacktestDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [run, setRun] = useState<any>(null);
    const [trades, setTrades] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination State
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        if (id && !isNaN(Number(id))) {
            loadInitialData();
        }
    }, [id]);

    async function loadInitialData() {
        try {
            const res = await optionBacktestAPI.getById(Number(id));
            setRun(res.data.data);

            // Load first page of trades
            await fetchTrades(1, true);
        } catch (err) {
            console.error('Failed to load option backtest', err);
        }
        setLoading(false);
    }

    async function fetchTrades(pageNum: number, isInitial: boolean = false) {
        try {
            if (!isInitial) setLoadingMore(true);

            const res = await optionBacktestAPI.getResults(Number(id), { page: pageNum, page_size: 10 });
            const newTrades = res.data.data.results || [];
            const pagination = res.data.data.pagination;

            if (isInitial) {
                setTrades(newTrades);
            } else {
                setTrades(prev => [...prev, ...newTrades]);
            }

            setHasMore(pagination.current_page < pagination.total_pages);
            setPage(pageNum);
        } catch (err) {
            console.error('Failed to fetch trades', err);
        } finally {
            if (!isInitial) setLoadingMore(false);
        }
    }

    const handleLoadMore = () => {
        if (!loadingMore && hasMore) {
            fetchTrades(page + 1);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-60 text-gray-600">Loading...</div>;
    if (!run) return <div className="flex justify-center items-center h-60 text-gray-500">Backtest Not Found</div>;

    // Calculate Points (Fallback to summary if available)
    let totalBuyPoints = Number(run.results_summary_json?.total_buy_points || 0);
    let totalSellPoints = Number(run.results_summary_json?.total_sell_points || 0);

    if (!run.results_summary_json?.total_buy_points && !run.results_summary_json?.total_sell_points) {
        trades.forEach(trade => {
            trade.legs_json.forEach((leg: any) => {
                const entryVal = Number(leg.entry || 0);
                const exitVal = Number(leg.exit || 0);
                if (leg.action === 'BUY') {
                    totalBuyPoints += entryVal;
                    totalSellPoints += exitVal;
                } else {
                    totalSellPoints += entryVal;
                    totalBuyPoints += exitVal;
                }
            });
        });
    }

    return (
        <div className="max-w-7xl mx-auto space-y-10 pb-20 px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex justify-between items-start pt-8">
                <div>
                    <div className="flex items-center gap-4 mb-3">
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-2 text-gray-600 hover:text-black transition"
                        >
                            <ArrowLeft size={18} /> Back to List
                        </button>
                        <button
                            onClick={() => router.push(`/option-backtest/${id}/applied-strategy`)}
                            className="flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition text-sm font-bold border border-blue-100 shadow-sm"
                        >
                            <Target size={16} /> Applied Strategy
                        </button>
                    </div>

                    <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">
                        {run.snapshot_name || run.strategy_name}
                    </h1>

                    <div className="flex items-center text-sm gap-4 text-gray-500 mt-4">
                        <span className="flex items-center gap-1 bg-purple-50 px-2.5 py-1 rounded-full text-purple-700 font-bold border border-purple-100 uppercase text-[10px] tracking-wider">
                            {run.underlying_symbol}
                        </span>
                        <span className="flex items-center gap-1 bg-gray-50 px-2.5 py-1 rounded-full font-bold border border-gray-100 text-[10px] tracking-wider">
                            LOT: {run.lot_size}
                        </span>
                        <span className="flex items-center gap-1 bg-gray-50 px-2.5 py-1 rounded-full font-bold border border-gray-100 text-[10px] tracking-wider">
                            <Calendar size={12} /> {run.start_date} → {run.end_date}
                        </span>
                    </div>
                </div>

                <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Performance</p>
                    <div className={`text-6xl font-black ${Number(run.win_rate) >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                        {run.win_rate}%
                    </div>
                    <p className="text-xs font-bold text-gray-400 mt-1">Win Rate</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6">
                <Card label="Total Trades" value={run.total_trades} />
                <Card label="Winning Trades" value={run.win_count} color="text-green-600" />
                <Card label="Losing Trades" value={run.loss_count} color="text-red-500" />
                <Card
                    label="Total PnL"
                    value={`₹${Math.round(Number(run.total_pnl)).toLocaleString()}`}
                    color={Number(run.total_pnl) >= 0 ? "text-green-600" : "text-red-600"}
                />
                <Card
                    label="Buy Points"
                    value={totalBuyPoints.toFixed(1)}
                    color={totalBuyPoints >= 0 ? "text-blue-600" : "text-red-600"}
                />
                <Card
                    label="Sell Points"
                    value={totalSellPoints.toFixed(1)}
                    color={totalSellPoints >= 0 ? "text-orange-600" : "text-red-600"}
                />
            </div>

            {/* Trades Table */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 tracking-tight">Trade Details</h2>
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden border-b-4 border-gray-100">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50/50 border-b border-gray-200 text-gray-400 font-black uppercase text-[10px] tracking-widest">
                            <tr>
                                <th className="px-8 py-5 text-left">Entry - Exit</th>
                                <th className="px-6 py-5 text-left">Expiry</th>
                                <th className="px-6 py-5 text-left">Slot</th>
                                <th className="px-6 py-5 text-left">Legs Breakdown</th>
                                <th className="px-8 py-5 text-right">Total PnL</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {trades.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center text-gray-400 font-bold italic">
                                        No trades recorded for this backtest window
                                    </td>
                                </tr>
                            ) : (
                                trades.map((trade, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="font-mono text-xs text-gray-500 font-bold">
                                                {trade.entry_date} <span className="text-gray-300 mx-1">→</span> {trade.exit_date}
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <span className="text-[10px] font-black bg-gray-100 text-gray-600 px-2 py-1 rounded-lg border border-gray-200 uppercase">{trade.expiry_date}</span>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="space-y-1.5">
                                                {trade.legs_json.map((leg: any, legIdx: number) => (
                                                    <div key={legIdx} className="text-xs font-mono font-bold text-gray-400">
                                                        {run.lot_size}{leg.lot_multiplier > 1 && (
                                                            <span className="ml-1 text-[9px] text-white font-black bg-blue-500 px-1.5 py-0.5 rounded-md shadow-sm">
                                                                ×{leg.lot_multiplier}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="space-y-2">
                                                {trade.legs_json.map((leg: any, legIdx: number) => (
                                                    <div key={legIdx} className="flex items-center gap-2.5 text-[11px] group">
                                                        <span className={`font-black px-2 py-0.5 rounded-lg shadow-sm ${leg.action === 'BUY' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                                            {leg.action}
                                                        </span>
                                                        <span className="font-black text-gray-700 tracking-tight">{leg.strike} {leg.type}</span>
                                                        <span className="text-gray-300 font-bold">@</span>
                                                        <span className="font-mono text-gray-500">₹{leg.entry?.toFixed(1)}</span>
                                                        <ArrowLeft size={10} className="text-gray-300 rotate-180" />
                                                        <span className="font-mono text-gray-500">₹{leg.exit?.toFixed(1)}</span>
                                                        <span className={`ml-3 font-mono font-black ${leg.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {leg.pnl >= 0 ? '+' : ''}₹{Math.round(leg.pnl).toLocaleString()}
                                                        </span>
                                                        <span className="text-[9px] text-gray-400 font-bold uppercase bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100 ml-2">
                                                            {(leg.reason || '').replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className={`text-lg font-black tracking-tight ${trade.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {trade.total_pnl >= 0 ? '+' : ''}₹{Math.round(Number(trade.total_pnl)).toLocaleString()}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Show More Button */}
                    {hasMore && (
                        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-center">
                            <button
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                                className="px-6 py-2.5 bg-white border border-gray-200 shadow-sm rounded-xl text-sm font-bold text-gray-600 hover:text-black hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loadingMore ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                                        Loading...
                                    </>
                                ) : (
                                    <>
                                        Show More Trades
                                        <span className="text-xs text-gray-400 font-normal ml-1">
                                            (Page {page + 1})
                                        </span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Card({ label, value, color = "text-gray-900", size = "text-4xl" }: { label: string; value: any; color?: string; size?: string }) {
    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{label}</p>
            <p className={`${size} font-black tracking-tight ${color}`}>{value}</p>
        </div>
    );
}
