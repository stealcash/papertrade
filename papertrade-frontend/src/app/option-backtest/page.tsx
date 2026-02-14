'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Calendar, Settings, Eye, Loader2, Info, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import NewOptionBacktestModal from '@/components/backtest/NewOptionBacktestModal';
import { optionBacktestAPI, subscriptionsAPI } from '@/lib/api';
import { useConfirm } from '@/context/ConfirmContext';
import { toast } from 'react-hot-toast';

function formatDate(dateStr: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
}

export default function OptionBacktestPage() {
    const [runs, setRuns] = useState<any[]>([]);
    const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total_count: 0 });
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [subscription, setSubscription] = useState<any>(null);
    const [resyncingId, setResyncingId] = useState<number | null>(null);
    const { confirm } = useConfirm();

    useEffect(() => {
        fetchData(pagination.page);
    }, [pagination.page]);

    async function fetchData(page = 1) {
        setLoading(true);
        try {
            await Promise.all([fetchRuns(page), fetchSubscription()]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function fetchSubscription() {
        try {
            const res = await subscriptionsAPI.getCurrent();
            setSubscription(res.data.data);
        } catch (err) {
            console.error("Failed to fetch subscription", err);
        }
    }

    async function fetchRuns(page = 1) {
        try {
            const res = await optionBacktestAPI.getAll({ page, page_size: 10 });
            const data = res.data.data;
            setRuns(data.results || []);
            if (data.pagination) {
                setPagination(prev => ({
                    ...prev,
                    total_pages: data.pagination.total_pages,
                    total_count: data.pagination.total_count
                }));
            }
        } catch (err) {
            console.error('Failed to load option backtests', err);
            toast.error("Failed to fetch backtests");
        }
    }

    const handleDelete = async (id: number) => {
        const isConfirmed = await confirm({
            title: "Delete Report",
            message: "Are you sure you want to delete this option backtest report?",
            confirmText: "Delete",
            type: 'danger'
        });
        if (!isConfirmed) return;

        try {
            await optionBacktestAPI.delete(id);
            toast.success("Backtest deleted");
            fetchRuns(pagination.page);
        } catch (e) {
            toast.error("Failed to delete backtest");
        }
    };

    const handleResync = async (id: number) => {
        const isConfirmed = await confirm({
            title: "Resync Backtest",
            message: "This will delete all existing trades and re-run the backtest with fresh option data. This counts as a new run towards your plan limit.",
            confirmText: "Resync",
            type: 'warning'
        });
        if (!isConfirmed) return;

        setResyncingId(id);
        try {
            await optionBacktestAPI.resync(id);
            toast.success("Backtest resynced successfully");
            await fetchData(pagination.page);
        } catch (e: any) {
            const msg = e.response?.data?.message?.subscription || e.response?.data?.message || "Failed to resync backtest";
            toast.error(typeof msg === 'string' ? msg : "Failed to resync backtest");
        } finally {
            setResyncingId(null);
        }
    };

    const handleClearAll = async () => {
        const isConfirmed = await confirm({
            title: "Delete All Reports",
            message: "Are you sure you want to delete ALL option backtest reports? This action cannot be undone.",
            confirmText: "Delete All",
            type: 'danger'
        });
        if (!isConfirmed) return;

        const ids = runs.map(r => r.id);
        try {
            await optionBacktestAPI.deleteBulk(ids);
            toast.success("All backtests deleted");
            fetchRuns(1);
        } catch (e) {
            toast.error("Bulk delete failed");
        }
    };

    const getPlanLimits = () => {
        const feature = subscription?.plan?.features?.OPTION_BACKTEST_RUN || subscription?.plan?.features?.BACKTEST_RUN;
        if (!feature) return { limit: 0, used: 0, canRun: false, unlimited: false };

        const limit = feature.limit;
        const used = subscription.usage?.OPTION_BACKTEST_RUN ?? subscription.usage?.BACKTEST_RUN ?? 0;

        const unlimited = limit === -1;
        const canRun = unlimited || used < limit;

        return { limit, used, canRun, unlimited };
    };

    const { limit, used, canRun, unlimited } = getPlanLimits();

    return (
        <div className="space-y-10 max-w-7xl mx-auto">
            <NewOptionBacktestModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => fetchData(1)}
            />

            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Option Backtest</h1>
                    <p className="text-gray-500 mt-1">Test your option strategies against historical data.</p>
                </div>

                <div className="flex items-center gap-3">
                    {!loading && subscription && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-md border border-gray-200 cursor-default mr-4">
                            <span>Runs: <span className="font-semibold text-gray-900">{used}</span> / {unlimited ? '∞' : limit}</span>
                            <div className="group relative">
                                <Info size={14} className="text-gray-400 hover:text-gray-600" />
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 p-2.5 bg-gray-900 text-white text-xs rounded shadow-lg hidden group-hover:block z-50">
                                    <div className="text-center">
                                        This limit tracks the total number of <b>Option Backtests</b> run.
                                    </div>
                                    <div className="w-2 h-2 bg-gray-900 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {runs.length > 0 && (
                        <button
                            onClick={handleClearAll}
                            className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-lg font-semibold hover:bg-red-100 transition text-sm"
                        >
                            <Trash2 size={18} /> Clear All
                        </button>
                    )}
                    <Link
                        href="/option-strategies"
                        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm text-sm"
                    >
                        <Settings size={18} /> Strategies
                    </Link>
                    {canRun ? (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition shadow-lg hover:shadow-xl text-sm"
                        >
                            <Plus size={18} /> New Backtest
                        </button>
                    ) : (
                        <button
                            disabled
                            className="flex items-center gap-2 bg-gray-300 text-gray-500 px-6 py-2.5 rounded-lg cursor-not-allowed text-sm"
                            title="Plan limit reached. Upgrade to run more backtests."
                        >
                            <Plus size={18} /> New Backtest
                        </button>
                    )}
                </div>
            </div>

            {/* List Section */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <div className="min-w-[1000px]">
                        <div className="grid grid-cols-[40px_minmax(100px,150px)_90px_120px_65px_65px_85px_85px_100px_80px_1fr] bg-gray-50 dark:bg-gray-800 px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs border-b border-gray-100 dark:border-gray-700 uppercase tracking-wider">
                            <div className="text-center">ID</div>
                            <div>Strategy</div>
                            <div className="text-center">Symbol</div>
                            <div className="text-center">Date Range</div>
                            <div className="text-center">Trades</div>
                            <div className="text-center">Win%</div>
                            <div className="text-right">Buy Pts</div>
                            <div className="text-right">Sell Pts</div>
                            <div className="text-center text-[10px]">Legs</div>
                            <div className="text-center">Status</div>
                            <div className="text-right">Actions</div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center items-center py-20">
                                <Loader2 className="animate-spin text-gray-400" size={32} />
                            </div>
                        ) : runs.length === 0 ? (
                            <div className="text-center py-20 text-gray-500">
                                <p className="text-lg font-medium">No option backtests run yet.</p>
                                <p className="text-sm">Click "New Backtest" to start testing your strategy.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                {runs.map(run => {
                                    const summary = run.results_summary_json || {};
                                    const buyPts = summary.total_buy_points != null ? Number(summary.total_buy_points).toFixed(1) : '—';
                                    const sellPts = summary.total_sell_points != null ? Number(summary.total_sell_points).toFixed(1) : '—';
                                    const isRunning = run.status === 'running' || run.status === 'pending';

                                    return (
                                        <div key={run.id} className="grid grid-cols-[40px_minmax(100px,150px)_90px_120px_65px_65px_85px_85px_100px_80px_1fr] px-4 py-3 items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition text-sm text-gray-900 dark:text-gray-100">
                                            <div className="text-center font-mono text-gray-400 text-xs">#{run.id}</div>
                                            <div className="truncate pr-2">
                                                <span className="font-bold text-sm">{run.snapshot_name || run.strategy_name}</span>
                                                <div className="text-[10px] text-gray-400 font-normal truncate">{run.run_id}</div>
                                            </div>
                                            <div className="text-center">
                                                <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-[10px] font-bold">
                                                    {run.underlying_symbol}
                                                </span>
                                            </div>
                                            <div className="text-center text-gray-500 text-[10px] leading-tight">
                                                <div>{formatDate(run.start_date)}</div>
                                                <div>{formatDate(run.end_date)}</div>
                                            </div>
                                            <div className="text-center">
                                                <span className="font-mono text-xs">{run.total_trades}</span>
                                            </div>
                                            <div className="text-center">
                                                <span className={`font-bold text-xs ${Number(run.win_rate) >= 50 ? 'text-green-600' : 'text-red-500'}`}>
                                                    {run.win_rate}%
                                                </span>
                                            </div>
                                            <div className="text-right font-mono text-xs text-gray-600 dark:text-gray-400">{buyPts}</div>
                                            <div className="text-right font-mono text-xs text-gray-600 dark:text-gray-400">{sellPts}</div>
                                            <div className="text-center font-mono text-[10px] text-gray-500 uppercase">
                                                {run.leg_actions || '—'}
                                            </div>
                                            <div className="text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase
                                                    ${run.status === 'completed' ? 'bg-green-100 text-green-700' : ''}
                                                    ${run.status === 'failed' ? 'bg-red-100 text-red-700' : ''}
                                                    ${run.status === 'running' ? 'bg-blue-100 text-blue-700' : ''}
                                                    ${run.status === 'pending' ? 'bg-gray-100 text-gray-700' : ''}
                                                `}>
                                                    {run.status === 'completed' ? 'Done' : run.status}
                                                </span>
                                            </div>
                                            <div className="flex justify-end gap-1">
                                                {!isRunning && (
                                                    <button
                                                        onClick={() => handleResync(run.id)}
                                                        disabled={resyncingId !== null}
                                                        className="group relative p-1.5 text-amber-500 hover:bg-amber-50 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title="Re-run with fresh data"
                                                    >
                                                        <RefreshCw size={14} className={resyncingId === run.id ? 'animate-spin' : ''} />
                                                        <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-[10px] rounded whitespace-nowrap hidden group-hover:block">
                                                            Resync
                                                        </span>
                                                    </button>
                                                )}
                                                <Link
                                                    href={`/option-backtest/${run.id}`}
                                                    className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition"
                                                    title="View"
                                                >
                                                    <Eye size={14} />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(run.id)}
                                                    className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-md text-gray-400 transition"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Pagination */}
                {!loading && runs.length > 0 && (
                    <div className="flex justify-between items-center p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50">
                        <div className="text-xs text-gray-500">
                            Page {pagination.page} of {pagination.total_pages} ({pagination.total_count} items)
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                                disabled={pagination.page === 1}
                                className="px-3 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 text-xs font-medium transition"
                            >
                                Prev
                            </button>
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.total_pages, prev.page + 1) }))}
                                disabled={pagination.page === pagination.total_pages}
                                className="px-3 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 text-xs font-medium transition"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
