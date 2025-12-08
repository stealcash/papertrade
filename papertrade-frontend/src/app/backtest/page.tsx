'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { backtestAPI } from '@/lib/api';
import { PlayCircle, Download, Calendar } from 'lucide-react';

// Mock Data Fallback
const MOCK_RUNS = [
    {
        id: 1,
        strategy_name: 'Moving Average Crossover',
        created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
        total_return: 12.5,
        sharpe_ratio: 1.8,
        max_drawdown: -8.3,
        win_rate: 62.5,
    },
    {
        id: 2,
        strategy_name: 'RSI Mean Reversion',
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        total_return: 8.2,
        sharpe_ratio: 1.4,
        max_drawdown: -6.1,
        win_rate: 58.3,
    },
    {
        id: 3,
        strategy_name: 'Breakout Strategy',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        total_return: -3.5,
        sharpe_ratio: 0.6,
        max_drawdown: -12.7,
        win_rate: 45.0,
    },
];

export default function BacktestPage() {
    const [runs, setRuns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRuns();
    }, []);

    const fetchRuns = async () => {
        try {
            const res = await backtestAPI.getRuns();
            setRuns(res.data.data || []);
        } catch {
            console.log("API Offline → Using Mock");
            setRuns(MOCK_RUNS);
        } finally {
            setLoading(false);
        }
    };

    const exportCSV = async (id:number) => {
        alert("CSV export will work when backend is connected.");
    };

    if (loading) return <div className="flex justify-center items-center h-60 text-gray-500">Loading backtests...</div>;

    return (
        <div className="space-y-10">

            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-bold text-gray-900">Backtest Runs</h1>
                
                <button className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition">
                    <PlayCircle size={20}/> New Backtest
                </button>
            </div>

            {/* List Section */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-3">
                {runs.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 text-lg">No runs yet — Create your first backtest!</div>
                ) : (
                    <div className="divide-y">
                        {runs.map(run => (
                            <Link key={run.id} href={`/backtest/${run.id}`} className="block hover:bg-gray-50 p-6 transition">
                                
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h2 className="font-semibold text-lg text-gray-900">
                                            {run.strategy_name || "Unnamed Strategy"}
                                        </h2>
                                        <div className="flex items-center text-gray-500 gap-2 text-sm mt-1">
                                            <Calendar size={14}/>
                                            {new Date(run.created_at).toLocaleDateString()}
                                        </div>
                                    </div>

                                    <button
                                        className="px-4 py-2 border border-gray-200 hover:bg-gray-100 rounded-md flex items-center gap-2 text-sm transition"
                                        onClick={(e)=>{ e.preventDefault(); exportCSV(run.id); }}>
                                        <Download size={15}/> Export
                                    </button>
                                </div>

                                {/* Stats Row */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">

                                    <Stat label="Total Return" 
                                        value={`${run.total_return.toFixed(2)}%`} 
                                        accent={run.total_return>=0?"text-green-600":"text-red-500"} />

                                    <Stat label="Sharpe Ratio" 
                                        value={run.sharpe_ratio.toFixed(2)} />

                                    <Stat label="Max Drawdown" 
                                        value={`${run.max_drawdown.toFixed(2)}%`}
                                        accent="text-red-500" />

                                    <Stat label="Win Rate" 
                                        value={`${run.win_rate.toFixed(2)}%`} />
                                </div>

                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}


// UI Sub-component
function Stat({label,value,accent="text-gray-900"}:{label:string,value:string,accent?:string}){
    return(
        <div>
            <p className="text-gray-500 text-xs">{label}</p>
            <p className={`text-lg font-semibold ${accent}`}>{value}</p>
        </div>
    );
}
