'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { plansAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function PlanEditorPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const isNew = params.id === 'create';
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState<any>({
        name: '',
        slug: '',
        description: '',
        priority: 0,
        is_active: true,
        monthly_price: 0,
        yearly_price: 0,
        available_period: 'both',
        is_default: false,
        default_period_days: 30,
        features: {},
    });

    useEffect(() => {
        if (!isNew) {
            fetchPlan(params.id);
        }
    }, [isNew, params.id]);

    const fetchPlan = async (id: string) => {
        try {
            const res = await plansAPI.getById(Number(id));
            setForm(res.data.data);
        } catch (error) {
            toast.error('Failed to fetch plan');
            router.push('/plans');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (isNew) {
                await plansAPI.create(form);
                toast.success('Plan created');
            } else {
                await plansAPI.update(Number(params.id), form);
                toast.success('Plan updated');
            }
            router.push('/plans');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6 dark:text-white">{isNew ? 'Create Plan' : 'Edit Plan'}</h1>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700">
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Plan Name</label>
                    <input
                        type="text"
                        required
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Slug (Unique ID)</label>
                    <input
                        type="text"
                        required
                        value={form.slug}
                        onChange={e => setForm({ ...form, slug: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Description</label>
                    <textarea
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white h-24"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Priority (Hierarchy)</label>
                        <p className="text-xs text-gray-500 mb-2">Higher value means higher tier. 0 = Lowest.</p>
                        <input
                            type="number"
                            required
                            value={form.priority}
                            onChange={e => setForm({ ...form, priority: Number(e.target.value) })}
                            className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Availability</label>
                        <p className="text-xs text-gray-500 mb-2">Restrict duration availability.</p>
                        <select
                            value={form.available_period || 'both'}
                            onChange={e => setForm({ ...form, available_period: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="both">Both Monthly & Yearly</option>
                            <option value="monthly">Monthly Only</option>
                            <option value="yearly">Yearly Only</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Monthly Price (₹)</label>
                        <input
                            type="number"
                            required
                            value={form.monthly_price}
                            onChange={e => setForm({ ...form, monthly_price: Number(e.target.value) })}
                            className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Yearly Price (₹)</label>
                        <input
                            type="number"
                            required
                            value={form.yearly_price}
                            onChange={e => setForm({ ...form, yearly_price: Number(e.target.value) })}
                            className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                </div>

                <div className="border-t dark:border-gray-700 pt-6">
                    <h3 className="text-lg font-medium mb-4 dark:text-gray-200">Feature Limits</h3>
                    <div className="space-y-4">
                        {[
                            { code: 'STRATEGY_CREATE', label: 'Strategy Creation' },
                            { code: 'BACKTEST_RUN', label: 'Run Backtests' },
                            { code: 'TRADE_EXECUTE', label: 'Execute Trades' },
                            { code: 'PREDICTION_ADD', label: 'Add Predictions' }
                        ].map((feature) => {
                            const config = form.features[feature.code] || { enabled: false, limit: 0, period_days: 30 };

                            const updateFeature = (key: string, value: any) => {
                                const newFeatures = { ...form.features };
                                newFeatures[feature.code] = { ...config, [key]: value };
                                setForm({ ...form, features: newFeatures });
                            };

                            return (
                                <div key={feature.code} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border dark:border-gray-700">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="font-medium dark:text-gray-200">{feature.label}</label>
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={config.enabled}
                                                onChange={e => updateFeature('enabled', e.target.checked)}
                                                className="h-4 w-4 text-blue-600 rounded"
                                            />
                                            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Enabled</span>
                                        </div>
                                    </div>

                                    {config.enabled && (
                                        <div className="grid grid-cols-2 gap-4 mt-2">
                                            <div>
                                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Limit (0 or -1 for Unlimited)</label>
                                                <input
                                                    type="number"
                                                    value={config.limit}
                                                    onChange={e => updateFeature('limit', Number(e.target.value))}
                                                    className="w-full px-3 py-1 text-sm border rounded bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Period (Days)</label>
                                                <input
                                                    type="number"
                                                    value={config.period_days || 30}
                                                    onChange={e => updateFeature('period_days', Number(e.target.value))}
                                                    className="w-full px-3 py-1 text-sm border rounded bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="border-t dark:border-gray-700 pt-6">
                    <h3 className="text-lg font-medium mb-4 dark:text-gray-200">Default Settings</h3>
                    <div className="flex items-center space-x-6">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                checked={form.is_default}
                                onChange={e => setForm({ ...form, is_default: e.target.checked })}
                                className="h-4 w-4 text-blue-600 rounded"
                            />
                            <div className="ml-2">
                                <label className="block text-sm dark:text-gray-300">Default on Signup</label>
                                <span className="text-xs text-gray-500">Auto-assign this plan to new users</span>
                            </div>
                        </div>

                        {form.is_default && (
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Default Duration (Days)</label>
                                <input
                                    type="number"
                                    value={form.default_period_days}
                                    onChange={e => setForm({ ...form, default_period_days: Number(e.target.value) })}
                                    className="w-32 px-3 py-1 text-sm border rounded bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center">
                    <input
                        type="checkbox"
                        checked={form.is_active}
                        onChange={e => setForm({ ...form, is_active: e.target.checked })}
                        className="h-4 w-4 text-blue-600 rounded"
                    />
                    <label className="ml-2 text-sm dark:text-gray-300">Active</label>
                </div>

                <div className="flex justify-end space-x-4 pt-4 border-t dark:border-gray-700">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Plan'}
                    </button>
                </div>
            </form>
        </div>
    );
}
