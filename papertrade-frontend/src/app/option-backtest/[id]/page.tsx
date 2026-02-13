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

    useEffect(() => {
        if (id && !isNaN(Number(id))) {
            loadData();
        }
    }, [id]);

    async function loadData() {
        try {
            const res = await optionBacktestAPI.getById(Number(id));
            setRun(res.data.data);

            // Load trades
            const tradesRes = await optionBacktestAPI.getResults(Number(id));
            setTrades(tradesRes.data.data.results || []);
        } catch (err) {
            console.error('Failed to load option backtest', err);
        }
        setLoading(false);
    }

    if (loading) return <div className="flex justify-center items-center h-60 text-gray-600">Loading...</div>;
    if (!run) return <div className="flex justify-center items-center h-60 text-gray-500">Backtest Not Found</div>;

    // Calculate Points (Fallback to summary if available)
    let totalBuyPoints = Number(run.results_summary_json?.total_buy_points || 0);
    let totalSellPoints = Number(run.results_summary_json?.total_sell_points || 0);

    if (!run.results_summary_json?.total_buy_points && !run.results_summary_json?.total_sell_points) {
        trades.forEach(trade => {
            trade.legs_json.forEach((leg: any) => {
                const entry = Number(leg.entry || 0);
                const exit = Number(leg.exit || 0);
                if (leg.action === 'BUY') {
                    totalBuyPoints += entry;
                    totalSellPoints += exit;
                } else {
                    totalSellPoints += entry;
                    totalBuyPoints += exit;
                }
            });
        });
    }

    return (
        <div className="max-w-7xl mx-auto space-y-10 pb-20">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-600 hover:text-black transition mb-3"
                    >
                        <ArrowLeft size={18} /> Back to List
                    </button>

                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        {run.snapshot_name || run.strategy_name}
                    </h1>
                    {run.snapshot_name && run.snapshot_name !== run.strategy_name && (
                        <p className="text-sm text-gray-500 italic mb-2">
                            Original strategy: {run.strategy_name}
                        </p>
                    )}

                    <div className="flex items-center text-sm gap-4 text-gray-500">
                        <span className="flex items-center gap-1 bg-purple-100 px-2 py-1 rounded text-purple-700 font-mono">
                            {run.underlying_symbol}
                        </span>
                        <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded font-mono">
                            Lot: {run.lot_size}
                        </span>
                        <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                            <Calendar size={14} /> {run.start_date} → {run.end_date}
                        </span>
                    </div>
                </div>

                <div className="text-right">
                    <p className="text-sm text-gray-500 mb-1">Win Rate</p>
                    <div className={`text-5xl font-bold ${Number(run.win_rate) >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                        {run.win_rate}%
                    </div>
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
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Trade Details</h2>
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold">
                            <tr>
                                <th className="px-6 py-3 text-left">Entry - Exit</th>
                                <th className="px-6 py-3 text-left">Expiry</th>
                                <th className="px-6 py-3 text-left">Slot</th>
                                <th className="px-6 py-3 text-left">Legs</th>
                                <th className="px-6 py-3 text-right">Total PnL</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {trades.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                                        No trades found
                                    </td>
                                </tr>
                            ) : (
                                trades.map((trade, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4">
                                            <div className="font-mono text-xs text-gray-500">
                                                {trade.entry_date} → {trade.exit_date}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">{trade.expiry_date}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                {trade.legs_json.map((leg: any, legIdx: number) => (
                                                    <div key={legIdx} className="text-xs font-mono">
                                                        {run.lot_size}{leg.lot_multiplier > 1 && (
                                                            <span className="ml-1 text-[10px] text-purple-600 font-bold bg-purple-50 px-1 rounded border border-purple-100">
                                                                x{leg.lot_multiplier}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                {trade.legs_json.map((leg: any, legIdx: number) => (
                                                    <div key={legIdx} className="flex items-center gap-2 text-xs">
                                                        <span className={`font-bold px-1.5 rounded ${leg.action === 'BUY' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                                            {leg.action}
                                                        </span>
                                                        <span className="font-mono">{leg.strike} {leg.type}</span>
                                                        <span className="text-gray-400">@</span>
                                                        <span className="font-mono">₹{leg.entry?.toFixed(1)}</span>
                                                        <span className="text-gray-400">→</span>
                                                        <span className="font-mono">₹{leg.exit?.toFixed(1)}</span>
                                                        <span className={`ml-auto font-mono ${leg.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {leg.pnl >= 0 ? '+' : ''}₹{Math.round(leg.pnl)}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 capitalize bg-gray-50 px-1 rounded">
                                                            {(leg.reason || '').replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className={`font-bold ${trade.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {trade.total_pnl >= 0 ? '+' : ''}₹{Math.round(Number(trade.total_pnl)).toLocaleString()}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function Card({ label, value, color = "text-gray-900", size = "text-3xl" }: { label: string; value: any; color?: string; size?: string }) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <p className="text-sm text-gray-500">{label}</p>
            <p className={`${size} font-bold mt-1 ${color}`}>{value}</p>
        </div>
    );
}
