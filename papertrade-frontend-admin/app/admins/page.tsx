'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import apiClient from '@/lib/api';

export default function AdminsPage() {
    const router = useRouter();
    const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
    const [admins, setAdmins] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

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
        fetchAdmins();
    }, [isAuthenticated, user, mounted]);

    const fetchAdmins = async () => {
        try {
            const response = await apiClient.get('/admin-panel/admins/');
            setAdmins(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch admins:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (adminId: number, currentStatus: boolean) => {
        if (!confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this admin?`)) return;

        setActionLoading(adminId);
        try {
            await apiClient.put(`/admin-panel/admins/${adminId}/`, { is_active: !currentStatus });
            setAdmins(admins.map(a => a.id === adminId ? { ...a, is_active: !currentStatus } : a));
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to update status');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (adminId: number) => {
        if (!confirm('Are you sure you want to delete this admin? This action cannot be undone.')) return;

        setActionLoading(adminId);
        try {
            await apiClient.delete(`/admin-panel/admins/${adminId}/delete/`);
            setAdmins(admins.filter(a => a.id !== adminId));
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to delete admin');
        } finally {
            setActionLoading(null);
        }
    };

    if (!isAuthenticated || user?.role !== 'superadmin' || !mounted) {
        return <div className="min-h-screen flex items-center justify-center">
            <div>Loading...</div>
        </div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Admin Management</h1>
                            <p className="text-sm text-gray-600">Manage admin accounts (Superadmin only)</p>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => router.push('/create-admin')}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all font-medium"
                            >
                                + Create Admin
                            </button>
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-all"
                            >
                                ← Back to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-gray-600">Loading admins...</div>
                    ) : admins.length === 0 ? (
                        <div className="p-8 text-center text-gray-600">No admin users found.</div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name / Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {admins.map((admin) => (
                                    <tr key={admin.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{admin.name || 'N/A'}</div>
                                            <div className="text-sm text-gray-500">{admin.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${admin.role === 'superadmin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                {admin.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${admin.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {admin.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {admin.last_login ? new Date(admin.last_login).toLocaleDateString() : 'Never'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {admin.id !== user?.id && (
                                                <div className="flex justify-end space-x-3">
                                                    <button
                                                        onClick={() => router.push(`/admins/${admin.id}`)}
                                                        className="text-indigo-600 hover:text-indigo-900"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleStatus(admin.id, admin.is_active)}
                                                        disabled={actionLoading === admin.id}
                                                        className={`${admin.is_active ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'
                                                            } disabled:opacity-50`}
                                                    >
                                                        {admin.is_active ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(admin.id)}
                                                        disabled={actionLoading === admin.id}
                                                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                            {admin.id === user?.id && (
                                                <span className="text-gray-400 italic">Current User</span>
                                            )}
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
