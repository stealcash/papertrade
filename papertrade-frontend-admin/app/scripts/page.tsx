'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import apiClient from '@/lib/api';

export default function ScriptRunnerPage() {
    const router = useRouter();
    const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
    const [mounted, setMounted] = useState(false);
    const [script, setScript] = useState('');
    const [output, setOutput] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
    }, [isAuthenticated, user, mounted, router]);

    const handleExecute = async () => {
        if (!script.trim()) return;

        setLoading(true);
        setOutput(null);
        setError(null);

        try {
            const response = await apiClient.post('/admin-panel/run-script/', { script });
            const data = response.data.data;

            if (data.status === 'success') {
                setOutput(data.output || '(No output)');
            } else {
                setOutput(data.output);
                setError(data.error);
            }
        } catch (err: any) {
            console.error('Script execution failed:', err);
            setError(err.response?.data?.message || err.message || 'Execution failed');
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthenticated || user?.role !== 'superadmin' || !mounted) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
            <div className="text-gray-600 dark:text-gray-400">Loading...</div>
        </div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
            <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-6 flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Script Runner (Shell+)</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Execute Python scripts with full model context (Superadmin Only)</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
                    {/* Code Editor */}
                    <div className="flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
                            <h2 className="font-semibold text-gray-700 dark:text-gray-200">Python Script</h2>
                            <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                                Context: User, Stock, OptionDailyData + all models
                            </span>
                        </div>
                        <div className="flex-1 relative">
                            <textarea
                                value={script}
                                onChange={(e) => setScript(e.target.value)}
                                placeholder="# Example:\nstocks = Stock.objects.all()[:5]\nfor s in stocks:\n    print(s.symbol, s.name)"
                                className="absolute inset-0 w-full h-full p-4 font-mono text-sm bg-gray-900 text-green-400 resize-none focus:outline-none"
                                spellCheck="false"
                            />
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end">
                            <button
                                onClick={handleExecute}
                                disabled={loading || !script.trim()}
                                className={`px-6 py-2 rounded-lg font-bold text-white transition-all flex items-center gap-2 ${loading || !script.trim()
                                        ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                                        : 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200 dark:shadow-none'
                                    }`}
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Running...
                                    </>
                                ) : (
                                    <>Run Script (Cmd+Enter)</>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Output Console */}
                    <div className="flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                            <h2 className="font-semibold text-gray-700 dark:text-gray-200">Output / Console</h2>
                        </div>
                        <div className="flex-1 bg-black p-4 overflow-y-auto font-mono text-sm">
                            {output && (
                                <div className="mb-4">
                                    <div className="text-gray-500 mb-1 text-xs uppercase tracking-wider">Standard Output</div>
                                    <pre className="text-gray-300 whitespace-pre-wrap font-mono">{output}</pre>
                                </div>
                            )}

                            {error && (
                                <div className="mt-4 pt-4 border-t border-gray-800">
                                    <div className="text-red-500 mb-1 text-xs uppercase tracking-wider">Traceback / Error</div>
                                    <pre className="text-red-400 whitespace-pre-wrap font-mono">{error}</pre>
                                </div>
                            )}

                            {!output && !error && (
                                <div className="text-gray-600 italic text-center mt-20">
                                    Ready to execute. Output will appear here.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
