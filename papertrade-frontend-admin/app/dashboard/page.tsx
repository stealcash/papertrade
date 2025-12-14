'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { logout } from '@/store/slices/authSlice';
import apiClient from '@/lib/api';

export default function AdminDashboard() {
    const router = useRouter();
    const dispatch = useDispatch();
    const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Wait for client-side hydration to complete
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return; // Don't check auth until mounted

        if (!isAuthenticated) {
            router.push('/login');
            return;
        }

        if (user?.role !== 'admin' && user?.role !== 'superadmin') {
            router.push('/login');
            return;
        }

        fetchStats();
    }, [isAuthenticated, user, mounted, router]);

    const fetchStats = async () => {
        try {
            const response = await apiClient.get('/admin-panel/dashboard/stats/');
            setStats({
                totalUsers: response.data.data.total_users || 0,
                totalStocks: response.data.data.total_stocks || 0,
                totalSectors: response.data.data.total_sectors || 0,
                totalBacktests: response.data.data.total_backtests || 0,
            });
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        dispatch(logout());
        router.push('/login');
    };

    if (loading || !isAuthenticated || !mounted) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-gray-600">Loading...</div>
        </div>;
    }

    const isSuperadmin = user?.role === 'superadmin';

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admin Dashboard</h1>
                <div className="flex items-center space-x-2 mt-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{user?.email} • {user?.role}</p>
                    {user?.role === 'admin' && (
                        <>
                            {user?.can_manage_stocks && (
                                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs px-2 py-0.5 rounded font-medium">Stocks Access</span>
                            )}
                            {user?.can_manage_config && (
                                <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs px-2 py-0.5 rounded font-medium">Config Access</span>
                            )}
                        </>
                    )}
                </div>
            </div>
            {/* stats */}

            <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm border dark:border-gray-800">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <button
                        onClick={() => router.push('/users')}
                        className="bg-blue-600 text-white p-6 rounded-xl font-semibold hover:bg-blue-700 transition-all text-left"
                    >
                        <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <div className="text-lg">Manage Users</div>
                        <p className="text-blue-200 text-sm mt-1">View and edit user accounts</p>
                    </button>

                    {(isSuperadmin || user?.can_manage_stocks) && (
                        <>
                            <button
                                onClick={() => router.push('/stocks')}
                                className="bg-cyan-600 text-white p-6 rounded-xl font-semibold hover:bg-cyan-700 transition-all text-left"
                            >
                                <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                                </svg>
                                <div className="text-lg">Manage Stocks</div>
                                <p className="text-cyan-200 text-sm mt-1">Add or update stocks</p>
                            </button>
                            <button
                                onClick={() => router.push('/stock-categories')}
                                className="bg-purple-600 text-white p-6 rounded-xl font-semibold hover:bg-purple-700 transition-all text-left"
                            >
                                <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                <div className="text-lg">Stock Categories</div>
                                <p className="text-purple-200 text-sm mt-1">Manage classifications</p>
                            </button>
                            <button
                                onClick={() => router.push('/sectors')}
                                className="bg-teal-600 text-white p-6 rounded-xl font-semibold hover:bg-teal-700 transition-all text-left"
                            >
                                <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                <div className="text-lg">Manage Sectors</div>
                                <p className="text-teal-200 text-sm mt-1">Add or update sectors</p>
                            </button>
                        </>
                    )}

                    {isSuperadmin && (
                        <button
                            onClick={() => router.push('/create-admin')}
                            className="bg-green-600 text-white p-6 rounded-xl font-semibold hover:bg-green-700 transition-all text-left"
                        >
                            <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                            <div className="text-lg">Create Admin</div>
                            <p className="text-green-200 text-sm mt-1">Add new admin account (Superadmin only)</p>
                        </button>
                    )}

                    {isSuperadmin && (
                        <button
                            onClick={() => router.push('/admins')}
                            className="bg-indigo-600 text-white p-6 rounded-xl font-semibold hover:bg-indigo-700 transition-all text-left"
                        >
                            <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <div className="text-lg">Manage Admins</div>
                            <p className="text-indigo-200 text-sm mt-1">View and manage admin accounts</p>
                        </button>
                    )}

                    {(isSuperadmin || user?.can_manage_config) && (
                        <button
                            onClick={() => router.push('/config')}
                            className="bg-purple-600 text-white p-6 rounded-xl font-semibold hover:bg-purple-700 transition-all text-left"
                        >
                            <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <div className="text-lg">System Config</div>
                            <p className="text-purple-200 text-sm mt-1">Configure platform settings</p>
                        </button>
                    )}

                    {isSuperadmin && (
                        <button
                            onClick={() => router.push('/debug-logs')}
                            className="bg-gray-800 text-white p-6 rounded-xl font-semibold hover:bg-gray-900 transition-all text-left"
                        >
                            <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div className="text-lg">Debug Logs</div>
                            <p className="text-gray-400 text-sm mt-1">View API sync logs</p>
                        </button>
                    )}

                    {isSuperadmin && (
                        <button
                            onClick={() => router.push('/tables')}
                            className="bg-orange-600 text-white p-6 rounded-xl font-semibold hover:bg-orange-700 transition-all text-left"
                        >
                            <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                            </svg>
                            <div className="text-lg">Database Tables</div>
                            <p className="text-orange-200 text-sm mt-1">View database schema</p>
                        </button>
                    )}

                    {isSuperadmin && (
                        <button
                            onClick={() => router.push('/sync')}
                            className="bg-pink-600 text-white p-6 rounded-xl font-semibold hover:bg-pink-700 transition-all text-left"
                        >
                            <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <div className="text-lg">Data Sync</div>
                            <p className="text-pink-200 text-sm mt-1">Sync market data</p>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
