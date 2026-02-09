'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon } from '@/components/icons';

// --- Types ---
interface OptionStrategy {
    id?: number;
    name: string;
    description: string;
    status: 'active' | 'inactive';
    configuration: any;
    is_system?: boolean;
}

const Alert = ({ type, message, onClose }: { type: 'success' | 'error', message: string, onClose: () => void }) => (
    <div className={`p-4 rounded-md mb-4 flex justify-between items-center ${type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
        <span>{message}</span>
        <button onClick={onClose} className="font-bold">✕</button>
    </div>
);

export default function OptionStrategiesPage() {
    const router = useRouter();
    // @ts-ignore
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);
    const [mounted, setMounted] = useState(false);

    const [strategies, setStrategies] = useState<OptionStrategy[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        if (!isAuthenticated) router.push('/login');
        else fetchStrategies();
    }, [mounted, isAuthenticated]);

    const fetchStrategies = async () => {
        setLoading(true);
        try {
            const { strategiesAPI } = await import('@/lib/api');
            const res = await strategiesAPI.option.getAll();
            const allStrategies = res.data?.data?.results || res.data?.data || [];
            // Filter: Only show system strategies in Admin
            const systemStrategies = allStrategies.filter((s: any) => s.is_system === true);
            setStrategies(systemStrategies);
        } catch (err) {
            console.error(err);
            setError('Failed to fetch strategies');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this strategy?')) return;
        try {
            const { strategiesAPI } = await import('@/lib/api');
            await strategiesAPI.option.delete(id);
            setSuccessMessage('Strategy deleted');
            fetchStrategies();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to delete');
        }
    };

    if (!mounted || !isAuthenticated) return null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold dark:text-white">Option Strategies</h1>
                        <p className="text-gray-500 dark:text-gray-400">Manage complex multi-leg option strategies.</p>
                    </div>
                    <button onClick={() => router.push('/option-strategies/create')} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                        <PlusIcon className="w-5 h-5 inline mr-2" /> Create Strategy
                    </button>
                </div>

                {successMessage && <Alert type="success" message={successMessage} onClose={() => setSuccessMessage('')} />}
                {error && <Alert type="error" message={error} onClose={() => setError('')} />}

                {/* List */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                    {loading ? <div className="p-8 text-center bg-white dark:bg-gray-800 dark:text-white">Loading...</div> : (
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Legs</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {strategies.length === 0 ? (
                                    <tr><td colSpan={4} className="p-6 text-center text-gray-500">No strategies found. Create one to get started.</td></tr>
                                ) : strategies.map(strat => (
                                    <tr key={strat.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium dark:text-white">{strat.name}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-sm">{strat.description}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                {strat.configuration?.legs?.length || 0} Legs
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 text-xs rounded-full ${strat.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                                                {strat.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => router.push(`/option-strategies/${strat.id}`)} className="text-gray-600 hover:text-gray-900 dark:text-gray-400 mr-4"><EyeIcon className="w-5 h-5" /></button>
                                            <button onClick={() => router.push(`/option-strategies/${strat.id}/edit`)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 mr-4"><PencilIcon className="w-5 h-5" /></button>
                                            <button onClick={() => handleDelete(strat.id!)} className="text-red-600 hover:text-red-900 dark:text-red-400"><TrashIcon className="w-5 h-5" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>
        </div>
    );
}
