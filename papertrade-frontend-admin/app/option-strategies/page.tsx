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
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

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
            setSelectedIds([]); // Clear selection on fetch
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

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedIds.length} strategies?`)) return;

        try {
            const { strategiesAPI } = await import('@/lib/api');
            await strategiesAPI.option.deleteBulk(selectedIds);
            setSuccessMessage(`${selectedIds.length} strategies deleted`);
            fetchStrategies();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to delete strategies');
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === strategies.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(strategies.map(s => s.id!).filter(id => id !== undefined));
        }
    };

    const toggleSelect = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
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
                    <div className="flex gap-3">
                        {selectedIds.length > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-md hover:bg-red-100 transition flex items-center gap-2"
                            >
                                <TrashIcon className="w-4 h-4" /> Delete Selected ({selectedIds.length})
                            </button>
                        )}
                        <button onClick={() => router.push('/option-strategies/create')} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                            <PlusIcon className="w-5 h-5 inline mr-2" /> Create Strategy
                        </button>
                    </div>
                </div>

                {successMessage && <Alert type="success" message={successMessage} onClose={() => setSuccessMessage('')} />}
                {error && <Alert type="error" message={error} onClose={() => setError('')} />}

                {/* List */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                    {loading ? <div className="p-8 text-center bg-white dark:bg-gray-800 dark:text-white">Loading...</div> : (
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th className="px-6 py-3 text-left">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 dark:bg-gray-700 h-4 w-4 text-blue-600 focus:ring-blue-500"
                                            checked={strategies.length > 0 && selectedIds.length === strategies.length}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Legs</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {strategies.length === 0 ? (
                                    <tr><td colSpan={5} className="p-6 text-center text-gray-500">No strategies found. Create one to get started.</td></tr>
                                ) : strategies.map(strat => (
                                    <tr key={strat.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition ${selectedIds.includes(strat.id!) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 dark:bg-gray-700 h-4 w-4 text-blue-600 focus:ring-blue-500"
                                                checked={selectedIds.includes(strat.id!)}
                                                onChange={() => toggleSelect(strat.id!)}
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium dark:text-white">{strat.name}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-sm">{strat.description}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 font-bold uppercase tracking-tight">
                                                {strat.configuration?.legs?.length || 0} Legs
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${strat.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                                                {strat.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => router.push(`/option-strategies/${strat.id}`)} className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition" title="View"><EyeIcon className="w-4 h-4" /></button>
                                                <button onClick={() => router.push(`/option-strategies/${strat.id}/edit`)} className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition" title="Edit"><PencilIcon className="w-4 h-4" /></button>
                                                <button onClick={() => handleDelete(strat.id!)} className="p-1.5 text-red-600 hover:text-red-800 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition" title="Delete"><TrashIcon className="w-4 h-4" /></button>
                                            </div>
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
