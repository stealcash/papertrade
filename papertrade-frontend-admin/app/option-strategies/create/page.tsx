'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeftIcon } from '@/components/icons';
import OptionStrategyForm from '@/components/OptionStrategyForm';

export default function CreateOptionStrategyPage() {
    const router = useRouter();

    const handleSave = async (data: any) => {
        const { strategiesAPI } = await import('@/lib/api');
        await strategiesAPI.option.create(data);
        router.push('/option-strategies');
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                        <ChevronLeftIcon className="w-6 h-6" />
                    </button>
                    <h1 className="text-2xl font-bold dark:text-white">Create Option Strategy</h1>
                </div>

                <OptionStrategyForm mode="create" onSave={handleSave} />
            </div>
        </div>
    );
}
