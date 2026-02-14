'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeftIcon } from '@/components/icons';
import OptionStrategyForm from '@/components/OptionStrategyForm';

export default function ViewOptionStrategyPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [strategy, setStrategy] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (id) {
            fetchStrategy();
        }
    }, [id]);

    const fetchStrategy = async () => {
        setLoading(true);
        try {
            const { strategiesAPI } = await import('@/lib/api');
            const res = await strategiesAPI.option.getById(id);
            setStrategy(res.data?.data || res.data);
        } catch (err: any) {
            console.error(err);
            setError('Failed to fetch strategy details');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-xl dark:text-white">Loading Strategy...</div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-xl text-red-600">{error}</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
                            <ChevronLeftIcon className="w-8 h-8 p-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-sm" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold dark:text-white">View Option Strategy</h1>
                                <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest">ID: {id}</span>
                            </div>
                            <p className="text-xs text-gray-500">System Administration > Strategy Management</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <OptionStrategyForm mode="view" initialData={strategy} />

                    {/* Admin Only: Raw Configuration */}
                    <div className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl">
                        <div className="px-6 py-3 border-b border-gray-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Raw Strategy Configuration</span>
                            </div>
                        </div>
                        <div className="p-6">
                            <pre className="text-[11px] text-blue-400/80 font-mono overflow-auto max-h-[400px] scrollbar-thin scrollbar-thumb-gray-700">
                                {JSON.stringify(strategy.configuration, null, 4)}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
