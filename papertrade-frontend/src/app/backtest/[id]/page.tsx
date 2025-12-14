'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { backtestAPI } from '@/lib/api';
import { ArrowLeft, Download, Calendar } from 'lucide-react';

export default function BacktestDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [run, setRun] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        load();
    }, [id]);

    async function load() {
        try {
            const res = await backtestAPI.getRunById(Number(id));
            setRun(res.data.data);
        } catch (err) {
            console.error("Failed to load backtest data", err);
            setRun(null);
        }
        setLoading(false);
    }

    if (loading)
        return <div className="flex justify-center items-center h-60 text-gray-600">Loading...</div>;

    if (!run)
        return <div className="flex justify-center items-center h-60 text-gray-500">Backtest Not Found</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-10">

            {/* ───────── Header ───────── */}
            <div className="flex justify-between items-start">

                <div>
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-600 hover:text-black transition mb-3"
                    >
                        <ArrowLeft size={18} />
                        Back to Backtest List
                    </button>

                    <h1 className="text-4xl font-bold text-gray-900 mb-2">{run.strategy_name}</h1>

                    <div className="flex items-center text-sm gap-2 text-gray-500">
                        <Calendar size={14} />
                        {new Date(run.created_at).toLocaleDateString()}
                    </div>
                </div>

                <button
                    onClick={() => alert("Export will work when API connected")}
                    className="px-5 py-2.5 bg-black text-white rounded-md font-medium hover:bg-gray-800 transition flex gap-2 items-center"
                >
                    <Download size={18} />
                    Export CSV
                </button>
            </div>


            {/* ───────── Stats — 4-Card Row ───────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                <Card label="Total Return" value={`${run.total_return}%`} color={run.total_return > 0 ? "text-green-600" : "text-red-500"} />
                <Card label="Sharpe Ratio" value={run.sharpe_ratio} />
                <Card label="Max Drawdown" value={`${run.max_drawdown}%`} color="text-red-500" />
                <Card label="Win Rate" value={`${run.win_rate}%`} />

            </div>


            {/* ───────── TRADE STATISTICS ───────── */}
            <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm space-y-6">

                <h2 className="text-xl font-semibold text-gray-900 mb-2">Trade Breakdown</h2>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">

                    <Tile name="Total Trades" val={run.total_trades} />
                    <Tile name="Winning Trades" val={run.winning_trades} />
                    <Tile name="Losing Trades" val={run.losing_trades} fade />
                    <Tile name="Avg Profit" val={`₹${run.avg_profit}`} />
                    <Tile name="Avg Loss" val={`₹${Math.abs(run.avg_loss)}`} fade />
                    <Tile name="Largest Win" val={`₹${run.largest_win}`} />

                </div>
            </div>


            {/* ───────── EQUITY CURVE (Chart) ───────── */}
            <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">

                <h2 className="text-xl font-semibold text-gray-900 mb-4">Equity Curve</h2>

                <div className="h-64 border border-gray-100 rounded-lg flex justify-center items-center text-gray-400">
                    Chart will show here
                </div>

            </div>
        </div>
    );
}



/* ░░░ UI Small Components ░░░ */

function Card({ label, value, color = "text-gray-900" }: { label: string, value: any, color?: string }) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <p className="text-sm text-gray-500">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
    );
}

function Tile({ name, val, fade = false }: { name: string, val: any, fade?: boolean }) {
    return (
        <div>
            <p className="text-sm text-gray-500">{name}</p>
            <p className={`text-2xl font-semibold ${fade ? "text-gray-500" : "text-gray-900"}`}>{val}</p>
        </div>
    );
}
