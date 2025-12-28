'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { backtestAPI } from '@/lib/api';
import { PlayCircle, Download, Calendar, Trash2, Settings } from 'lucide-react';
import NewBacktestModal from '@/components/backtest/NewBacktestModal';

export default function BacktestPage() {
    const [runs, setRuns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchRuns();
    }, []);

    const fetchRuns = async () => {
        setLoading(true);
        try {
            const res = await backtestAPI.getRuns();
            setRuns(res.data.data.results || res.data.data || []);
        } catch {
            console.log("API Fail");
            setRuns([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this backtest report?")) return;
        try {
            await backtestAPI.delete(id);
            fetchRuns(); // Refresh list
        } catch (e) {
            console.error("Delete Failed", e);
            alert("Failed to delete backtest");
        }
    };

    return (
        <div className="space-y-10">
            <NewBacktestModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchRuns}
            />

            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Backtest Strategy</h1>
                    <p className="text-gray-500 mt-1">Test your strategies against historical data to verify accuracy.</p>
                </div>

                <div className="flex gap-3">
                    {runs.length > 0 && (
                        <button
                            onClick={async () => {
                                if (!confirm("Delete ALL backtests? This cannot be undone.")) return;
                                const ids = runs.map(r => r.id);
                                try {
                                    await backtestAPI.deleteBulk(ids);
                                    fetchRuns();
                                } catch (e) { alert("Bulk delete failed"); }
                            }}
                            className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-lg font-semibold hover:bg-red-100 transition"
                        >
                            <Trash2 size={20} /> Clear All
                        </button>
                    )}
                    <Link
                        href="/backtest/strategies"
                        className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition shadow-sm"
                    >
                        <Settings size={20} /> My Strategies
                    </Link>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition shadow-lg hover:shadow-xl"
                    >
                        <PlayCircle size={20} /> New Backtest
                    </button>
                </div>
            </div>

            {/* List Section */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="grid grid-cols-12 bg-gray-50 dark:bg-gray-800 p-4 font-semibold text-gray-500 dark:text-gray-400 text-sm border-b border-gray-100 dark:border-gray-700">
                    <div className="col-span-1 text-center">ID</div>
                    <div className="col-span-3">Strategy Name</div>
                    <div className="col-span-2">Date Range</div>
                    <div className="col-span-2 text-center">Criteria</div>
                    <div className="col-span-2 text-center">Accuracy (Win Rate)</div>
                    <div className="col-span-2 text-right">Actions</div>
                </div>

                {runs.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        <p className="text-lg">No backtests run yet.</p>
                        <p className="text-sm">Click "New Backtest" to start.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {runs.map(run => (
                            <div key={run.id} className="grid grid-cols-12 p-4 items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition text-sm text-gray-900 dark:text-gray-100">

                                <div className="col-span-1 text-center font-mono text-gray-400">#{run.id}</div>

                                <div className="col-span-3 font-semibold">
                                    {/* Display Strategy Name if available, else ID if not expanded */}
                                    {run.strategy_details?.name || `Strategy #${run.strategy_predefined}`}
                                </div>

                                <div className="col-span-2 text-gray-500 text-xs">
                                    {run.start_date} <br /> to {run.end_date}
                                </div>

                                <div className="col-span-2 text-center capitalize">
                                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                                        {run.criteria_type}
                                    </span>
                                </div>

                                <div className="col-span-2 text-center">
                                    {run.status === 'completed' ? (
                                        <div className="flex flex-col items-center">
                                            <span className={`text-lg font-bold ${Number(run.win_rate) >= 50 ? 'text-green-600' : 'text-red-500'
                                                }`}>
                                                {run.win_rate}%
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {run.win_count}W / {run.loss_count}L
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs animate-pulse">
                                            {run.status}
                                        </span>
                                    )}
                                </div>

                                <div className="col-span-2 flex justify-end gap-2">
                                    <Link
                                        href={`/backtest/${run.id}`}
                                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600"
                                    >
                                        <Download size={16} />
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(run.id)}
                                        className="p-2 hover:bg-red-50 hover:text-red-600 rounded text-gray-400 transition"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
