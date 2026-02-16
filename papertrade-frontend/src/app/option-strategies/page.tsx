'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { optionStrategiesAPI, subscriptionsAPI } from '@/lib/api';
import { Plus, Trash2, Edit2, Layers, ArrowLeft, Loader2, Info, Eye } from 'lucide-react';
import { useConfirm } from '@/context/ConfirmContext';
import { toast } from 'react-hot-toast';
import UpgradeModal from '@/components/common/UpgradeModal';

export default function OptionStrategiesPage() {
    const [userStrategies, setUserStrategies] = useState<any[]>([]);
    const [systemStrategies, setSystemStrategies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [subscription, setSubscription] = useState<any>(null);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [upgradeMessage, setUpgradeMessage] = useState('');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const { confirm } = useConfirm();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            await Promise.all([fetchStrategies(), fetchSubscription()]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchSubscription = async () => {
        try {
            const res = await subscriptionsAPI.getCurrent();
            if (res.data) {
                setSubscription(res.data.data || res.data);
            }
        } catch (err) {
            console.error("Failed to fetch subscription", err);
        }
    };

    const fetchStrategies = async () => {
        try {
            const res = await optionStrategiesAPI.getAll();
            const allStrategies = res.data.data.results || res.data.data || [];

            setUserStrategies(allStrategies.filter((s: any) => !s.is_system));
            setSystemStrategies(allStrategies.filter((s: any) => s.is_system));
            setSelectedIds([]); // Clear selection
        } catch (e) {
            console.error(e);
            toast.error("Failed to load strategies");
        }
    };

    const handleDelete = async (id: number) => {
        const isConfirmed = await confirm({
            title: "Delete Strategy",
            message: "Are you sure you want to delete this option strategy?",
            confirmText: "Delete",
            type: 'danger'
        });

        if (!isConfirmed) return;

        try {
            await optionStrategiesAPI.delete(id);
            toast.success("Strategy deleted");
            fetchStrategies();
        } catch (e) {
            toast.error("Failed to delete strategy");
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        const isConfirmed = await confirm({
            title: `Delete ${selectedIds.length} Strategies`,
            message: `Are you sure you want to delete ${selectedIds.length} selected strategies? This action cannot be undone.`,
            confirmText: "Delete All",
            type: 'danger'
        });

        if (!isConfirmed) return;

        try {
            await optionStrategiesAPI.deleteBulk(selectedIds);
            toast.success("Strategies deleted successfully");
            fetchStrategies();
        } catch (e) {
            toast.error("Failed to delete strategies");
        }
    };

    const toggleSelect = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === userStrategies.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(userStrategies.map(s => s.id));
        }
    };

    const getPlanLimits = () => {
        // Fallback or specific feature for option strategies if it exists, else use STRATEGY_CREATE
        const feature = subscription?.plan?.features?.OPTION_STRATEGY_CREATE || subscription?.plan?.features?.STRATEGY_CREATE;
        if (!feature) return { limit: 0, used: 0, canCreate: false, unlimited: false };

        const limit = feature.limit;
        const used = subscription.usage?.OPTION_STRATEGY_CREATE ?? subscription.usage?.STRATEGY_CREATE ?? 0;

        const unlimited = limit === -1;
        const canCreate = unlimited || used < limit;

        return { limit, used, canCreate, unlimited };
    };

    const { limit, used, canCreate, unlimited } = getPlanLimits();

    return (
        <>
            <div className="max-w-7xl mx-auto py-10 px-4">

                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">Option Strategies</h1>
                        <p className="text-gray-500 mt-1">Manage and view your custom option trading strategies.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        {selectedIds.length > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2.5 rounded-lg hover:bg-red-100 transition border border-red-100 font-bold text-sm"
                            >
                                <Trash2 size={18} /> Delete Selected ({selectedIds.length})
                            </button>
                        )}
                        {!loading && subscription && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-md border border-gray-200 cursor-default">
                                <span>Strategies: <span className="font-semibold text-gray-900">{used}</span> / {unlimited ? '∞' : limit}</span>
                                <div className="group relative">
                                    <Info size={14} className="text-gray-400 hover:text-gray-600" />
                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 p-2.5 bg-gray-900 text-white text-xs rounded shadow-lg hidden group-hover:block z-50">
                                        <div className="text-center">
                                            Limit applies to <b>created</b> option strategies.
                                        </div>
                                        <div className="w-2 h-2 bg-gray-900 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {canCreate ? (
                            <Link
                                href="/option-strategies/create"
                                className="flex items-center gap-2 bg-black text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 transition"
                            >
                                <Plus size={18} /> Create New
                            </Link>
                        ) : (
                            <button
                                disabled
                                className="flex items-center gap-2 bg-gray-300 text-gray-500 px-6 py-2.5 rounded-lg cursor-not-allowed"
                            >
                                <Plus size={18} /> Create New
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="animate-spin text-gray-400" size={32} />
                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* User Strategies Section */}
                        <section>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold text-gray-800">My Strategies</h2>
                                {userStrategies.length > 0 && (
                                    <button
                                        onClick={toggleSelectAll}
                                        className="text-xs font-bold text-blue-600 hover:text-blue-800 uppercase tracking-widest"
                                    >
                                        {selectedIds.length === userStrategies.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                )}
                            </div>
                            {userStrategies.length === 0 ? (
                                <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                    <p className="text-gray-500 mb-4">You haven't created any option strategies yet.</p>
                                    {canCreate && (
                                        <Link href="/option-strategies/create" className="text-blue-600 hover:underline font-medium">
                                            Create your first strategy
                                        </Link>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {userStrategies.map(strat => (
                                        <div
                                            key={strat.id}
                                            onClick={() => toggleSelect(strat.id)}
                                            className={`bg-white dark:bg-gray-900 p-6 rounded-xl border transition relative group flex flex-col justify-between cursor-pointer ${selectedIds.includes(strat.id) ? 'border-blue-500 shadow-md ring-1 ring-blue-500 bg-blue-50/10' : 'border-gray-200 shadow-sm hover:shadow-md'}`}
                                        >
                                            <div className="absolute top-4 right-4 z-10">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 dark:bg-gray-700 h-4 w-4 text-blue-600 focus:ring-blue-500 pointer-events-none"
                                                    checked={selectedIds.includes(strat.id)}
                                                    readOnly
                                                />
                                            </div>

                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 pr-8">{strat.name}</h3>
                                                <p className="text-sm text-gray-500 mt-2 line-clamp-3">
                                                    {strat.description || 'No description'}
                                                </p>
                                                <div className="mt-4 flex items-center gap-2">
                                                    <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                                                        {strat.configuration?.legs?.length || 0} LEGS
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end items-center" onClick={e => e.stopPropagation()}>
                                                <div className="flex gap-2">
                                                    <Link
                                                        href={`/option-strategies/${strat.id}`}
                                                        className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg hover:text-amber-600 transition"
                                                        title="View Strategy"
                                                    >
                                                        <Eye size={18} />
                                                    </Link>
                                                    <Link
                                                        href={`/option-strategies/edit/${strat.id}`}
                                                        className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg hover:text-blue-600 transition"
                                                        title="Edit Strategy"
                                                    >
                                                        <Edit2 size={18} />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(strat.id)}
                                                        className="p-1.5 text-gray-400 hover:bg-red-50 rounded-lg hover:text-red-600 transition"
                                                        title="Delete Strategy"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* System Strategies Section */}
                        <section>
                            <h2 className="text-xl font-semibold mb-4 text-gray-800">System Strategies</h2>
                            {systemStrategies.length === 0 ? (
                                <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                    <p className="text-gray-500">No System Strategy Found</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {systemStrategies.map(strat => (
                                        <div key={strat.id} className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition relative group overflow-hidden flex flex-col justify-between">
                                            <div className="absolute top-0 right-0 w-12 h-12 bg-amber-50 rounded-bl-full -mr-3 -mt-3" />

                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 group-hover:text-amber-600 transition-colors">
                                                    {strat.name}
                                                </h3>
                                                <p className="text-sm text-gray-500 mt-2 line-clamp-3">
                                                    {strat.description || 'No description'}
                                                </p>
                                            </div>

                                            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
                                                <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                                                    SYSTEM
                                                </span>
                                                <Link
                                                    href={`/option-strategies/${strat.id}`}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                                >
                                                    <Eye size={16} /> View
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                )}
            </div>

            <UpgradeModal
                isOpen={isUpgradeModalOpen}
                onClose={() => setIsUpgradeModalOpen(false)}
                message={upgradeMessage}
            />
        </>
    );
}
