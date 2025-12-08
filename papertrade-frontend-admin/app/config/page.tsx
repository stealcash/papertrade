'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import apiClient from '@/lib/api';

export default function ConfigPage() {
    const router = useRouter();
    const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
    const [configs, setConfigs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        if (user?.role !== 'superadmin' && user?.role !== 'admin') {
            router.push('/dashboard');
            return;
        }
        fetchConfigs();
    }, [isAuthenticated, user, mounted]);

    const fetchConfigs = async () => {
        try {
            const response = await apiClient.get('/admin-panel/config/');
            setConfigs(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch configs:', error);
            setConfigs([]);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (key: string, value: string) => {
        setSaving(key);
        try {
            await apiClient.put(`/admin-panel/config/${key}/`, { value });
            setConfigs(configs.map(c => c.key === key ? { ...c, value } : c));
        } catch (error) {
            console.error('Failed to update config:', error);
            alert('Failed to update configuration');
        } finally {
            setSaving(null);
        }
    };

    const getConfig = (key: string) => configs.find(c => c.key === key);

    if (!isAuthenticated || !mounted) {
        return <div className="min-h-screen flex items-center justify-center">
            <div>Loading...</div>
        </div>;
    }

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">
            <div>Loading configurations...</div>
        </div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">System Configuration</h1>
                            <p className="text-sm text-gray-600">Manage platform settings</p>
                        </div>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-all"
                        >
                            ← Back to Dashboard
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="p-6 border-b bg-gray-50">
                        <h2 className="text-lg font-semibold text-gray-900">Core Settings</h2>
                        <p className="text-sm text-gray-500">These settings affect the core behavior of the platform.</p>
                    </div>

                    <div className="p-6 space-y-8">
                        {/* Sync Settings */}
                        <div>
                            <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                                <span className="bg-blue-100 text-blue-800 p-1 rounded mr-2">🔄</span>
                                Data Synchronization
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gray-50 p-4 rounded-lg border">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Auto Sync Time (IST)
                                    </label>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="time"
                                            value={getConfig('auto_sync_time')?.value || '03:00'}
                                            onChange={(e) => handleUpdate('auto_sync_time', e.target.value)}
                                            className="block w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        />
                                        {saving === 'auto_sync_time' && <span className="text-xs text-gray-500">Saving...</span>}
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">Daily schedule for stock data sync</p>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg border">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        First Sync Date
                                    </label>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="date"
                                            value={getConfig('sync.default_start_date')?.value || '2020-01-01'}
                                            onChange={(e) => handleUpdate('sync.default_start_date', e.target.value)}
                                            className="block w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        />
                                        {saving === 'sync.default_start_date' && <span className="text-xs text-gray-500">Saving...</span>}
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">Start date for historical data sync</p>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg border">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Sync Enabled
                                    </label>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Enable automatic daily sync</span>
                                        <button
                                            onClick={() => handleUpdate('sync_enabled', getConfig('sync_enabled')?.value === 'true' ? 'false' : 'true')}
                                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${getConfig('sync_enabled')?.value === 'true' ? 'bg-green-600' : 'bg-gray-200'
                                                }`}
                                        >
                                            <span
                                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${getConfig('sync_enabled')?.value === 'true' ? 'translate-x-5' : 'translate-x-0'
                                                    }`}
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr />



                        <hr />

                        {/* User & Wallet Settings */}
                        <div>
                            <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                                <span className="bg-green-100 text-green-800 p-1 rounded mr-2">💰</span>
                                User & Wallet
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gray-50 p-4 rounded-lg border">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Default Wallet Amount (₹)
                                    </label>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="number"
                                            value={getConfig('default_wallet_amount')?.value || '100000'}
                                            onChange={(e) => handleUpdate('default_wallet_amount', e.target.value)}
                                            className="block w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        />
                                        {saving === 'default_wallet_amount' && <span className="text-xs text-gray-500">Saving...</span>}
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">Starting balance for new users</p>
                                </div>
                            </div>
                        </div>

                        <hr />

                        {/* System Limits */}
                        <div>
                            <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                                <span className="bg-purple-100 text-purple-800 p-1 rounded mr-2">⚙️</span>
                                System Limits
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-gray-50 p-4 rounded-lg border">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Rate Limit (req/min)
                                    </label>
                                    <input
                                        type="number"
                                        value={getConfig('rate_limit_per_minute')?.value || '100'}
                                        onChange={(e) => handleUpdate('rate_limit_per_minute', e.target.value)}
                                        className="block w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg border">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Response Size Limit (MB)
                                    </label>
                                    <input
                                        type="number"
                                        value={getConfig('response_size_limit_mb')?.value || '5'}
                                        onChange={(e) => handleUpdate('response_size_limit_mb', e.target.value)}
                                        className="block w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg border">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Backtest Retention (Days)
                                    </label>
                                    <input
                                        type="text"
                                        value={getConfig('backtest_retention_days')?.value || 'null'}
                                        onChange={(e) => handleUpdate('backtest_retention_days', e.target.value)}
                                        placeholder="null (forever)"
                                        className="block w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <hr />

                        {/* Advanced Settings */}
                        <div>
                            <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                                <span className="bg-red-100 text-red-800 p-1 rounded mr-2">🔧</span>
                                Advanced
                            </h3>
                            <div className="bg-gray-50 p-4 rounded-lg border">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Maintenance Mode
                                        </label>
                                        <p className="text-xs text-gray-500">Disable API access for all users</p>
                                    </div>
                                    <button
                                        onClick={() => handleUpdate('maintenance_mode', getConfig('maintenance_mode')?.value === 'true' ? 'false' : 'true')}
                                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${getConfig('maintenance_mode')?.value === 'true' ? 'bg-red-600' : 'bg-gray-200'
                                            }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${getConfig('maintenance_mode')?.value === 'true' ? 'translate-x-5' : 'translate-x-0'
                                                }`}
                                        />
                                    </button>
                                </div>

                                <div className="space-y-3 pt-3 border-t">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Go Service URL</label>
                                        <input
                                            type="text"
                                            value={getConfig('go_service_url')?.value || ''}
                                            onChange={(e) => handleUpdate('go_service_url', e.target.value)}
                                            className="block w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md text-sm font-mono"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr />

                        {/* Admin Permissions (Superadmin Only) */}
                        {user?.role === 'superadmin' && (
                            <div>
                                <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                                    <span className="bg-yellow-100 text-yellow-800 p-1 rounded mr-2">🛡️</span>
                                    Admin Permissions
                                </h3>
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="bg-gray-50 p-4 rounded-lg border">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Admin Can Manage Config
                                        </label>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">Allow admins to change system config</span>
                                            <button
                                                onClick={() => handleUpdate('ADMIN_CAN_MANAGE_CONFIG', getConfig('ADMIN_CAN_MANAGE_CONFIG')?.value === 'true' ? 'false' : 'true')}
                                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${getConfig('ADMIN_CAN_MANAGE_CONFIG')?.value === 'true' ? 'bg-green-600' : 'bg-gray-200'
                                                    }`}
                                            >
                                                <span
                                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${getConfig('ADMIN_CAN_MANAGE_CONFIG')?.value === 'true' ? 'translate-x-5' : 'translate-x-0'
                                                        }`}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
