'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { couponsAPI, plansAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function CreateCouponPage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);

    // Dates
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    const [plans, setPlans] = useState<any[]>([]);

    useEffect(() => {
        // Fetch plans for dropdown
        const fetchPlans = async () => {
            try {
                const res = await plansAPI.getAll();
                setPlans(res.data.data || []);
            } catch (err) {
                console.error("Failed to fetch plans", err);
            }
        };
        fetchPlans();
    }, []);

    const [form, setForm] = useState({
        code: '',
        discount_percent: 10,
        valid_from: tomorrow.toISOString().split('T')[0],
        valid_until: nextYear.toISOString().split('T')[0],
        max_usage: 0,
        applicable_periods: '', // 'monthly,yearly'
        applicable_plan: null as number | null,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await couponsAPI.create(form);
            toast.success('Coupon created');
            router.push('/coupons');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6 dark:text-white">Create Coupon</h1>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Code</label>
                        <input
                            type="text"
                            required
                            placeholder="SUMMER2025"
                            value={form.code}
                            onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                            className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Discount (%)</label>
                        <input
                            type="number"
                            min="1" max="100"
                            required
                            value={form.discount_percent}
                            onChange={e => setForm({ ...form, discount_percent: Number(e.target.value) })}
                            className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Valid From</label>
                        <input
                            type="date"
                            required
                            value={form.valid_from}
                            onChange={e => setForm({ ...form, valid_from: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Valid Until</label>
                        <input
                            type="date"
                            required
                            value={form.valid_until}
                            onChange={e => setForm({ ...form, valid_until: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Max Usage (0 for Unlimited)</label>
                    <input
                        type="number"
                        min="0"
                        value={form.max_usage}
                        onChange={e => setForm({ ...form, max_usage: Number(e.target.value) })}
                        className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Applicable Plan</label>
                    <select
                        value={form.applicable_plan || ''}
                        onChange={e => setForm({ ...form, applicable_plan: e.target.value ? Number(e.target.value) : null })}
                        className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        <option value="">All Plans</option>
                        {plans.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Leave "All Plans" to apply discount globally.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Applicable Periods (Optional)</label>
                    <input
                        type="text"
                        placeholder="e.g. monthly,yearly (Leave empty for all)"
                        value={form.applicable_periods}
                        onChange={e => setForm({ ...form, applicable_periods: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                </div>

                <div className="flex justify-end space-x-4 pt-4">
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
                        {saving ? 'Creating...' : 'Create Coupon'}
                    </button>
                </div>
            </form>
        </div>
    );
}
