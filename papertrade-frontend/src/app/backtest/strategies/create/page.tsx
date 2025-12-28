'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { strategiesAPI } from '@/lib/api';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import Link from 'next/link';

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

export default function CreateStrategyPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const [strategyBlocks, setStrategyBlocks] = useState<Block[]>([
        { action: 'BUY', rules: [{ field: 'RSI', operator: 'lt', value: '30' }], outputPercentage: '2' }
    ]);

    // Unified Strategy Blocks Helpers
    const addBlock = () => {
        setStrategyBlocks([...strategyBlocks, { action: 'BUY', rules: [{ field: 'RSI', operator: 'lt', value: '30' }], outputPercentage: '2' }]);
    };

    const removeBlock = (index: number) => {
        setStrategyBlocks(strategyBlocks.filter((_, i) => i !== index));
    };

    const updateBlock = (index: number, field: keyof Block, val: string) => {
        const newBlocks = [...strategyBlocks];
        // @ts-ignore
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

    const handleSubmit = async () => {
        if (!name) return alert("Please enter a strategy name");
        setLoading(true);
        try {
            const payload = {
                name,
                description,
                is_public: false,
                rules_json: {
                    strategy_blocks: strategyBlocks.map(b => ({
                        action: b.action,
                        rules: b.rules,
                        output_percentage: parseFloat(b.outputPercentage) || 0
                    }))
                }
            };
            await strategiesAPI.createRuleBased(payload);
            router.push('/backtest');
        } catch (e) {
            console.error(e);
            alert("Failed to create strategy");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-10 px-4">
            <Link href="/backtest" className="flex items-center text-gray-500 hover:text-black mb-6 gap-2">
                <ArrowLeft size={16} /> Back to Backtests
            </Link>

            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Strategy Builder</h1>
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex items-center gap-2 bg-black text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50"
                >
                    <Save size={18} /> {loading ? 'Saving...' : 'Save Strategy'}
                </button>
            </div>

            <div className="grid gap-8">
                {/* Basic Info */}
                <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
                    <h2 className="text-lg font-semibold">Basic Info</h2>
                    <div>
                        <label className="block text-sm font-medium mb-1">Strategy Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border p-2 rounded-lg"
                            placeholder="e.g. My RSI Strategy"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full border p-2 rounded-lg"
                            rows={2}
                            placeholder="Optional description..."
                        />
                    </div>
                </div>

                {/* Rules Editor */}
                <div className="grid gap-6">
                    <div className="space-y-4">
                        {strategyBlocks.map((block, bIndex) => {
                            const isBuy = block.action === 'BUY';
                            const colorClass = isBuy ? 'green' : 'red';
                            const bgClass = isBuy ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100';
                            const textClass = isBuy ? 'text-green-800' : 'text-red-800';

                            return (
                                <div key={bIndex} className={`${bgClass} p-4 rounded-xl border relative transition-colors duration-300`}>
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-3">
                                            <span className={`text-sm font-bold ${textClass}`}>
                                                {bIndex === 0 ? 'IF' : 'ELSE IF'} (Block {bIndex + 1})
                                            </span>
                                            <select
                                                value={block.action}
                                                onChange={(e) => updateBlock(bIndex, 'action', e.target.value)}
                                                className={`text-xs font-bold border rounded px-2 py-1 ${isBuy ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300'}`}
                                            >
                                                <option value="BUY">Action: BUY (UP)</option>
                                                <option value="SELL">Action: SELL (DOWN)</option>
                                            </select>
                                        </div>
                                        <div className="flex gap-2">
                                            {strategyBlocks.length > 1 && (
                                                <button type="button" onClick={() => removeBlock(bIndex)} className="text-sm text-gray-400 hover:text-red-500">Remove</button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Rules in Block */}
                                    <div className="space-y-3 mb-4">
                                        {block.rules.map((r, rIndex) => (
                                            <RuleRow
                                                key={rIndex}
                                                rule={r}
                                                onChange={(f, v) => updateRuleInBlock(bIndex, rIndex, f, v)}
                                                onDelete={() => removeRuleFromBlock(bIndex, rIndex)}
                                            />
                                        ))}
                                    </div>

                                    <button type="button" onClick={() => addRuleToBlock(bIndex)} className={`text-sm flex items-center gap-1 px-3 py-1.5 rounded mb-4 ${isBuy ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                                        <Plus size={16} /> Add Rule
                                    </button>

                                    {/* Outcome */}
                                    <div className={`mt-2 pt-3 border-t flex items-center gap-3 ${isBuy ? 'border-green-200' : 'border-red-200'}`}>
                                        <span className="text-sm font-medium text-gray-700">
                                            {isBuy ? 'Target Profit Increase:' : 'Target Profit Drop:'}
                                        </span>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={block.outputPercentage}
                                                onChange={(e) => updateBlock(bIndex, 'outputPercentage', e.target.value)}
                                                className="w-24 border p-1.5 rounded pr-6 text-sm"
                                                placeholder="0"
                                            />
                                            <span className="absolute right-2 top-1.5 text-gray-500">%</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        <button
                            type="button"
                            onClick={addBlock}
                            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 text-sm font-medium transition-colors flex justify-center items-center gap-2"
                        >
                            <Plus size={18} /> Add 'Else If' Block
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Field Descriptions
const FIELD_DESCRIPTIONS: Record<string, string> = {
    'RSI': 'Relative Strength Index (14-period). Momentum indicator (0-100).',
    'SMA_5': 'Simple Moving Average (5-day). Value is % of Close Price relative to SMA.',
    'SMA_10': 'Simple Moving Average (10-day). Value is % of Close Price relative to SMA.',
    'SMA_20': 'Simple Moving Average (20-day). Value is % of Close Price relative to SMA.',
    'SMA_50': 'Simple Moving Average (50-day). Value is % of Close Price relative to SMA.',
    'CLOSE_PCT_CHANGE_0': 'Percentage change between Day -1 (Yesterday) and Day -2.',
    'CLOSE_PCT_CHANGE_1': 'Percentage change between Day -2 and Day -3.',
    'CLOSE_PCT_CHANGE_1_3': 'Percentage change between Day -1 (Yesterday) and Day -3.',
    'CLOSE_PCT_CHANGE_1_7': 'Percentage change between Day -1 (Yesterday) and Day -7.'
};

const RuleRow = ({ rule, onChange, onDelete }: {
    rule: Rule,
    onChange: (field: keyof Rule, val: string) => void,
    onDelete: () => void
}) => (
    <div className="flex flex-col gap-2 bg-white p-3 rounded-lg shadow-sm">
        <div className="flex gap-2 items-center">
            <span className="text-xs font-bold text-gray-500 w-6">IF</span>
            <select
                value={rule.field}
                onChange={(e) => onChange('field', e.target.value)}
                className="border rounded px-2 py-1 text-sm flex-1"
            >
                <option value="RSI">RSI</option>
                <option value="SMA_5">SMA 5 (% of Close)</option>
                <option value="SMA_10">SMA 10 (% of Close)</option>
                <option value="SMA_20">SMA 20 (% of Close)</option>
                <option value="SMA_50">SMA 50 (% of Close)</option>
                <option value="CLOSE_PCT_CHANGE_0">Close % Change (Day -1 vs Day -2)</option>
                <option value="CLOSE_PCT_CHANGE_1">Close % Change (Day -2 vs Day -3)</option>
                <option value="CLOSE_PCT_CHANGE_1_3">Close % Change (Day -1 vs Day -3)</option>
                <option value="CLOSE_PCT_CHANGE_1_7">Close % Change (Day -1 vs Day -7)</option>
            </select>
            <select
                value={rule.operator}
                onChange={(e) => onChange('operator', e.target.value)}
                className="border rounded px-2 py-1 text-sm w-16"
            >
                <option value="gt">&gt;</option>
                <option value="lt">&lt;</option>
                <option value="eq">=</option>
                <option value="gte">&gt;=</option>
                <option value="lte">&lt;=</option>
            </select>
            <input
                type="number"
                value={rule.value}
                onChange={(e) => onChange('value', e.target.value)}
                className="border rounded px-2 py-1 text-sm w-20"
                placeholder="Value"
            />
            <button onClick={onDelete} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
        </div>
        <div className="ml-8 text-xs text-gray-500 italic">
            {FIELD_DESCRIPTIONS[rule.field]}
        </div>
    </div>
);
