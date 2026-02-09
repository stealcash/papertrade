'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { optionStrategiesAPI, subscriptionsAPI } from '@/lib/api';
import { Plus, Trash2, Edit2, Layers, ArrowLeft, Loader2, Info } from 'lucide-react';
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
                            <h2 className="text-xl font-semibold mb-4 text-gray-800">My Strategies</h2>
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
                                        <div key={strat.id} className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition relative group flex flex-col justify-between">
                                            <div className="absolute top-0 right-0 w-12 h-12 bg-blue-50 rounded-bl-full -mr-3 -mt-3" />

                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900">{strat.name}</h3>
                                                <p className="text-sm text-gray-500 mt-2 line-clamp-3">
                                                    {strat.description || 'No description'}
                                                </p>
                                                <div className="mt-4 flex items-center gap-2">
                                                    <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                                                        {strat.configuration?.legs?.length || 0} LEGS
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end items-center">
                                                <div className="flex gap-2">
                                                    <Link
                                                        href={`/option-strategies/edit/${strat.id}`}
                                                        className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg hover:text-blue-600 transition"
                                                    >
                                                        <Edit2 size={18} />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(strat.id)}
                                                        className="p-1.5 text-gray-400 hover:bg-red-50 rounded-lg hover:text-red-600 transition"
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
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {systemStrategies.map(strat => (
                                    <div key={strat.id} className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition relative group overflow-hidden">
                                        <div className="absolute top-0 right-0 w-12 h-12 bg-amber-50 rounded-bl-full -mr-3 -mt-3" />

                                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-amber-600 transition-colors">
                                            {strat.name}
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-2 line-clamp-3">
                                            {strat.description || 'No description'}
                                        </p>

                                        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end items-center">
                                            <Link href={`/option-strategies/${strat.id}`} className="text-sm font-medium text-gray-400 hover:text-gray-600 flex items-center gap-1">
                                                View <ArrowLeft size={14} className="rotate-180" />
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
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
