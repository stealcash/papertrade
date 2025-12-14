'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import apiClient from '@/lib/api';

export default function StocksManagementPage() {
    const router = useRouter();
    const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
    const [stocks, setStocks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingStock, setEditingStock] = useState<any>(null);
    const [sectors, setSectors] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    // Pagination & Sorting State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalStocks, setTotalStocks] = useState(0);
    const [sortBy, setSortBy] = useState('symbol');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Bulk Selection State
    const [selectedStocks, setSelectedStocks] = useState<Set<number>>(new Set());

    const [formData, setFormData] = useState({
        symbol: '',
        name: '',
        exchange_suffix: 'NSE',
        status: 'active',
        sectors: [] as string[],
        categories: [] as string[]
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
        // Redirect if user cannot manage stocks (and is not superadmin)
        if (!user?.can_manage_stocks && user?.role !== 'superadmin') {
            router.push('/dashboard');
            return;
        }
        fetchStocks(currentPage, sortBy, sortOrder);
        fetchSectors();
        fetchCategories();
    }, [isAuthenticated, user, mounted, router, currentPage, sortBy, sortOrder]);

    const fetchSectors = async () => {
        try {
            const response = await apiClient.get('/sectors/');
            setSectors(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch sectors:', error);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await apiClient.get('/stocks/categories/');
            setCategories(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    };

    const fetchStocks = async (page: number, sort: string, order: string) => {
        setLoading(true); // Ensure loading state is set
        try {
            const response = await apiClient.get(`/stocks/?page=${page}&sort_by=${sort}&order=${order}`);
            const data = response.data.data;
            if (data.stocks && data.pagination) {
                setStocks(data.stocks);
                setTotalPages(data.pagination.total_pages);
                setTotalStocks(data.pagination.total_count);
            } else if (Array.isArray(data)) {
                setStocks(data);
            } else {
                setStocks([]);
            }
        } catch (error) {
            console.error('Failed to fetch stocks:', error);
            setStocks([]); // Clear stocks on error
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
        setCurrentPage(1);
    };



    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedStocks(new Set(stocks.map(s => s.id)));
        } else {
            setSelectedStocks(new Set());
        }
    };

    const handleSelectRow = (id: number) => {
        const newSelected = new Set(selectedStocks);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedStocks(newSelected);
    };

    const handleBulkDelete = async () => {
        if (selectedStocks.size === 0) return;

        if (!confirm(`Are you sure you want to delete ${selectedStocks.size} selected stocks?`)) return;

        setLoading(true);
        try {
            await apiClient.post('/stocks/bulk_delete/', {
                ids: Array.from(selectedStocks)
            });
            setSelectedStocks(new Set());
            fetchStocks(currentPage, sortBy, sortOrder);
        } catch (error: any) {
            console.error('Bulk delete failed:', error);
            alert(error.response?.data?.message || 'Failed to delete stocks');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingStock) {
                await apiClient.put(`/stocks/${editingStock.id}/`, formData);
            } else {
                await apiClient.post('/stocks/', formData);
            }
            setShowModal(false);
            setEditingStock(null);
            setFormData({ symbol: '', name: '', exchange_suffix: 'NSE', status: 'active', sectors: [], categories: [] });
            fetchStocks(currentPage, sortBy, sortOrder);
        } catch (error: any) {
            alert(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleEdit = (stock: any) => {
        setEditingStock(stock);
        setFormData({
            symbol: stock.symbol,
            name: stock.name || '',
            exchange_suffix: stock.exchange_suffix,
            status: stock.status,
            sectors: stock.sectors || [],
            categories: stock.categories || []
        });
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this stock? This action cannot be undone.')) return;
        try {
            await apiClient.delete(`/stocks/${id}/`);
            fetchStocks(currentPage, sortBy, sortOrder);
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to delete stock');
        }
    };

    if (!isAuthenticated || (!user?.can_manage_stocks && user?.role !== 'superadmin') || !mounted) {
        return <div className="min-h-screen flex items-center justify-center"><div>Loading...</div></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center space-x-3">
                            <h2 className="text-xl font-semibold text-gray-800">Stocks</h2>
                            {selectedStocks.size > 0 && (
                                <button
                                    onClick={handleBulkDelete}
                                    className="bg-red-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-red-700 transition-colors"
                                >
                                    Delete Selected ({selectedStocks.size})
                                </button>
                            )}
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => { setEditingStock(null); setFormData({ symbol: '', name: '', exchange_suffix: 'NSE', status: 'active', sectors: [], categories: [] }); setShowModal(true); }}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all font-medium"
                            >
                                + Create Stock
                            </button>
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-all"
                            >
                                ← Back
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-gray-600">Loading stocks...</div>
                    ) : stocks.length === 0 ? (
                        <div className="p-8 text-center text-gray-600">No stocks found.</div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            checked={stocks.length > 0 && selectedStocks.size === stocks.length}
                                            onChange={handleSelectAll}
                                        />
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('symbol')}>
                                        Symbol {sortBy === 'symbol' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>
                                        Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('exchange_suffix')}>
                                        Exchange {sortBy === 'exchange_suffix' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Groups</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>
                                        Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {stocks.map((stock) => (
                                    <tr key={stock.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                checked={selectedStocks.has(stock.id)}
                                                onChange={() => handleSelectRow(stock.id)}
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{stock.symbol}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stock.name || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stock.exchange_suffix}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div className="flex flex-col gap-1">
                                                {stock.sectors && stock.sectors.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {stock.sectors.map((sid: string) => {
                                                            const sector = sectors.find(s => s.id === sid);
                                                            return sector ? (
                                                                <span key={sid} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs border border-blue-100">
                                                                    {sector.name}
                                                                </span>
                                                            ) : null;
                                                        })}
                                                    </div>
                                                )}
                                                {stock.categories && stock.categories.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {stock.categories.map((cid: string) => {
                                                            const category = categories.find(c => c.id === cid);
                                                            return category ? (
                                                                <span key={cid} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs border border-purple-100">
                                                                    {category.name}
                                                                </span>
                                                            ) : null;
                                                        })}
                                                    </div>
                                                )}
                                                {(!stock.sectors?.length && !stock.categories?.length) && '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${stock.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {stock.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => handleEdit(stock)} className="text-blue-600 hover:text-blue-900 mr-4">Edit</button>
                                            <button onClick={() => handleDelete(stock.id)} className="text-red-600 hover:text-red-900">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination Controls */}
                <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
                    <div>
                        Showing {stocks.length} stocks (Page {currentPage} of {totalPages})
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1 || loading}
                            className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages || loading}
                            className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </main>

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl p-6 md:p-8 max-w-2xl w-full my-8 shadow-2xl transform transition-all">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">{editingStock ? 'Edit Stock' : 'Create Stock'}</h2>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Symbol *</label>
                                <input type="text" required value={formData.symbol} onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                                    className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none" placeholder="e.g. Reliance Industries" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Exchange Suffix</label>
                                <input type="text" value={formData.exchange_suffix} onChange={(e) => setFormData({ ...formData, exchange_suffix: e.target.value })}
                                    className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none" placeholder="Default: NSE" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none">
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Sectors</label>
                                <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-white scrollbar-thin scrollbar-thumb-gray-200">
                                    {sectors.length === 0 ? (
                                        <p className="text-sm text-gray-500 text-center">No sectors available</p>
                                    ) : (
                                        <div className="space-y-1">
                                            {sectors.map((sector) => (
                                                <label key={sector.id} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded cursor-pointer group transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        value={sector.id}
                                                        checked={formData.sectors.includes(sector.id)}
                                                        onChange={(e) => {
                                                            const newSectors = e.target.checked
                                                                ? [...formData.sectors, sector.id]
                                                                : formData.sectors.filter(id => id !== sector.id);
                                                            setFormData({ ...formData, sectors: newSectors });
                                                        }}
                                                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                                                    />
                                                    <span className="text-sm text-gray-700 group-hover:text-gray-900">{sector.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
                                <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-white scrollbar-thin scrollbar-thumb-gray-200">
                                    {categories.length === 0 ? (
                                        <p className="text-sm text-gray-500 text-center">No categories available</p>
                                    ) : (
                                        <div className="space-y-1">
                                            {categories.map((category) => (
                                                <label key={category.id} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded cursor-pointer group transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        value={category.id}
                                                        checked={formData.categories.includes(category.id)}
                                                        onChange={(e) => {
                                                            const newCategories = e.target.checked
                                                                ? [...formData.categories, category.id]
                                                                : formData.categories.filter(id => id !== category.id);
                                                            setFormData({ ...formData, categories: newCategories });
                                                        }}
                                                        className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                                                    />
                                                    <span className="text-sm text-gray-700 group-hover:text-gray-900">{category.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="md:col-span-2 flex space-x-3 pt-2">
                                <button type="submit" className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm">
                                    {editingStock ? 'Update Stock' : 'Create Stock'}
                                </button>
                                <button type="button" onClick={() => { setShowModal(false); setEditingStock(null); }}
                                    className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 font-medium transition-colors">
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
