'use client';

import { useEffect, useState } from 'react';
import { authAPI, notificationsAPI } from '@/lib/api';
import { Bell } from 'lucide-react';

// Mock fallback removed

export default function DashboardPage() {
  const [stats, setStats] = useState({
    wallet: 0,
    totalPnl: 0,
    totalTrades: 0,
    winRate: 0,
  });

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const profileRes = await authAPI.profile();
      const user = profileRes.data.data;
      const notifRes = await notificationsAPI.getAll({ limit: 5 });

      setStats({
        wallet: Number(user.wallet_balance) || 0,
        totalPnl: 0,
        totalTrades: 0,
        winRate: 0,
      });

      // Backend ignores limit, so we slice it client-side
      const allNotifs = notifRes.data.data || [];
      setNotifications(allNotifs.slice(0, 5));

    } catch (error: any) {
      console.error("Dashboard API Error:", error.response?.data || error.message);

      // Try to fallback to local storage user if API fails
      const cachedUser = localStorage.getItem("user");
      if (cachedUser) {
        const user = JSON.parse(cachedUser);
        setStats({
          wallet: Number(user.wallet_balance) || 0,
          totalPnl: 0,
          totalTrades: 0,
          winRate: 0,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-[60vh] text-gray-500 text-lg">
      Loading dashboard...
    </div>
  );

  return (
    <div className="space-y-10">

      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm">Portfolio overview & recent alerts</p>
      </div>


      {/* --- Stats Cards --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-6">

        <Card label="Wallet Balance" value={`₹${stats.wallet.toLocaleString()}`} />
        <Card
          label="Total P&L"
          value={`₹${stats.totalPnl.toLocaleString()}`}
          valueClass={stats.totalPnl >= 0 ? "text-green-600" : "text-red-500"}
        />
        <Card label="Total Trades" value={stats.totalTrades} />
        <Card label="Win Rate" value={`${stats.winRate}%`} />

      </div>


      {/* --- Notifications --- */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">

        <div className="flex items-center gap-2 mb-5">
          <Bell size={20} className="text-gray-700" />
          <h2 className="text-xl font-semibold text-gray-800">Recent Notifications</h2>
        </div>

        {notifications.length > 0 ? (
          <div className="space-y-4">
            {notifications.map((n) => (
              <div key={n.id} className="p-4 rounded-lg border border-gray-200 hover:shadow-md transition">
                <p className="font-medium text-gray-800">{n.title}</p>
                <p className="text-gray-600 text-sm mt-1">{n.message}</p>
                <p className="text-gray-400 text-xs mt-2">{new Date(n.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No notifications available</p>
        )}
      </div>

    </div>
  );
}


/* ---------------- REUSABLE CLEAN CARD ---------------- */

function Card({ label, value, valueClass = "" }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 hover:shadow-md transition">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-semibold mt-1 ${valueClass}`}>{value}</p>
    </div>
  );
}
