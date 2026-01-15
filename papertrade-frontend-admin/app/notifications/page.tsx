'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api';
import Link from 'next/link';
import { Plus, Bell, Trash2, Users, Layers, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

export default function BroadcastsPage() {
    const [broadcasts, setBroadcasts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBroadcasts();
    }, []);

    const fetchBroadcasts = async () => {
        try {
            const res = await apiClient.get('/notifications/broadcasts/');
            setBroadcasts(res.data.data || []); // Assuming standard response wrapper
        } catch (error) {
            console.error('Failed to fetch broadcasts', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this broadcast?')) return;
        try {
            await apiClient.delete(`/notifications/broadcasts/${id}/`);
            setBroadcasts(broadcasts.filter(b => b.id !== id));
        } catch (error) {
            alert('Failed to delete broadcast');
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'success': return 'text-green-600 bg-green-50 border-green-200';
            case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'error': return 'text-red-600 bg-red-50 border-red-200';
            default: return 'text-blue-600 bg-blue-50 border-blue-200';
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Broadcast Notifications</h1>
                    <p className="text-gray-500 mt-1">Manage system-wide announcements and alerts</p>
                </div>
                <Link
                    href="/notifications/create"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus size={20} />
                    Create Notification
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 font-medium">Message</th>
                            <th className="px-6 py-4 font-medium">Type</th>
                            <th className="px-6 py-4 font-medium">Target</th>
                            <th className="px-6 py-4 font-medium">Date</th>
                            <th className="px-6 py-4 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Loading...</td></tr>
                        ) : broadcasts.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No broadcasts found</td></tr>
                        ) : (
                            broadcasts.map(broadcast => (
                                <tr key={broadcast.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-gray-900">{broadcast.title}</div>
                                        <div className="text-gray-500 line-clamp-1">{broadcast.message}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-0.5 rounded text-xs font-medium border ${getTypeColor(broadcast.notification_type)} capitalize`}>
                                            {broadcast.notification_type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-gray-600">
                                            {broadcast.target_audience === 'all' ? <Users size={16} /> : <Layers size={16} />}
                                            <span className="capitalize">
                                                {broadcast.target_audience === 'all' ? 'All Users' : `Plan ID: ${broadcast.target_plan}`}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                                        {new Date(broadcast.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(broadcast.id)}
                                            className="text-gray-400 hover:text-red-500 transition"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
