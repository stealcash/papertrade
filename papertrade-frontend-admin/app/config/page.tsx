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
    const [tempConfigs, setTempConfigs] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [saving, setSaving] = useState(false);

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
            const data = response.data.data || [];
            setConfigs(data);

            // Initialize temp state
            const initialTemp: Record<string, string> = {};
            data.forEach((c: any) => {
                initialTemp[c.key] = c.value;
            });
            setTempConfigs(initialTemp);
        } catch (error) {
            console.error('Failed to fetch configs:', error);
            setConfigs([]);
        } finally {
            setLoading(false);
        }
    };

    const handleLocalUpdate = (key: string, value: string) => {
        setTempConfigs(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleBatchSave = async () => {
        setSaving(true);
        try {
            const changedConfigs = Object.entries(tempConfigs)
                .filter(([key, value]) => {
                    const original = configs.find(c => c.key === key);
                    return original ? original.value !== value : true;
                })
                .map(([key, value]) => ({ key, value }));

            if (changedConfigs.length === 0) {
                alert('No changes to save');
                return;
            }

            await apiClient.post('/admin-panel/config/batch-update/', {
                configs: changedConfigs
            });

            // Update original configs state
            setConfigs(configs.map(c => ({
                ...c,
                value: tempConfigs[c.key] || c.value
            })));

            alert('All configurations saved successfully');
        } catch (error) {
            console.error('Failed to batch update configs:', error);
            alert('Failed to save configurations');
        } finally {
            setSaving(false);
        }
    };

    const hasChanges = () => {
        return Object.entries(tempConfigs).some(([key, value]) => {
            const original = configs.find(c => c.key === key);
            return original ? original.value !== value : false;
        });
    };

    if (!isAuthenticated || !mounted) {
        return <div className="min-h-screen flex items-center justify-center">
            <div>Loading...</div>
        </div>;
    }

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
            <div className="text-gray-600 dark:text-gray-400">Loading configurations...</div>
        </div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
            {/* Header */}
            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-6 flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Configuration</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Manage platform settings</p>
                    </div>
                    {hasChanges() && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium mr-4">You have unsaved changes</span>
                        </div>
                    )}
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
                    <div className="p-6 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Core Settings</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">These settings affect the core behavior of the platform.</p>
                    </div>

                    <div className="p-6 space-y-8">
                        {/* Sync Settings */}
                        <div>
                            <h3 className="text-md font-medium text-gray-900 dark:text-gray-200 mb-4 flex items-center">
                                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 p-1 rounded mr-2">🔄</span>
                                Data Synchronization
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Auto Sync Time (IST)
                                    </label>
                                    <input
                                        type="time"
                                        value={tempConfigs['auto_sync_time'] || '03:00'}
                                        onChange={(e) => handleLocalUpdate('auto_sync_time', e.target.value)}
                                        className="block w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Daily schedule for stock data sync</p>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        First Sync Date
                                    </label>
                                    <input
                                        type="date"
                                        value={tempConfigs['sync.default_start_date'] || '2020-01-01'}
                                        onChange={(e) => handleLocalUpdate('sync.default_start_date', e.target.value)}
                                        className="block w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Start date for historical data sync</p>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Sync Enabled
                                    </label>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Enable automatic daily sync</span>
                                        <button
                                            onClick={() => handleLocalUpdate('sync_enabled', tempConfigs['sync_enabled'] === 'true' ? 'false' : 'true')}
                                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${tempConfigs['sync_enabled'] === 'true' ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-600'}`}
                                        >
                                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${tempConfigs['sync_enabled'] === 'true' ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Option Price Sync Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={tempConfigs['option_price_sync_start_date'] || '2024-01-01'}
                                        onChange={(e) => handleLocalUpdate('option_price_sync_start_date', e.target.value)}
                                        className="block w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Start date for option data sync (indices only)</p>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Option Strike Range - Index (%)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        min="1"
                                        max="20"
                                        value={tempConfigs['OPTION_STRIKE_RANGE_INDEX'] || '10'}
                                        onChange={(e) => handleLocalUpdate('OPTION_STRIKE_RANGE_INDEX', e.target.value)}
                                        className="block w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
                                    />
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">±% of spot for NIFTY, BANKNIFTY, etc.</p>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Option Strike Range - Stock (%)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        min="1"
                                        max="20"
                                        value={tempConfigs['OPTION_STRIKE_RANGE_STOCK'] || '5'}
                                        onChange={(e) => handleLocalUpdate('OPTION_STRIKE_RANGE_STOCK', e.target.value)}
                                        className="block w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
                                    />
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">±% of spot for individual stocks</p>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700 col-span-1 md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Option Price Lookback Days
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="90"
                                        value={tempConfigs['option_sync_lookback_days'] || '30'}
                                        onChange={(e) => handleLocalUpdate('option_sync_lookback_days', e.target.value)}
                                        className="block w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Number of days of historical data to fetch for each option expiry</p>
                                </div>
                            </div>
                        </div>

                        <hr className="dark:border-gray-700" />

                        {/* User & Wallet Settings */}
                        <div>
                            <h3 className="text-md font-medium text-gray-900 dark:text-gray-200 mb-4 flex items-center">
                                <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 p-1 rounded mr-2">💰</span>
                                User & Wallet
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Default Wallet Amount (₹)
                                    </label>
                                    <input
                                        type="number"
                                        value={tempConfigs['default_wallet_amount'] || '100000'}
                                        onChange={(e) => handleLocalUpdate('default_wallet_amount', e.target.value)}
                                        className="block w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
                                    />
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Starting balance for new users</p>
                                </div>
                            </div>
                        </div>

                        <hr className="dark:border-gray-700" />

                        {/* System Limits */}
                        <div>
                            <h3 className="text-md font-medium text-gray-900 dark:text-gray-200 mb-4 flex items-center">
                                <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 p-1 rounded mr-2">⚙️</span>
                                System Limits
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Rate Limit (req/min)
                                    </label>
                                    <input
                                        type="number"
                                        value={tempConfigs['rate_limit_per_minute'] || '100'}
                                        onChange={(e) => handleLocalUpdate('rate_limit_per_minute', e.target.value)}
                                        className="block w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Response Size Limit (MB)
                                    </label>
                                    <input
                                        type="number"
                                        value={tempConfigs['response_size_limit_mb'] || '5'}
                                        onChange={(e) => handleLocalUpdate('response_size_limit_mb', e.target.value)}
                                        className="block w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Backtest Retention (Days)
                                    </label>
                                    <input
                                        type="text"
                                        value={tempConfigs['backtest_retention_days'] || 'null'}
                                        onChange={(e) => handleLocalUpdate('backtest_retention_days', e.target.value)}
                                        className="block w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <hr className="dark:border-gray-700" />

                        {/* Advanced Settings */}
                        <div>
                            <h3 className="text-md font-medium text-gray-900 dark:text-gray-200 mb-4 flex items-center">
                                <span className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 p-1 rounded mr-2">🔧</span>
                                Advanced
                            </h3>
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Maintenance Mode
                                        </label>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Disable API access for all users</p>
                                    </div>
                                    <button
                                        onClick={() => handleLocalUpdate('maintenance_mode', tempConfigs['maintenance_mode'] === 'true' ? 'false' : 'true')}
                                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${tempConfigs['maintenance_mode'] === 'true' ? 'bg-red-600' : 'bg-gray-200 dark:bg-gray-600'}`}
                                    >
                                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${tempConfigs['maintenance_mode'] === 'true' ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between mb-4 pt-4 border-t dark:border-gray-700">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Backtest Execution Mode
                                        </label>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Method for running backtests</p>
                                    </div>
                                    <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                                        <button
                                            onClick={() => handleLocalUpdate('BACKTEST_EXECUTION_MODE', 'background')}
                                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${tempConfigs['BACKTEST_EXECUTION_MODE'] !== 'direct' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'}`}
                                        >
                                            Background
                                        </button>
                                        <button
                                            onClick={() => handleLocalUpdate('BACKTEST_EXECUTION_MODE', 'direct')}
                                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${tempConfigs['BACKTEST_EXECUTION_MODE'] === 'direct' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'}`}
                                        >
                                            Direct
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-3 border-t dark:border-gray-700">
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Go Service URL</label>
                                    <input
                                        type="text"
                                        value={tempConfigs['go_service_url'] || ''}
                                        onChange={(e) => handleLocalUpdate('go_service_url', e.target.value)}
                                        className="block w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md text-sm font-mono"
                                    />
                                </div>
                            </div>
                        </div>

                        <hr className="dark:border-gray-700" />

                        {/* Admin Permissions (Superadmin Only) */}
                        {user?.role === 'superadmin' && (
                            <div>
                                <h3 className="text-md font-medium text-gray-900 dark:text-gray-200 mb-4 flex items-center">
                                    <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 p-1 rounded mr-2">🛡️</span>
                                    Admin Permissions
                                </h3>
                                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Allow admins to change system config</span>
                                        <button
                                            onClick={() => handleLocalUpdate('ADMIN_CAN_MANAGE_CONFIG', tempConfigs['ADMIN_CAN_MANAGE_CONFIG'] === 'true' ? 'false' : 'true')}
                                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${tempConfigs['ADMIN_CAN_MANAGE_CONFIG'] === 'true' ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-600'}`}
                                        >
                                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${tempConfigs['ADMIN_CAN_MANAGE_CONFIG'] === 'true' ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Sticky Save Button */}
            <div className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t dark:border-gray-700 p-4 shadow-2xl transition-transform duration-300 ${hasChanges() ? 'translate-y-0' : 'translate-y-full'}`}>
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{Object.entries(tempConfigs).filter(([k, v]) => configs.find(c => c.key === k)?.value !== v).length}</span> settings modified
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={fetchConfigs}
                            className="px-6 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                        >
                            Reset
                        </button>
                        <button
                            onClick={handleBatchSave}
                            disabled={saving}
                            className="px-8 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Saving...
                                </>
                            ) : 'Save All Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
