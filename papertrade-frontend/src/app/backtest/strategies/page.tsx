'use client';

import { useState, useEffect } from 'react';
import { strategiesAPI } from '@/lib/api';
import Link from 'next/link';
import { Plus, Trash2, Edit2, ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MyStrategiesPage() {
    const router = useRouter();
    const [strategies, setStrategies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStrategies();
    }, []);

    const fetchStrategies = async () => {
        try {
            setLoading(true);
            const res = await strategiesAPI.getRuleBased();
            // Filter only strategies owned by user (s.user is truthy)
            // Note: Admin public strategies have user=null
            const myStrats = (res.data.data.results || res.data.data || []).filter((s: any) => s.user);
            setStrategies(myStrats);
        } catch (e) {
            console.error("Failed to fetch strategies", e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this strategy?")) return;
        try {
            await strategiesAPI.deleteRuleBased(id);
            fetchStrategies();
        } catch (e) {
            alert("Failed to delete strategy");
        }
    };

    return (
        <div className="max-w-5xl mx-auto py-10 px-4">
            <Link href="/backtest" className="flex items-center text-gray-500 hover:text-black mb-6 gap-2">
                <ArrowLeft size={16} /> Back to Dashboard
            </Link>

            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">My Strategies</h1>
                    <p className="text-gray-500 mt-1">Manage your custom trading strategies.</p>
                </div>
                <Link
                    href="/backtest/strategies/create"
                    className="flex items-center gap-2 bg-black text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 transition"
                >
                    <Plus size={18} /> Create New
                </Link>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-gray-400" size={32} />
                </div>
            ) : strategies.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500 mb-4">You haven't created any strategies yet.</p>
                    <Link
                        href="/backtest/strategies/create"
                        className="text-blue-600 hover:underline font-medium"
                    >
                        Create your first strategy
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4">
                    {strategies.map(strat => (
                        <div key={strat.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center hover:shadow-md transition">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">{strat.name}</h3>
                                <p className="text-sm text-gray-500 mt-1">{strat.description || 'No description'}</p>
                                <div className="flex gap-2 mt-3">
                                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-mono">
                                        ID: {strat.id}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Link
                                    href={`/backtest/strategies/edit/${strat.id}`}
                                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg hover:text-blue-600 transition"
                                    title="Edit"
                                >
                                    <Edit2 size={20} />
                                </Link>
                                <button
                                    onClick={() => handleDelete(strat.id)}
                                    className="p-2 text-gray-500 hover:bg-red-50 rounded-lg hover:text-red-600 transition"
                                    title="Delete"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
