'use client';

import { useState, useEffect } from 'react';
import { strategiesAPI } from '@/lib/api';
import Link from 'next/link';
import { Plus, Trash2, Edit2, ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useConfirm } from '@/context/ConfirmContext';
import { toast } from 'react-hot-toast';

export default function MyStrategiesPage() {
    const router = useRouter();
    const [userStrategies, setUserStrategies] = useState<any[]>([]);
    const [systemStrategies, setSystemStrategies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const { confirm } = useConfirm();

    useEffect(() => {
        fetchStrategies();
    }, []);

    const fetchStrategies = async () => {
        try {
            setLoading(true);
            console.log("Fetching strategies...");

            // 1. User Strategies (Rule Based)
            let myStrats = [];
            try {
                const rbRes = await strategiesAPI.getRuleBased();
                console.log("RuleBased API response:", rbRes);
                // The endpoint usually returns { data: [...] } or { data: { results: [...] } }
                const rbData = rbRes.data?.data?.results || rbRes.data?.data || rbRes.data || [];
                // Filter if needed, but usually this endpoint returns ONLY the user's strategies
                myStrats = Array.isArray(rbData) ? rbData : [];
                console.log("Parsed User Strategies:", myStrats);
            } catch (err) {
                console.error("Failed to fetch rule based strategies", err);
            }

            // 2. System Strategies (All)
            let systemStrats = [];
            try {
                const allRes = await strategiesAPI.getAll();
                console.log("All Strategies API response:", allRes);
                const allData = allRes.data?.data || allRes.data || [];
                // System should be Manual and NOT linked to a rule_based_strategy
                if (Array.isArray(allData)) {
                    systemStrats = allData.filter((s: any) => s.type === 'MANUAL' && !s.rule_based_strategy);
                }
                console.log("Parsed System Strategies:", systemStrats);
            } catch (err) {
                console.error("Failed to fetch system strategies", err);
            }

            setUserStrategies(myStrats);
            setSystemStrategies(systemStrats);
        } catch (e) {
            console.error("Critical error in fetchStrategies", e);
            toast.error("Failed to load strategies");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        const isConfirmed = await confirm({
            title: "Delete Strategy",
            message: "Are you sure you want to delete this strategy? This action cannot be undone.",
            confirmText: "Delete",
            type: 'danger'
        });

        if (!isConfirmed) return;

        try {
            await strategiesAPI.deleteRuleBased(id);
            toast.success("Strategy deleted successfully");
            fetchStrategies();
        } catch (e) {
            toast.error("Failed to delete strategy");
        }
    };

    return (
        <div className="max-w-7xl mx-auto py-10 px-4">
            {/* Back Link Removed */}

            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Strategies</h1>
                    <p className="text-gray-500 mt-1">Manage and view trading strategies.</p>
                </div>
                <Link
                    href="/strategies/create"
                    className="flex items-center gap-2 bg-black text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 transition"
                >
                    <Plus size={18} /> Create New
                </Link>
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
                                <p className="text-gray-500 mb-4">You haven't created any strategies yet.</p>
                                <Link
                                    href="/strategies/create"
                                    className="text-blue-600 hover:underline font-medium"
                                >
                                    Create your first strategy
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {userStrategies.map(strat => (
                                    <div key={strat.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition relative group overflow-hidden flex flex-col justify-between">
                                        <div className="absolute top-0 right-0 w-12 h-12 bg-blue-50 rounded-bl-full -mr-3 -mt-3" />

                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 relative z-10">
                                                {strat.name}
                                            </h3>
                                            <p className="text-sm text-gray-500 mt-2 line-clamp-3 relative z-10">
                                                {strat.description || 'No description'}
                                            </p>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center relative z-10">
                                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                                                User Created
                                            </span>

                                            <div className="flex gap-2">
                                                <Link
                                                    href={`/strategies/edit/${strat.id}`}
                                                    className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg hover:text-blue-600 transition"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={18} />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(strat.id)}
                                                    className="p-1.5 text-gray-400 hover:bg-red-50 rounded-lg hover:text-red-600 transition"
                                                    title="Delete"
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
                            <p className="text-gray-500">No system strategies available.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {systemStrategies.map(strat => (
                                    <div key={strat.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition relative group overflow-hidden">
                                        <div className="absolute top-0 right-0 w-12 h-12 bg-amber-50 rounded-bl-full -mr-3 -mt-3" />

                                        <h3 className="text-lg font-bold text-gray-900 relative z-10">
                                            <Link href={`/strategies/${strat.id}`} className="hover:text-amber-600 transition-colors">
                                                {strat.name}
                                            </Link>
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-2 line-clamp-3 relative z-10">
                                            {strat.description || 'No description'}
                                        </p>

                                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center relative z-10">
                                            <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-xs font-medium">
                                                System
                                            </span>
                                            <Link href={`/strategies/${strat.id}`} className="text-sm font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1">
                                                View <ArrowLeft size={14} className="rotate-180" />
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
    );
}
