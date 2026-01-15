'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api';
import { Bell, CheckCircle, Info, AlertTriangle, XCircle, Clock, Calendar } from 'lucide-react';

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await apiClient.get('/notifications/');
            setNotifications(res.data.data || []);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full"><CheckCircle className="text-green-600 dark:text-green-400" size={20} /></div>;
            case 'warning': return <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full"><AlertTriangle className="text-yellow-600 dark:text-yellow-400" size={20} /></div>;
            case 'error': return <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full"><XCircle className="text-red-600 dark:text-red-400" size={20} /></div>;
            default: return <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full"><Info className="text-blue-600 dark:text-blue-400" size={20} /></div>;
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="max-w-3xl mx-auto py-10 px-6">
            <div className="flex items-center gap-4 mb-10 pb-6 border-b border-gray-200 dark:border-gray-800">
                <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/20 text-white">
                    <Bell size={28} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Notifications</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                        <Calendar size={14} />
                        Last 30 days history
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="animate-pulse h-24 bg-gray-100 dark:bg-gray-800 rounded-xl"></div>
                    ))}
                </div>
            ) : notifications.length === 0 ? (
                <div className="text-center py-24 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                    <div className="bg-white dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <Bell className="text-gray-300 dark:text-gray-600" size={24} />
                    </div>
                    <p className="text-gray-900 dark:text-gray-300 font-semibold text-lg">All caught up!</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">No new notifications to display.</p>
                </div>
            ) : (
                <div className="space-y-5">
                    {notifications.map((note, index) => (
                        <div
                            key={index}
                            className={`group relative overflow-hidden bg-white dark:bg-gray-900 rounded-2xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${!note.is_read
                                    ? 'border-blue-200 dark:border-blue-900/50 shadow-md shadow-blue-500/5'
                                    : 'border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-800'
                                }`}
                        >
                            {/* Unread Indicator Bar */}
                            {!note.is_read && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                            )}

                            <div className="p-6 flex gap-5">
                                <div className="shrink-0 mt-1">
                                    {getIcon(note.notification_type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start gap-4 mb-2">
                                        <h3 className={`text-lg font-semibold truncate pr-4 ${!note.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                            {note.title}
                                        </h3>
                                        <span className="shrink-0 text-xs font-medium text-gray-400 flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-100 dark:border-gray-700">
                                            <Clock size={12} />
                                            {formatTime(note.created_at)}
                                        </span>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed whitespace-pre-line">
                                        {note.message}
                                    </p>

                                    {note.source === 'broadcast' && (
                                        <div className="mt-4 flex items-center gap-2">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-[10px] font-bold uppercase tracking-wider border border-purple-100 dark:border-purple-800">
                                                <Info size={10} strokeWidth={3} />
                                                System
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
