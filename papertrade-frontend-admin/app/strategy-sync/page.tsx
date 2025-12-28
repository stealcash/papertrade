'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { logout } from '@/store/slices/authSlice';

export default function StrategySyncPage() {
    const router = useRouter();
    const dispatch = useDispatch();
    const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
    const [mounted, setMounted] = useState(false);

    const [syncMode, setSyncMode] = useState('normal');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [instruments, setInstruments] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Strategy State
    const [strategies, setStrategies] = useState([]);
    const [selectedStrategy, setSelectedStrategy] = useState('');

    useEffect(() => {
        setMounted(true);
    }, []);

    // Fetch Strategies
    useEffect(() => {
        if (!mounted || !isAuthenticated) return;
        import('@/lib/api').then(({ strategiesAPI }) => {
            strategiesAPI.getAllMasters()
                .then(res => setStrategies(res.data?.data || []))
                .catch(console.error);
        });
    }, [mounted, isAuthenticated]);

    useEffect(() => {
        if (!mounted) return;
        if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'superadmin')) {
            router.push('/login');
        }
    }, [isAuthenticated, user, mounted, router]);

    const handleTriggerSync = async () => {
        setLoading(true);
        setMessage('');

        if (!selectedStrategy) {
            setMessage('❌ Please select a strategy');
            setLoading(false);
            return;
        }

        try {
            const { strategiesAPI } = await import('@/lib/api');

            const payload: any = {
                type: 'stock',
                strategy: selectedStrategy,
                mode: syncMode,
            };

            if (syncMode === 'hard') {
                payload.start_date = startDate;
                payload.end_date = endDate;
            }

            if (instruments) {
                payload.symbols = instruments.split(',').map(s => s.trim());
                delete payload.id;
            } else {
                payload.all_stocks = true;
            }

            const res = await strategiesAPI.sync(payload);
            if (res.data.status === 'success' || res.data.success) {
                setMessage(`✅ Strategy Signals Generated: ${res.data.data?.signals_generated || '0'}`);
            } else {
                setMessage(`❌ ${res.data.message}`);
            }
        } catch (e: any) {
            setMessage(`❌ Error triggering sync: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (!mounted || !isAuthenticated) return null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <div className="p-6 space-y-6">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Strategy Signal Sync</h1>
                    <p className="text-gray-600 dark:text-gray-400">Generate backtested strategy signals for stocks.</p>

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
                                    <div className="text-xs mt-1 opacity-75">Append new signals</div>
                                </button>
                                <button
                                    onClick={() => setSyncMode('hard')}
                                    className={`px-6 py-3 rounded-lg font-medium transition-all ${syncMode === 'hard'
                                        ? 'bg-orange-600 text-white shadow-md'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    Hard Sync
                                    <div className="text-xs mt-1 opacity-75">Recalculate range</div>
                                </button>
                            </div>
                        </div>

                        {/* Strategy Selection */}
                        <div className="animate-fade-in">
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Select Strategy</label>
                            <select
                                value={selectedStrategy}
                                onChange={(e) => setSelectedStrategy(e.target.value)}
                                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 px-4 py-2 rounded-lg w-full max-w-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                            >
                                <option value="">-- Select Strategy --</option>
                                {strategies.map((strat: any) => (
                                    <option key={strat.id} value={strat.code}>
                                        {strat.name} ({strat.code})
                                    </option>
                                ))}
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
                            </div>
                        )}

                        {/* Instruments */}
                        <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                                Instruments (comma-separated, leave empty for all)
                            </label>
                            <input
                                type="text"
                                value={instruments}
                                onChange={(e) => setInstruments(e.target.value)}
                                placeholder="RELIANCE, TCS, INFY"
                                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 px-4 py-2 rounded-lg w-full focus:ring-2 focus:ring-purple-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500"
                            />
                        </div>

                        {/* Trigger Button */}
                        <button
                            onClick={handleTriggerSync}
                            disabled={loading || (syncMode === 'hard' && (!startDate || !endDate))}
                            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-all shadow-sm"
                        >
                            {loading ? 'Processing...' : `Generate Signals`}
                        </button>

                        {/* Message */}
                        {message && (
                            <div className={`p-4 rounded-lg ${message.startsWith('✅') ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-get-800' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                                }`}>
                                {message}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
