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

interface Rule {
    field: string;
    operator: string;
    value: string;
}

interface Block {
    rules: Rule[];
    outputPercentage: string;
    action: 'BUY' | 'SELL';
}

// RuleRow Component - External Definition to avoid scope issues
const RuleRow = ({ rule, onChange, onDelete }: { rule: Rule, onChange: (f: keyof Rule, v: string) => void, onDelete: () => void }) => (
    <div className="flex gap-2 items-center mb-2">
        <span className="text-xs font-bold text-gray-500 w-6">IF</span>
        <select
            value={rule.field}
            onChange={(e) => onChange('field', e.target.value)}
            className="border rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
        >
            <option value="RSI">RSI</option>
            <option value="SMA_5">SMA 5 (% of Close)</option>
            <option value="SMA_10">SMA 10 (% of Close)</option>
            <option value="SMA_20">SMA 20 (% of Close)</option>
            <option value="SMA_50">SMA 50 (% of Close)</option>
            <option value="CLOSE_PCT_CHANGE_0">Close % Change (Day 0 - Day -1)</option>
            <option value="CLOSE_PCT_CHANGE_1">Close % Change (Day -1 - Day -2)</option>
        </select>
        <select
            value={rule.operator}
            onChange={(e) => onChange('operator', e.target.value)}
            className="border rounded px-2 py-1 text-sm w-16 bg-white dark:bg-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600"
        >
            <option value="gt">&gt;</option>
            <option value="lt">&lt;</option>
            <option value="eq">=</option>
            <option value="gte">≥</option>
            <option value="lte">≤</option>
        </select>
        <input
            type="number"
            value={rule.value}
            onChange={(e) => onChange('value', e.target.value)}
            className="border rounded px-2 py-1 text-sm w-20 bg-white dark:bg-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600"
            placeholder="Val"
        />
        <button type="button" onClick={onDelete} className="text-gray-400 hover:text-red-500">
            <TrashIcon className="h-4 w-4" />
        </button>
    </div>
);

