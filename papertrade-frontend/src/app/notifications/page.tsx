'use client';

import { useEffect, useState } from 'react';
import { notificationsAPI } from '@/lib/api';
import { Bell, Check, CheckCheck } from 'lucide-react';

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        load();
    }, []);

    async function load() {
        try {
            const res = await notificationsAPI.getAll();
            setNotifications(res.data.data || []);
        } catch {
            setNotifications([
                { id: 1, title: 'Welcome 🎉', message: 'Start your PaperTrade journey', created_at: new Date().toISOString(), is_read: false },
                { id: 2, title: 'Market Update 📈', message: 'NIFTY +1.3% today', created_at: new Date().toISOString(), is_read: false },
                { id: 3, title: 'Trade Executed', message: 'Order for RELIANCE filled', created_at: new Date().toISOString(), is_read: true },
                { id: 4, title: 'Strategy Alert 🔥', message: 'MA crossover hit BUY', created_at: new Date().toISOString(), is_read: true }
            ]);
        }
        setLoading(false);
    }

    async function markRead(id:number){
        setNotifications(n=>n.map(x=> x.id===id?{...x,is_read:true}:x ));
        try{ await notificationsAPI.markRead(id); }catch{}
    }

    async function markAll(){
        setNotifications(n=>n.map(x=>({...x,is_read:true})));
        try{ await notificationsAPI.markAllRead(); }catch{}
    }

    if(loading) return(
        <div className="flex justify-center items-center h-60 text-gray-500 text-lg">
            Loading notifications...
        </div>
    );

    const unread = notifications.filter(n=>!n.is_read).length;

    return(
        <div className="max-w-6xl mx-auto space-y-8">

            {/* ─ HEADER ─ */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900">Notifications</h1>
                    <p className="text-gray-500">{unread} unread</p>
                </div>

                { unread > 0 &&
                    <button
                        onClick={markAll}
                        className="px-5 py-2.5 bg-black text-white rounded-md hover:bg-gray-800 transition flex gap-2 items-center font-medium"
                    >
                        <CheckCheck size={18}/>
                        Mark all as read
                    </button>
                }
            </div>

            {/* ─ LIST ─ */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">

                { notifications.length === 0 && (
                    <div className="p-16 text-gray-500 text-center space-y-3">
                        <Bell size={40} className="mx-auto opacity-40" />
                        <p>No new notifications</p>
                    </div>
                )}

                <div className="divide-y divide-gray-200">
                    {notifications.map(n=>
                        <div key={n.id} 
                             className={`p-6 flex justify-between items-start 
                                        ${n.is_read? "bg-white":"bg-gray-50"} hover:bg-gray-100 transition`}>

                            <div className="flex-1 pr-4">
                                <div className="flex gap-2 items-center">
                                    <Bell size={16} className={n.is_read?"text-gray-500":"text-black"} />
                                    <h3 className="font-semibold text-gray-900">{n.title}</h3>
                                    {!n.is_read && <span className="h-2 w-2 bg-black rounded-full"></span>}
                                </div>

                                <p className="text-gray-600 mt-1">{n.message}</p>
                                <p className="text-xs text-gray-400 mt-2">
                                    {new Date(n.created_at).toLocaleString()}
                                </p>
                            </div>

                            {!n.is_read && (
                                <button
                                    onClick={()=>markRead(n.id)}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-200 hover:text-black flex gap-2 items-center text-sm"
                                >
                                    <Check size={16}/>
                                    Mark Read
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
