'use client';

import { useState } from 'react';

export default function AdminSyncPage() {
    const [syncType, setSyncType] = useState('stock');
    const [syncMode, setSyncMode] = useState('normal');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [instruments, setInstruments] = useState('');
    const [runSyncImmediately, setRunSyncImmediately] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

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

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-bold text-white">Data Synchronization</h1>

            <div className="bg-slate-800 rounded-lg p-6 space-y-6">
                {/* Sync Mode Selection */}
                <div>
                    <label className="block text-sm text-slate-400 mb-2">Sync Mode</label>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setSyncMode('normal')}
                            className={`px-6 py-3 rounded-lg font-medium transition-all ${syncMode === 'normal'
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                        >
                            Normal Sync
                            <div className="text-xs mt-1 opacity-75">Uses last synced timestamp</div>
                        </button>
                        <button
                            onClick={() => setSyncMode('hard')}
                            className={`px-6 py-3 rounded-lg font-medium transition-all ${syncMode === 'hard'
                                ? 'bg-orange-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                        >
                            Hard Sync
                            <div className="text-xs mt-1 opacity-75">Custom date range</div>
                        </button>
                    </div>
                </div>

                {/* Sync Type */}
                <div>
                    <label className="block text-sm text-slate-400 mb-2">Data Type</label>
                    <select
                        value={syncType}
                        onChange={(e) => setSyncType(e.target.value)}
                        className="bg-slate-700 text-white px-4 py-2 rounded w-full max-w-xs"
                    >
                        <option value="stock">Stocks</option>
                        <option value="sector">Sectors</option>
                        <option value="option">Options</option>
                    </select>
                </div>

                {/* Hard Sync Fields */}
                {syncMode === 'hard' && (
                    <div className="space-y-4 border-t border-slate-700 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Start Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="bg-slate-700 text-white px-4 py-2 rounded w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">End Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="bg-slate-700 text-white px-4 py-2 rounded w-full"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">
                                Instruments (comma-separated, leave empty for all)
                            </label>
                            <input
                                type="text"
                                value={instruments}
                                onChange={(e) => setInstruments(e.target.value)}
                                placeholder="RELIANCE, TCS, INFY"
                                className="bg-slate-700 text-white px-4 py-2 rounded w-full"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                Example: RELIANCE, TCS, INFY (or leave empty to sync all)
                            </p>
                        </div>
                    </div>
                )}

                {/* Run Sync Immediately Checkbox */}
                <div className="border-t border-slate-700 pt-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={runSyncImmediately}
                            onChange={(e) => setRunSyncImmediately(e.target.checked)}
                            className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-green-600 focus:ring-green-500 focus:ring-offset-slate-800"
                        />
                        <div>
                            <span className="text-white font-medium">Run Sync Immediately</span>
                            <p className="text-xs text-slate-400 mt-0.5">
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
                    className="bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-all"
                >
                    {loading ? 'Triggering Sync...' : `Trigger ${syncMode === 'normal' ? 'Normal' : 'Hard'} Sync`}
                </button>

                {/* Message */}
                {message && (
                    <div className={`p-4 rounded-lg ${message.startsWith('✅') ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                        }`}>
                        {message}
                    </div>
                )}
            </div>

            {/* Info Panel */}
            <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
                <h3 className="text-blue-400 font-medium mb-2">💡 Sync Modes Explained</h3>
                <ul className="text-sm text-blue-200 space-y-1">
                    <li><strong>Normal Sync:</strong> Fetches data from the last sync timestamp to today</li>
                    <li><strong>Hard Sync:</strong> Fetches data for a specific date range, optionally for selected instruments only</li>
                    <li><strong>Run Immediately:</strong> Executes sync directly in API request (reliable, no Redis issues). Uncheck to use background worker</li>
                </ul>
            </div>
        </div>
    );
}
