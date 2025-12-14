'use client';

import { useEffect, useState } from 'react';
import { authAPI, paymentsAPI } from '@/lib/api';
import { Wallet as WalletIcon, Plus, History, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

const MOCK = {
    balance: 97500,
    records: [
        { id: 1, type: "Refill", amount: 100000, status: "completed", created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
        { id: 2, type: "Trade", amount: -2500, status: "completed", created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
    ]
};

export default function WalletPage() {

    const [balance, setBalance] = useState<number>(0);
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [refill, setRefill] = useState("");
    const [open, setOpen] = useState(false);

    useEffect(() => { load(); }, []);

    async function load() {
        try {
            const [p, r] = await Promise.all([
                authAPI.profile(),
                paymentsAPI.getRecords(),
            ]);
            setBalance(parseFloat(p.data.data.wallet_balance) || 0);
            setRecords(r.data.data || []);
        } catch {
            setBalance(MOCK.balance);
            setRecords(MOCK.records);
        }
        setLoading(false);
    }

    async function refillWallet() {
        if (!refill || +refill <= 0) return alert("Enter valid amount");
        try {
            await paymentsAPI.refillWallet(+refill);
            setOpen(false); setRefill(""); load();
        } catch {
            alert("Refill available only after backend live");
        }
    }

    if (loading) return (
        <div className="flex justify-center items-center h-64 text-gray-500">Loading wallet...</div>
    );

    return (
        <div className="space-y-10 max-w-5xl">

            {/* ---------- Header ---------- */}
            <header>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Wallet</h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
                    {/* Left Column: Balance & Actions */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Balance Card */}
                        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 text-white shadow-lg flex justify-between items-center">
                            <div>
                                <p className="text-blue-100 text-sm font-medium mb-1">Available Balance</p>
                                <h2 className="text-5xl font-bold">₹{balance.toLocaleString()}</h2>
                            </div>
                            <WalletIcon size={60} className="text-white/20" />
                        </div>

                        {/* ---------- Transaction History ---------- */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <History size={20} className="text-gray-500 dark:text-gray-400" />
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Recent Transactions</h2>
                                </div>
                            </div>

                            {records.length ? (
                                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {records.map(x => (
                                        <div key={x.id} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-lg ${x.amount >= 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                                                    {x.amount >= 0 ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 dark:text-gray-100">{x.type}</p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        {new Date(x.created_at).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-bold ${x.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-gray-900 dark:text-gray-100"}`}>
                                                    {x.amount >= 0 ? "+" : ""}₹{Math.abs(x.amount).toLocaleString()}
                                                </p>
                                                <p className="text-gray-500 dark:text-gray-400 text-xs capitalize">{x.status}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-10 text-center text-gray-500 dark:text-gray-400">No transactions yet</div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Top Up */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Add Funds</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={refill}
                                            onChange={(e) => setRefill(e.target.value)}
                                            className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={refillWallet}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition shadow-sm"
                                >
                                    Proceed to Pay
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
        </div>
    );
}
