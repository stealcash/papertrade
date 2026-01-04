'use client';

import { useEffect, useState } from 'react';
import { authAPI, notificationsAPI, portfolioAPI } from '@/lib/api';
import { Bell } from 'lucide-react';

// Mock fallback removed

export default function DashboardPage() {
  const [stats, setStats] = useState({
    wallet: 0,
    invested: 0,
    currentValue: 0,
    totalPnl: 0,
  });

  const [holdings, setHoldings] = useState<any[]>([]);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboardData(); }, []);

  // Trade Modal State
  const [tradeModal, setTradeModal] = useState({ isOpen: false });
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [tradeQuantity, setTradeQuantity] = useState(1);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeError, setTradeError] = useState('');
  const [tradeSuccess, setTradeSuccess] = useState('');

  const openSellModal = (holding: any) => {
    setSelectedStock(holding);
    setTradeQuantity(holding.quantity); // Default to selling all
    setTradeError('');
    setTradeSuccess('');
    setTradeModal({ isOpen: true });
  };

  const executeSellTrade = async () => {
    if (!selectedStock) return;
    setTradeLoading(true);
    setTradeError('');

    try {
      await portfolioAPI.trade({
        stock_id: selectedStock.stock, // Holding object has 'stock' as ID
        quantity: tradeQuantity,
        action: 'SELL'
      });
      setTradeSuccess('Order executed successfully!');
      setTimeout(() => {
        setTradeModal({ isOpen: false });
        fetchDashboardData(); // Refresh dashboard data
      }, 1500);
    } catch (error: any) {
      setTradeError(error.response?.data?.message || 'Trade failed');
    } finally {
      setTradeLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const profileRes = await authAPI.profile();
      const user = profileRes.data.data;
      const notifRes = await notificationsAPI.getAll({ limit: 5 });
      const holdingsRes = await portfolioAPI.getHoldings();

      const holdingsData = holdingsRes.data.data.holdings;
      const summary = holdingsRes.data.data.summary;

      setHoldings(holdingsData);

      setStats({
        wallet: Number(user.wallet_balance) || 0,
        invested: Number(summary.total_invested) || 0,
        currentValue: holdingsData.reduce((acc: number, curr: any) => acc + Number(curr.current_value), 0),
        totalPnl: 0, // Should be calculated globally if needed
      });

      // Backend ignores limit, so we slice it client-side
      const allNotifs = notifRes.data.data || [];
      setNotifications(allNotifs.slice(0, 5));

    } catch (error: any) {
      console.error("Dashboard API Error:", error.response?.data || error.message);
      // No fallback to local storage to avoid showing stale/dummy data
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="text-gray-500 text-sm dark:text-gray-400">Portfolio overview & recent alerts</p>
      </div>


      {/* --- Stats Cards --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-6">

        <Card label="Wallet Balance" value={`₹${stats.wallet.toLocaleString()}`} />
        <Card
          label="Total Invested"
          value={`₹${stats.invested.toLocaleString()}`}
        />
        <Card
          label="Current Value"
          value={`₹${stats.currentValue.toLocaleString()}`}
          valueClass={stats.currentValue >= stats.invested ? "text-green-600" : "text-red-500"}
        />
        <Card label="Total Holdings" value={holdings.length} />

      </div>

      {/* --- Holdings Table --- */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-8 overflow-hidden">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Your Holdings</h2>
          <a href="/transactions" className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">View Trade History &rarr;</a>
        </div>

        {holdings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-500 text-sm border-b border-gray-100 dark:border-gray-800">
                  <th className="pb-3">Stock</th>
                  <th className="pb-3">Qty</th>
                  <th className="pb-3">Avg Price</th>
                  <th className="pb-3">Invested</th>
                  <th className="pb-3">LTP</th>
                  <th className="pb-3">Current</th>
                  <th className="pb-3">P&L</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h: any) => (
                  <tr key={h.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0 text-sm">
                    <td className="py-4 font-medium text-gray-900 dark:text-gray-100">{h.stock_details.symbol}</td>
                    <td className="py-4 text-gray-600 dark:text-gray-400">{h.quantity}</td>
                    <td className="py-4 text-gray-600 dark:text-gray-400">₹{Number(h.average_buy_price).toFixed(2)}</td>
                    <td className="py-4 text-gray-600 dark:text-gray-400">₹{Number(h.invested_value).toLocaleString()}</td>
                    <td className="py-4 font-medium">₹{h.stock_details.last_price || '--'}</td>
                    <td className="py-4 font-medium">₹{Number(h.current_value).toLocaleString()}</td>
                    <td className={`py-4 font-bold ${Number(h.pnl) >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {Number(h.pnl) >= 0 ? '+' : ''}₹{Number(h.pnl).toFixed(2)} ({Number(h.pnl_percentage).toFixed(2)}%)
                    </td>
                    <td className="py-4 text-right">
                      <button
                        onClick={() => openSellModal(h)}
                        className="px-3 py-1.5 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 text-xs font-semibold rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition"
                      >
                        Exit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 italic">No stocks in your portfolio yet.</p>
        )}
      </div>


      {/* --- Notifications --- */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-8">

        <div className="flex items-center gap-2 mb-5">
          <Bell size={20} className="text-gray-700 dark:text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Recent Notifications</h2>
        </div>

        {notifications.length > 0 ? (
          <div className="space-y-4">
            {notifications.map((n) => (
              <div key={n.id} className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:shadow-md transition">
                <p className="font-medium text-gray-800 dark:text-gray-200">{n.title}</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{n.message}</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">{new Date(n.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No notifications available</p>
        )}
      </div>

      {/* --- Sell Modal --- */}
      {tradeModal.isOpen && selectedStock && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl w-full max-w-sm shadow-xl">
            <h3 className="text-xl font-bold mb-4">
              Sell {selectedStock.stock_details.company_name || selectedStock.stock_details.symbol}
            </h3>

            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg flex justify-between items-center text-sm">
                <span className="text-gray-500">Currently Owned:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{selectedStock.quantity} shares</span>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Quantity to Sell</label>
                <input
                  type="number"
                  min="1"
                  max={selectedStock.quantity}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2 dark:bg-gray-800"
                  value={tradeQuantity}
                  onChange={(e) => setTradeQuantity(Number(e.target.value))}
                />
              </div>

              <div className="flex justify-between text-sm text-gray-500">
                <span>Current Price:</span>
                <span>₹{selectedStock.stock_details.last_price}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total Value:</span>
                <span>₹{(selectedStock.stock_details.last_price * tradeQuantity).toLocaleString()}</span>
              </div>

              {tradeError && <p className="text-red-500 text-sm">{tradeError}</p>}
              {tradeSuccess && <p className="text-green-600 text-sm">{tradeSuccess}</p>}

              <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                  onClick={() => setTradeModal({ isOpen: false })}
                  className="py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                  disabled={tradeLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={executeSellTrade}
                  disabled={tradeLoading || tradeQuantity <= 0 || tradeQuantity > selectedStock.quantity}
                  className={`py-2 rounded-lg text-white font-semibold transition bg-red-600 hover:bg-red-700 ${tradeLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {tradeLoading ? 'Processing...' : `Confirm Sell`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


/* ---------------- REUSABLE CLEAN CARD ---------------- */

function Card({ label, value, valueClass = "" }: any) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-8 hover:shadow-md transition">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-3xl font-semibold mt-1 ${valueClass || 'text-gray-900 dark:text-white'}`}>{value}</p>
    </div>
  );
}
