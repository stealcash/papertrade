'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

export default function CreateBroadcastPage() {
    const router = useRouter();
    const [plans, setPlans] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        message: '',
        notification_type: 'info',
        target_audience: 'all',
        target_plan: ''
    });

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const res = await apiClient.get('/subscriptions/plans/');
            setPlans(res.data.data || []);
        } catch (error) {
            console.error('Failed to fetch plans', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const payload: any = { ...formData };
            if (payload.target_audience === 'all') {
                delete payload.target_plan;
            }

            await apiClient.post('/notifications/broadcasts/', payload);
            router.push('/notifications');
        } catch (error) {
            console.error('Failed to create broadcast', error);
            alert('Failed to create broadcast');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-8">
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition"
            >
                <ArrowLeft size={18} />
                Back to Notifications
            </button>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Notification</h1>
            <p className="text-gray-500 mb-8">Send a new update or alert to users.</p>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-xl shadow-sm border border-gray-200">

                {/* Title */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                        type="text"
                        required
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                        placeholder="e.g. System Maintenance"
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                    />
                </div>

                {/* Message */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <textarea
                        required
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition resize-none"
                        placeholder="Enter your message here..."
                        value={formData.message}
                        onChange={e => setFormData({ ...formData, message: e.target.value })}
                    />
                </div>

                {/* Type */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Notification Type</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {['info', 'success', 'warning', 'error'].map((type) => (
                            <button
                                type="button"
                                key={type}
                                onClick={() => setFormData({ ...formData, notification_type: type })}
                                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition ${formData.notification_type === type
                                        ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                                    }`}
                            >
                                {type === 'info' && <Info size={20} className="mb-1" />}
                                {type === 'success' && <CheckCircle size={20} className="mb-1" />}
                                {type === 'warning' && <AlertTriangle size={20} className="mb-1" />}
                                {type === 'error' && <XCircle size={20} className="mb-1" />}
                                <span className="text-xs font-medium capitalize">{type}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Target */}
                <div className="pt-4 border-t border-gray-100">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
                    <select
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                        value={formData.target_audience}
                        onChange={e => setFormData({ ...formData, target_audience: e.target.value })}
                    >
                        <option value="all">All Users</option>
                        <option value="plan">Specific Plan</option>
                    </select>

                    {formData.target_audience === 'plan' && (
                        <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Plan</label>
                            <select
                                required
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                value={formData.target_plan}
                                onChange={e => setFormData({ ...formData, target_plan: e.target.value })}
                            >
                                <option value="">Choose a plan...</option>
                                {plans.map(plan => (
                                    <option key={plan.id} value={plan.id}>{plan.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="pt-6">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        {submitting ? 'Sending...' : (
                            <>
                                <Send size={18} />
                                Send Broadcast
                            </>
                        )}
                    </button>
                </div>

            </form>
        </div>
    );
}
