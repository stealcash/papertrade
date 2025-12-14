'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import apiClient from '@/lib/api';

export default function SectorsManagementPage() {
    const router = useRouter();
    const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
    const [sectors, setSectors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingSector, setEditingSector] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: '',
        symbol: '',
        description: ''
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        // Redirect if user cannot manage stocks/sectors (and is not superadmin)
        if (!user?.can_manage_stocks && user?.role !== 'superadmin') {
            router.push('/dashboard');
            return;
        }
        fetchSectors();
    }, [isAuthenticated, user, mounted, router]);

    const fetchSectors = async () => {
        try {
            const response = await apiClient.get('/sectors/');
            setSectors(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch sectors:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingSector) {
                await apiClient.put(`/sectors/${editingSector.id}/`, formData);
            } else {
                await apiClient.post('/sectors/', formData);
            }
            setShowModal(false);
            setEditingSector(null);
            setFormData({ name: '', symbol: '', description: '' });
            fetchSectors();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleEdit = (sector: any) => {
        setEditingSector(sector);
        setFormData({
            name: sector.name,
            symbol: sector.symbol,
            description: sector.description || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this sector? This action cannot be undone.')) return;
        try {
            await apiClient.delete(`/sectors/${id}/`);
            fetchSectors();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to delete sector');
        }
    };

    if (!isAuthenticated || (!user?.can_manage_stocks && user?.role !== 'superadmin') || !mounted) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
            <div className="text-gray-600 dark:text-gray-400">Loading...</div>
        </div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sector Management</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Manage platform sectors</p>
                    </div>
                    <div>
                        <button
                            onClick={() => { setEditingSector(null); setFormData({ name: '', symbol: '', description: '' }); setShowModal(true); }}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all font-medium"
                        >
                            + Create Sector
                        </button>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-gray-600 dark:text-gray-400">Loading sectors...</div>
                    ) : sectors.length === 0 ? (
                        <div className="p-8 text-center text-gray-600 dark:text-gray-400">No sectors found.</div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Symbol</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                {sectors.map((sector) => (
                                    <tr key={sector.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{sector.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{sector.symbol}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{sector.description || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => handleEdit(sector)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4">Edit</button>
                                            <button onClick={() => handleDelete(sector.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md w-full shadow-2xl border dark:border-gray-700">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{editingSector ? 'Edit Sector' : 'Create Sector'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name *</label>
                                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Symbol *</label>
                                <input type="text" required value={formData.symbol} onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none" rows={3} />
                            </div>
                            <div className="flex space-x-3 pt-4">
                                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm">
                                    {editingSector ? 'Update' : 'Create'}
                                </button>
                                <button type="button" onClick={() => { setShowModal(false); setEditingSector(null); }}
                                    className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
