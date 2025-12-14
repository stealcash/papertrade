'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { logout } from '@/store/slices/authSlice';

export default function AdminSyncPage() {
    const router = useRouter();
    const dispatch = useDispatch();
    const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
    const [mounted, setMounted] = useState(false);

    const [syncType, setSyncType] = useState('stock');
    const [syncMode, setSyncMode] = useState('normal');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [instruments, setInstruments] = useState('');
    const [runSyncImmediately, setRunSyncImmediately] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'superadmin')) {
            router.push('/login');
        }
    }, [isAuthenticated, user, mounted, router]);

    const handleLogout = () => {
        dispatch(logout());
        router.push('/login');
    };

    const handleTriggerSync = async () => {
        setLoading(true);
        setMessage('');

        try {
            const token = localStorage.getItem('admin_token');
            const endpoint = syncMode === 'normal' ? '/sync/trigger-normal/' : '/sync/trigger-hard/';

            const body: any = { sync_type: syncType };
            if (syncMode === 'hard') {
                body.start_date = startDate;
                body.end_date = endDate;
                if (instruments.trim()) {
                    body.instruments = instruments.split(',').map(s => s.trim());
                }
            }

            // Add run_sync parameter if checkbox is checked
            if (runSyncImmediately) {
                body.run_sync = true;
            }

            const response = await fetch(`http://localhost:8000/api/v1${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            if (data.status === 'success') {
                setMessage(`✅ ${data.message} (Task ID: ${data.data.task_id})`);
            } else {
                setMessage(`❌ ${data.message}`);
            }
        } catch {
            setMessage('❌ Error triggering sync');
        } finally {
            setLoading(false);
        }
    };

    if (!mounted || !isAuthenticated) return null;

    const isSuperadmin = user?.role === 'superadmin';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <div className="p-6 space-y-6">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Data Synchronization</h1>

                    <div className="bg-white dark:bg-gray-900 rounded-lg p-6 space-y-6 shadow-sm border border-gray-200 dark:border-gray-700">
                        {/* Sync Mode Selection */}
                        <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Sync Mode</label>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setSyncMode('normal')}
                                    className={`px-6 py-3 rounded-lg font-medium transition-all ${syncMode === 'normal'
                                        ? 'bg-purple-600 text-white shadow-md'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    Normal Sync
                                    <div className="text-xs mt-1 opacity-75">Uses last synced timestamp</div>
                                </button>
                                <button
                                    onClick={() => setSyncMode('hard')}
                                    className={`px-6 py-3 rounded-lg font-medium transition-all ${syncMode === 'hard'
                                        ? 'bg-orange-600 text-white shadow-md'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    Hard Sync
                                    <div className="text-xs mt-1 opacity-75">Custom date range</div>
                                </button>
                            </div>
                        </div>

                        {/* Sync Type */}
                        <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Data Type</label>
                            <select
                                value={syncType}
                                onChange={(e) => setSyncType(e.target.value)}
                                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 px-4 py-2 rounded-lg w-full max-w-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                            >
                                <option value="stock">Stocks</option>
                                <option value="sector">Sectors</option>
                                <option value="option">Options</option>
                            </select>
                        </div>

                        {/* Hard Sync Fields */}
                        {syncMode === 'hard' && (
                            <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4 animate-fade-in">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Start Date</label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 px-4 py-2 rounded-lg w-full focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">End Date</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 px-4 py-2 rounded-lg w-full focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                                        Instruments (comma-separated, leave empty for all)
                                    </label>
                                    <input
                                        type="text"
                                        value={instruments}
                                        onChange={(e) => setInstruments(e.target.value)}
                                        placeholder="RELIANCE, TCS, INFY"
                                        className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 px-4 py-2 rounded-lg w-full focus:ring-2 focus:ring-orange-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                        Example: RELIANCE, TCS, INFY (or leave empty to sync all)
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Run Sync Immediately Checkbox */}
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={runSyncImmediately}
                                    onChange={(e) => setRunSyncImmediately(e.target.checked)}
                                    className="w-5 h-5 rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-green-600 focus:ring-green-500"
                                />
                                <div>
                                    <span className="text-gray-900 dark:text-white font-medium">Run Sync Immediately</span>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {runSyncImmediately
                                            ? '✓ Sync will run directly (synchronous, reliable, no background worker needed)'
                                            : 'Sync will use background worker (requires Redis connection)'}
                                    </p>
                                </div>
                            </label>
                        </div>

                        {/* Trigger Button */}
                        <button
                            onClick={handleTriggerSync}
                            disabled={loading || (syncMode === 'hard' && (!startDate || !endDate))}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-all shadow-sm"
                        >
                            {loading ? 'Triggering Sync...' : `Trigger ${syncMode === 'normal' ? 'Normal' : 'Hard'} Sync`}
                        </button>

                        {/* Message */}
                        {message && (
                            <div className={`p-4 rounded-lg ${message.startsWith('✅') ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-get-800' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                                }`}>
                                {message}
                            </div>
                        )}
                    </div>

                    {/* Info Panel */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <h3 className="text-blue-800 dark:text-blue-300 font-medium mb-2">💡 Sync Modes Explained</h3>
                        <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                            <li><strong>Normal Sync:</strong> Fetches data from the last sync timestamp to today</li>
                            <li><strong>Hard Sync:</strong> Fetches data for a specific date range, optionally for selected instruments only</li>
                            <li><strong>Run Immediately:</strong> Executes sync directly in API request (reliable, no Redis issues). Uncheck to use background worker</li>
                        </ul>
                    </div>
                </div>
            </main>
        </div>
    );
}
