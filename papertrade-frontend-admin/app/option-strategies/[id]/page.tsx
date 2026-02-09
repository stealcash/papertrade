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
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                        <ChevronLeftIcon className="w-6 h-6" />
                    </button>
                    <h1 className="text-2xl font-bold dark:text-white">View Option Strategy</h1>
                </div>

                <OptionStrategyForm mode="view" initialData={strategy} />
            </div>
        </div>
    );
}
