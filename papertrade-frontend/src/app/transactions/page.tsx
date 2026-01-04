'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { portfolioAPI } from '@/lib/api';
import { ArrowLeft, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export default function TransactionsPage() {
    const router = useRouter();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await portfolioAPI.getHistory();
            // Handle both paginated (results) and wrapped (data) responses
            const list = res.data.results || res.data.data || [];
            setTransactions(list);
        } catch (error) {
            console.error("Failed to fetch history", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-10">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                >
                    <ArrowLeft size={24} className="text-gray-700 dark:text-gray-300" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Transaction History</h1>
                    <p className="text-gray-500 text-sm dark:text-gray-400">Record of all your completed trades</p>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading history...</div>
                ) : transactions.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                                <tr className="text-gray-500 text-xs uppercase tracking-wider font-semibold">
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4">Stock</th>
                                    <th className="px-6 py-4">Quantity</th>
                                    <th className="px-6 py-4">Price</th>
                                    <th className="px-6 py-4">Total Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {transactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(t.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1 font-semibold text-xs px-2 py-1 rounded-full ${t.type === 'BUY'
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                }`}>
                                                {t.type === 'BUY' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                                                {t.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                                            {t.stock_symbol}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                            {t.quantity}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                            ₹{parseFloat(t.price).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-100">
                                            ₹{parseFloat(t.amount).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-12 text-center">
                        <p className="text-gray-500 text-lg">No transactions found.</p>
                        <p className="text-gray-400 text-sm mt-1">Trades you make will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
