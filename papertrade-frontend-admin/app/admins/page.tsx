'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import apiClient from '@/lib/api';

import { useConfirm } from '@/context/ConfirmContext';
import { toast } from 'react-hot-toast';

export default function AdminsPage() {
    const router = useRouter();
    const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
    const { confirm } = useConfirm();
    const [admins, setAdmins] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    // ... (Keep existing state)
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalAdmins, setTotalAdmins] = useState(0);
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        if (user?.role !== 'superadmin') {
            router.push('/dashboard');
            return;
        }
        fetchAdmins(currentPage, sortBy, sortOrder);
    }, [isAuthenticated, user, mounted, currentPage, sortBy, sortOrder]);

    const fetchAdmins = async (page: number, sort: string, order: string) => {
        setLoading(true); // Ensure loading state starts
        try {
            const response = await apiClient.get(`/admin-panel/admins/?page=${page}&sort_by=${sort}&order=${order}`);
            const data = response.data.data;
            if (data.admins && data.pagination) {
                setAdmins(data.admins);
                setTotalPages(data.pagination.total_pages);
                setTotalAdmins(data.pagination.total_count);
            } else if (Array.isArray(data)) {
                setAdmins(data);
            } else {
                setAdmins([]);
            }
        } catch (error) {
            console.error('Failed to fetch admins:', error);
            setAdmins([]);
            toast.error('Failed to load admins');
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

    const handleToggleStatus = async (adminId: number, currentStatus: boolean) => {
        const action = currentStatus ? 'deactivate' : 'activate';
        const isConfirmed = await confirm({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} Admin`,
            message: `Are you sure you want to ${action} this admin?`,
            confirmText: action.charAt(0).toUpperCase() + action.slice(1),
            type: currentStatus ? 'warning' : 'success'
        });

        if (!isConfirmed) return;

        setActionLoading(adminId);
        try {
            await apiClient.put(`/admin-panel/admins/${adminId}/`, { is_active: !currentStatus });
            setAdmins(admins.map(a => a.id === adminId ? { ...a, is_active: !currentStatus } : a));
            toast.success(`Admin ${action}d successfully`);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update status');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (adminId: number) => {
        const isConfirmed = await confirm({
            title: 'Delete Admin',
            message: 'Are you sure you want to delete this admin? This action cannot be undone.',
            confirmText: 'Delete',
            type: 'danger'
        });

        if (!isConfirmed) return;

        setActionLoading(adminId);
        try {
            await apiClient.delete(`/admin-panel/admins/${adminId}/delete/`);
            setAdmins(admins.filter(a => a.id !== adminId));
            toast.success("Admin deleted successfully");
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete admin');
        } finally {
            setActionLoading(null);
        }
    };

    if (!isAuthenticated || user?.role !== 'superadmin' || !mounted) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
            <div className="text-gray-600 dark:text-gray-400">Loading...</div>
        </div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            {/* Header */}
            <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Management</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Manage admin accounts (Superadmin only)</p>
                    </div>
                    <div>
                        <button
                            onClick={() => router.push('/create-admin')}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all font-medium"
                        >
                            + Create Admin
                        </button>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-gray-600 dark:text-gray-400">Loading admins...</div>
                    ) : admins.length === 0 ? (
                        <div className="p-8 text-center text-gray-600 dark:text-gray-400">No admin users found.</div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('name')}>
                                        Name / Email {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('role')}>
                                        Role {sortBy === 'role' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('is_active')}>
                                        Status {sortBy === 'is_active' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('last_login')}>
                                        Last Login {sortBy === 'last_login' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Permissions
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                {admins.map((admin) => (
                                    <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{admin.name || 'N/A'}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">{admin.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${admin.role === 'superadmin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                                }`}>
                                                {admin.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${admin.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                }`}>
                                                {admin.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {admin.last_login ? new Date(admin.last_login).toLocaleDateString() : 'Never'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            <div className="flex flex-col space-y-1">
                                                {admin.role === 'superadmin' ? (
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">All Permissions</span>
                                                ) : (
                                                    <>
                                                        {admin.can_manage_stocks && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 self-start">
                                                                Stocks & Sectors
                                                            </span>
                                                        )}
                                                        {admin.can_manage_config && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 self-start">
                                                                Config
                                                            </span>
                                                        )}
                                                        {!admin.can_manage_stocks && !admin.can_manage_config && (
                                                            <span className="text-xs text-gray-400 dark:text-gray-500">Read Only</span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {admin.id !== user?.id && (
                                                <div className="flex justify-end space-x-3">
                                                    <button
                                                        onClick={() => router.push(`/admins/${admin.id}`)}
                                                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleStatus(admin.id, admin.is_active)}
                                                        disabled={actionLoading === admin.id}
                                                        className={`${admin.is_active ? 'text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300' : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'
                                                            } disabled:opacity-50 transition-colors`}
                                                    >
                                                        {admin.is_active ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(admin.id)}
                                                        disabled={actionLoading === admin.id}
                                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 transition-colors"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                            {admin.id === user?.id && (
                                                <span className="text-gray-400 dark:text-gray-500 italic">Current User</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination Controls */}
                <div className="mt-4 flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                    <div>
                        Showing {admins.length} admins (Page {currentPage} of {totalPages})
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1 || loading}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages || loading}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