export default function StrategiesPage() {
    const router = useRouter();
    const dispatch = useDispatch();
    // @ts-ignore
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

    // Unified Rule Builder State
    const [strategyBlocks, setStrategyBlocks] = useState<Block[]>([
        { action: 'BUY', rules: [{ field: 'RSI', operator: 'lt', value: '30' }], outputPercentage: '2' }
    ]);

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
        setStrategyBlocks([{ action: 'BUY', rules: [{ field: 'RSI', operator: 'lt', value: '30' }], outputPercentage: '2' }]);
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

    const handleDelete = async (code: string) => {
        if (!confirm('Are you sure you want to delete this strategy?')) return;
        try {
            const { strategiesAPI } = await import('@/lib/api');
            await strategiesAPI.deleteMaster(code);
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

            if (currentStrategy.type === 'AUTO' && !isEditMode) {
                // Rule Based Creation (AUTO mode)
                // Backend will automatically create the linked StrategyMaster using the provided code.
                const payload = {
                    name: currentStrategy.name,
                    description: currentStrategy.description,
                    code: currentStrategy.code,
                    is_public: true, // Admin created strategies are public
                    rules_json: {
                        strategy_blocks: strategyBlocks.map(b => ({
                            action: b.action,
                            rules: b.rules,
                            output_percentage: parseFloat(b.outputPercentage) || 0
                        }))
                    }
                };

                await strategiesAPI.createRuleBased(payload);
                setSuccessMessage('Auto Strategy created successfully');
            } else {
                // Legacy StrategyMaster (Manual)
                if (isEditMode) {
                    await strategiesAPI.updateMaster(currentStrategy.code, currentStrategy);
                    setSuccessMessage('Strategy updated successfully');
                } else {
                    await strategiesAPI.createMaster(currentStrategy);
                    setSuccessMessage('Strategy created successfully');
                }
            }
            setIsModalOpen(false);
            fetchStrategies();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save strategy');
        }
    };

    // --- Unified Strategy Blocks Helpers ---

    const addBlock = () => {
        setStrategyBlocks([...strategyBlocks, { action: 'BUY', rules: [{ field: 'RSI', operator: 'lt', value: '30' }], outputPercentage: '2' }]);
    };

    const removeBlock = (index: number) => {
        setStrategyBlocks(strategyBlocks.filter((_, i) => i !== index));
    };

    const updateBlock = (index: number, field: keyof Block, val: string) => {
        const newBlocks = [...strategyBlocks];
        newBlocks[index] = { ...newBlocks[index], [field]: val };
        setStrategyBlocks(newBlocks);
    };

    const addRuleToBlock = (blockIndex: number) => {
        const newBlocks = [...strategyBlocks];
        newBlocks[blockIndex].rules.push({ field: 'RSI', operator: 'lt', value: '30' });
        setStrategyBlocks(newBlocks);
    };

    const removeRuleFromBlock = (blockIndex: number, ruleIndex: number) => {
        const newBlocks = [...strategyBlocks];
        newBlocks[blockIndex].rules = newBlocks[blockIndex].rules.filter((_, i) => i !== ruleIndex);
        setStrategyBlocks(newBlocks);
    };

    const updateRuleInBlock = (blockIndex: number, ruleIndex: number, field: keyof Rule, val: string) => {
        const newBlocks = [...strategyBlocks];
        newBlocks[blockIndex].rules[ruleIndex] = { ...newBlocks[blockIndex].rules[ruleIndex], [field]: val };
        setStrategyBlocks(newBlocks);
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
                                                <button onClick={() => handleDelete(strategy.code)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
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
                                    <div className="sm:flex sm:items-start text-left">
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
                                                {!isEditMode && (
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Code (Unique)</label>
                                                        <input
                                                            type="text"
                                                            value={currentStrategy.code}
                                                            onChange={e => setCurrentStrategy({ ...currentStrategy, code: e.target.value.toUpperCase() })}
                                                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white"
                                                        />
                                                    </div>
                                                )}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                                                    <select
                                                        value={currentStrategy.type}
                                                        onChange={e => setCurrentStrategy({ ...currentStrategy, type: e.target.value })}
                                                        disabled={isEditMode}
                                                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white disabled:opacity-50"
                                                    >
                                                        <option value="MANUAL">MANUAL (Python Code)</option>
                                                        <option value="AUTO">AUTO (Rule Builder)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                                                    <textarea
                                                        value={currentStrategy.description}
                                                        onChange={e => setCurrentStrategy({ ...currentStrategy, description: e.target.value })}
                                                        rows={2}
                                                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white"
                                                    />
                                                </div>

                                                {/* AUTO Mode: Rule Builder */}
                                                {currentStrategy.type === 'AUTO' && !isEditMode && (
                                                    <div className="space-y-4 border-t pt-4 border-gray-200 dark:border-gray-600">
                                                        <h4 className="font-semibold text-gray-800 dark:text-gray-200">Rule Builder</h4>

                                                        {/* Unified Strategy Blocks */}
                                                        <div className="space-y-4">
                                                            {strategyBlocks.map((block, bIndex) => {
                                                                const isBuy = block.action === 'BUY';
                                                                const colorClass = isBuy ? 'green' : 'red';
                                                                const bgClass = isBuy ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900';
                                                                const textClass = isBuy ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300';

                                                                return (
                                                                    <div key={bIndex} className={`${bgClass} p-3 rounded-lg border relative transition-colors duration-300`}>
                                                                        <div className="flex justify-between items-center mb-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className={`text-sm font-bold ${textClass}`}>
                                                                                    {bIndex === 0 ? 'IF' : 'ELSE IF'} (Block {bIndex + 1})
                                                                                </span>
                                                                                <select
                                                                                    value={block.action}
                                                                                    onChange={(e) => updateBlock(bIndex, 'action', e.target.value)}
                                                                                    className={`text-xs font-bold border rounded px-2 py-0.5 ${isBuy ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300'}`}
                                                                                >
                                                                                    <option value="BUY">Action: BUY (UP)</option>
                                                                                    <option value="SELL">Action: SELL (DOWN)</option>
                                                                                </select>
                                                                            </div>
                                                                            <div className="flex gap-2">
                                                                                {strategyBlocks.length > 1 && (
                                                                                    <button type="button" onClick={() => removeBlock(bIndex)} className="text-xs text-gray-400 hover:text-red-500">Remove</button>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {/* Rules in Block */}
                                                                        {block.rules.map((r, rIndex) => (
                                                                            <RuleRow
                                                                                key={rIndex}
                                                                                rule={r}
                                                                                onChange={(f, v) => updateRuleInBlock(bIndex, rIndex, f, v)}
                                                                                onDelete={() => removeRuleFromBlock(bIndex, rIndex)}
                                                                            />
                                                                        ))}
                                                                        <button type="button" onClick={() => addRuleToBlock(bIndex)} className={`text-xs px-2 py-1 rounded mb-3 ${isBuy ? 'bg-green-200 dark:bg-green-800 hover:bg-green-300' : 'bg-red-200 dark:bg-red-800 hover:bg-red-300'}`}>+ Add Rule</button>

                                                                        {/* Outcome */}
                                                                        <div className={`mt-2 pt-2 border-t flex items-center gap-2 ${isBuy ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}`}>
                                                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                                                {isBuy ? 'Target Profit Increase:' : 'Target Profit Drop:'}
                                                                            </span>
                                                                            <input
                                                                                type="number"
                                                                                value={block.outputPercentage}
                                                                                onChange={(e) => updateBlock(bIndex, 'outputPercentage', e.target.value)}
                                                                                className="w-20 border rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-white"
                                                                                placeholder="%"
                                                                            />
                                                                            <span className="text-sm text-gray-500">%</span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}

                                                            <button
                                                                type="button"
                                                                onClick={addBlock}
                                                                className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 text-sm font-medium transition-colors"
                                                            >
                                                                + Add 'Else If' Block
                                                            </button>
                                                        </div>

                                                        <div>
                                                            <p className="text-xs text-gray-500 mt-2">Note: This strategy will be saved as a public 'Rule-Based Strategy'.</p>
                                                        </div>
                                                    </div>
                                                )}

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
                    </div>
                )}
            </main>
        </div>
    );
}
