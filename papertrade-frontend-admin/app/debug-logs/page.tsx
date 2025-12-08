'use client';

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { RootState } from '@/store';
import { logout } from '@/store/slices/authSlice';
import apiClient from '@/lib/api';

interface LogFile {
    filename: string;
    size_bytes: number;
    modified_at: string;
}

interface LogContent {
    filename: string;
    lines: any[];
}

export default function DebugLogsPage() {
    const router = useRouter();
    const dispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const [logs, setLogs] = useState<LogFile[]>([]);
    const [selectedLog, setSelectedLog] = useState<LogContent | null>(null);
    const [loading, setLoading] = useState(true);
    const [contentLoading, setContentLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user && user.role !== 'superadmin') {
            router.push('/dashboard');
            return;
        }
        fetchLogs();
    }, [user, router]);

    const fetchLogs = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.get('/sync/external-logs/');
            if (response.data.status === 'success') {
                setLogs(response.data.data);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch logs');
        } finally {
            setLoading(false);
        }
    };

    const viewLog = async (filename: string) => {
        setContentLoading(true);
        try {
            const response = await apiClient.get(`/sync/external-logs/${filename}/`);
            if (response.data.status === 'success') {
                setSelectedLog(response.data.data);
            }
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to fetch log content');
        } finally {
            setContentLoading(false);
        }
    };

    const handleLogout = () => {
        dispatch(logout());
        router.push('/login');
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const isSuperadmin = user?.role === 'superadmin';

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                                <span className="text-xl font-bold text-white">PT</span>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">System Logs</h1>
                                <p className="text-sm text-gray-600">{user?.email} • {user?.role}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Navigation */}
            <nav className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex space-x-8">
                        <button onClick={() => router.push('/dashboard')} className="px-4 py-4 text-gray-600 hover:text-blue-600 font-semibold">Dashboard</button>
                        <button onClick={() => router.push('/users')} className="px-4 py-4 text-gray-600 hover:text-blue-600 font-semibold">User Management</button>
                        {(isSuperadmin || user?.can_manage_stocks) && (
                            <>
                                <button onClick={() => router.push('/stocks')} className="px-4 py-4 text-gray-600 hover:text-blue-600 font-semibold">Stocks</button>
                                <button onClick={() => router.push('/sectors')} className="px-4 py-4 text-gray-600 hover:text-blue-600 font-semibold">Sectors</button>
                            </>
                        )}
                        <button onClick={() => router.push('/admins')} className="px-4 py-4 text-gray-600 hover:text-blue-600 font-semibold">Admins</button>
                        {isSuperadmin && <button onClick={() => router.push('/tables')} className="px-4 py-4 text-gray-600 hover:text-blue-600 font-semibold">Tables</button>}
                        {isSuperadmin && <button onClick={() => router.push('/sync')} className="px-4 py-4 text-gray-600 hover:text-blue-600 font-semibold">Data Sync</button>}
                        {isSuperadmin && <button onClick={() => router.push('/debug-logs')} className="px-4 py-4 text-blue-600 border-b-2 border-blue-600 font-semibold">Logs</button>}
                        {(isSuperadmin || user?.can_manage_config) && <button onClick={() => router.push('/config')} className="px-4 py-4 text-gray-600 hover:text-blue-600 font-semibold">System Config</button>}
                    </div>
                </div>
            </nav>

            <div className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">External API Logs</h2>
                            <p className="text-gray-500">Debug requests to the Go Service.</p>
                        </div>
                        <button
                            onClick={fetchLogs}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            Refresh List
                        </button>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            <p>{error}</p>
                        </div>
                    )}

                    {!selectedLog ? (
                        // Log List View
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <h2 className="font-semibold text-gray-900">Available Log Files</h2>
                                <span className="text-xs text-gray-500">Auto-deleted after 2 days</span>
                            </div>

                            {loading ? (
                                <div className="p-8 text-center text-gray-500">Loading logs...</div>
                            ) : logs.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">No logs found.</div>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-500">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">Filename</th>
                                            <th className="px-6 py-3 font-medium">Size</th>
                                            <th className="px-6 py-3 font-medium">Last Modified</th>
                                            <th className="px-6 py-3 font-medium">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {logs.map((log) => (
                                            <tr key={log.filename} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                    {log.filename}
                                                </td>
                                                <td className="px-6 py-4 text-gray-600 font-mono">
                                                    {formatBytes(log.size_bytes)}
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    {new Date(log.modified_at).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => viewLog(log.filename)}
                                                        className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
                                                    >
                                                        View Content
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    ) : (
                        // Log Detail View
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[calc(100vh-12rem)]">
                            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setSelectedLog(null)}
                                        className="p-1 hover:bg-gray-200 rounded text-gray-500"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                    <div>
                                        <h2 className="font-semibold text-gray-900 tracking-tight">{selectedLog.filename}</h2>
                                        <p className="text-xs text-gray-500">Loaded {selectedLog.lines.length} entries</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        const blob = new Blob([JSON.stringify(selectedLog.lines, null, 2)], { type: 'application/json' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = selectedLog.filename;
                                        a.click();
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    Download JSON
                                </button>
                            </div>

                            <div className="flex-1 overflow-auto bg-gray-900 text-gray-300 font-mono text-xs p-4 space-y-4">
                                {contentLoading ? (
                                    <div className="text-center py-10">Loading content...</div>
                                ) : (
                                    selectedLog.lines.map((line, idx) => (
                                        <div key={idx} className="border-b border-gray-800 pb-2 mb-2 last:border-0">
                                            {line.timestamp && (
                                                <div className="text-gray-500 mb-1">[{line.timestamp}] {line.method} {line.url} ({line.duration_ms}ms) - {line.status}</div>
                                            )}
                                            <div className="whitespace-pre-wrap break-all text-green-400">
                                                {line.response ? (
                                                    typeof line.response === 'object' ?
                                                        JSON.stringify(line.response, null, 2) : line.response
                                                ) : JSON.stringify(line, null, 2)}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
