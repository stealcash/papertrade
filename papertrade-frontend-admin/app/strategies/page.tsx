'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { PlusIcon, PencilIcon, TrashIcon, XIcon, CheckCircleIcon, InformationCircleIcon } from '@/components/icons';

// Simple Alert Component
const Alert = ({ type, message, onClose }: { type: 'success' | 'error', message: string, onClose: () => void }) => (
    <div className={`p-4 rounded-md mb-4 flex justify-between items-center ${type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
        <span>{message}</span>
        <button onClick={onClose} className="text-sm font-semibold hover:opacity-75">✕</button>
    </div>
);

export default function StrategiesPage() {
    const router = useRouter();
    const dispatch = useDispatch();
    const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
    const [mounted, setMounted] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    const [strategies, setStrategies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentStrategy, setCurrentStrategy] = useState<any>({
        name: '',
        code: '',
        description: '',
        type: 'MANUAL',
        logic: '',
        status: 'active'
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        if (!isAuthenticated) router.push('/login');
        else fetchStrategies();
    }, [mounted, isAuthenticated]);

    const fetchStrategies = async () => {
        setLoading(true);
        try {
            const { strategiesAPI } = await import('@/lib/api');
            const res = await strategiesAPI.getAllMasters();
            setStrategies(res.data?.data || []);
        } catch (err) {
            console.error(err);
            setError('Failed to fetch strategies');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setCurrentStrategy({
            name: '',
            code: '',
            description: '',
            type: 'MANUAL',
            logic: '',
            status: 'active'
        });
        setIsEditMode(false);
        setIsModalOpen(true);
        setError('');
        setSuccessMessage('');
    };

    const handleOpenEdit = (strategy: any) => {
        setCurrentStrategy(strategy);
        setIsEditMode(true);
        setIsModalOpen(true);
        setError('');
        setSuccessMessage('');
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this strategy?')) return;
        try {
            const { strategiesAPI } = await import('@/lib/api');
            await strategiesAPI.deleteMaster(id);
            setSuccessMessage('Strategy deleted successfully');
            fetchStrategies();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to delete strategy');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        try {
            const { strategiesAPI } = await import('@/lib/api');
            if (isEditMode) {
                await strategiesAPI.updateMaster(currentStrategy.id, currentStrategy);
                setSuccessMessage('Strategy updated successfully');
            } else {
                await strategiesAPI.createMaster(currentStrategy);
                setSuccessMessage('Strategy created successfully');
            }
            setIsModalOpen(false);
            fetchStrategies();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save strategy');
        }
    };

    if (!mounted || !isAuthenticated) return null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Strategy Management</h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Create and manage trading strategies (Manual/Auto).
                        </p>
                    </div>
                    <button
                        onClick={handleOpenCreate}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Create Strategy
                    </button>
                </div>

                {successMessage && <Alert type="success" message={successMessage} onClose={() => setSuccessMessage('')} />}
                {error && <Alert type="error" message={error} onClose={() => setError('')} />}

                {/* Table */}
                <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
                    {loading ? (
                        <div className="p-12 text-center text-gray-500">Loading strategies...</div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Code</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {strategies.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No strategies found.</td></tr>
                                ) : (
                                    strategies.map((strategy: any) => (
                                        <tr key={strategy.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">{strategy.name}</div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">{strategy.description}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                                    {strategy.code}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${strategy.type === 'AUTO' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                                                    }`}>
                                                    {strategy.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${strategy.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                    }`}>
                                                    {strategy.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button onClick={() => handleOpenEdit(strategy)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4">
                                                    <PencilIcon className="h-5 w-5" />
                                                </button>
                                                <button onClick={() => handleDelete(strategy.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsModalOpen(false)}></div>

                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <div className="sm:flex sm:items-start">
                                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                                                {isEditMode ? 'Edit Strategy' : 'Create Strategy'}
                                            </h3>
                                            <div className="mt-4 space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Strategy Name</label>
                                                    <input
                                                        type="text"
                                                        value={currentStrategy.name}
                                                        onChange={e => setCurrentStrategy({ ...currentStrategy, name: e.target.value })}
                                                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Code (Unique)</label>
                                                    <input
                                                        type="text"
                                                        value={currentStrategy.code}
                                                        onChange={e => setCurrentStrategy({ ...currentStrategy, code: e.target.value.toUpperCase() })}
                                                        disabled={isEditMode}
                                                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                                                    <select
                                                        value={currentStrategy.type}
                                                        onChange={e => setCurrentStrategy({ ...currentStrategy, type: e.target.value })}
                                                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white"
                                                    >
                                                        <option value="MANUAL">MANUAL (Python Code)</option>
                                                        <option value="AUTO">AUTO (Dynamic Logic)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                                                    <textarea
                                                        value={currentStrategy.description}
                                                        onChange={e => setCurrentStrategy({ ...currentStrategy, description: e.target.value })}
                                                        rows={3}
                                                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white"
                                                    />
                                                </div>
                                                {currentStrategy.type === 'AUTO' && (
                                                    <div>
                                                        <div className="mb-2">
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                Load Template
                                                            </label>
                                                            <select
                                                                onChange={(e) => {
                                                                    const tmpl = e.target.value;
                                                                    let code = '';
                                                                    if (tmpl === 'ONE_DAY') {
                                                                        code = `EXPECTED: CLOSE + (CLOSE - CLOSE_1)`;
                                                                    } else if (tmpl === 'THREE_DAY') {
                                                                        code = `EXPECTED: CLOSE + ((CLOSE - CLOSE_1) + (CLOSE_1 - CLOSE_2)) / 2 if ((CLOSE > CLOSE_1) == (CLOSE_1 > CLOSE_2)) else None`;
                                                                    }
                                                                    if (code) {
                                                                        setCurrentStrategy({ ...currentStrategy, logic: code });
                                                                    }
                                                                }}
                                                                className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1 px-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
                                                            >
                                                                <option value="">Select a template...</option>
                                                                <option value="ONE_DAY">One Day Trend (Momentum)</option>
                                                                <option value="THREE_DAY">Three Day Trend (Avg Momentum)</option>
                                                            </select>
                                                        </div>

                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            Logic Expression
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowHelp(!showHelp)}
                                                                className="ml-2 text-blue-600 hover:text-blue-800 focus:outline-none"
                                                                title="Click for syntax help"
                                                            >
                                                                <InformationCircleIcon className="h-5 w-5 inline" />
                                                            </button>
                                                        </label>

                                                        {showHelp && (
                                                            <div className="mb-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md text-sm text-blue-800 dark:text-blue-200 border border-blue-100 dark:border-blue-800">
                                                                <p className="font-semibold mb-1">Syntax Format:</p>
                                                                <pre className="text-xs bg-white dark:bg-gray-800 p-2 rounded mb-2 border border-blue-100 dark:border-blue-700 overflow-x-auto">
                                                                    {`UP: CLOSE > OPEN
DOWN: CLOSE < OPEN
EXPECTED: CLOSE + (CLOSE - CLOSE_1) if (CLOSE > OPEN) else CLOSE`}
                                                                </pre>
                                                                <p className="font-semibold mb-1">Available Variables:</p>
                                                                <ul className="list-disc list-inside text-xs space-y-1 ml-1">
                                                                    <li><code className="bg-white dark:bg-gray-800 px-1 rounded">CLOSE</code>, <code className="bg-white dark:bg-gray-800 px-1 rounded">OPEN</code>, <code className="bg-white dark:bg-gray-800 px-1 rounded">HIGH</code>, <code className="bg-white dark:bg-gray-800 px-1 rounded">LOW</code>, <code className="bg-white dark:bg-gray-800 px-1 rounded">VOLUME</code> (Current)</li>
                                                                    <li><code className="bg-white dark:bg-gray-800 px-1 rounded">CLOSE_1</code>, <code className="bg-white dark:bg-gray-800 px-1 rounded">OPEN_1</code>... (Yesterday)</li>
                                                                    <li><code className="bg-white dark:bg-gray-800 px-1 rounded">CLOSE_2</code>, <code className="bg-white dark:bg-gray-800 px-1 rounded">OPEN_2</code>... (Day Before)</li>
                                                                </ul>
                                                                <p className="mt-2 text-xs italic">
                                                                    Supports standard Python operators including if-else.
                                                                </p>
                                                            </div>
                                                        )}

                                                        <textarea
                                                            value={currentStrategy.logic}
                                                            onChange={e => setCurrentStrategy({ ...currentStrategy, logic: e.target.value })}
                                                            rows={4}
                                                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono bg-white dark:bg-gray-700 dark:text-white"
                                                            placeholder="Example: CLOSE > MOVING_AVERAGE(20)"
                                                        />
                                                    </div>
                                                )}
                                                <div>
                                                    <label className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={currentStrategy.status === 'active'}
                                                            onChange={e => setCurrentStrategy({ ...currentStrategy, status: e.target.checked ? 'active' : 'inactive' })}
                                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                        />
                                                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Active</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                                    >
                                        {isEditMode ? 'Update' : 'Create'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
