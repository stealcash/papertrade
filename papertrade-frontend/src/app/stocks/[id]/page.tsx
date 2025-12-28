'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { stocksAPI } from '@/lib/api';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';

export default function StockDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const stockId = Number(id);

    const [stock, setStock] = useState<any>(null);
    const [prices, setPrices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDetails();
    }, [stockId]);

    const fetchDetails = async () => {
        try {
            const [s, p] = await Promise.all([
                stocksAPI.getById(stockId),
                stocksAPI.getPrices({ stock_id: stockId, days: 30 })
            ]);

            setStock(s.data.data);
            setPrices(p.data.data || []);
        } catch {
            console.log("API Offline – Using Mock");

            setStock({
                id: stockId,
                symbol: "RELIANCE",
                company_name: "Reliance Industries Ltd",
                last_price: 2456.75,
                price_change: 2.3,
                market_cap: 16500000,
                pe_ratio: 28.5,
            });

            setPrices([]);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-60 text-gray-500 dark:text-gray-400">Loading...</div>;
    if (!stock) return <div className="flex justify-center items-center h-60 text-gray-500 dark:text-gray-400">Stock Not Found</div>;

    return (
        <div className="space-y-10">

            {/* Back Button */}
            <button
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-gray-200 transition"
                onClick={() => router.back()}
            >
                <ArrowLeft size={18} /> Back
            </button>

            {/* Title */}
            <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">{stock.symbol}</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-lg">{stock.company_name}</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                <MetricCard label="Last Price" value={`₹${stock.last_price?.toFixed(2) || '--'}`} />

                <MetricCard
                    label="Change"
                    value={`${stock.price_change?.toFixed(2) || '--'}%`}
                    icon={stock.price_change >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                    accent={stock.price_change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}
                />

                <MetricCard
                    label="Market Cap"
                    value={stock.market_cap ? `₹${(stock.market_cap / 10000000).toFixed(2)} Cr` : 'N/A'}
                />

                <MetricCard
                    label="P/E Ratio"
                    value={stock.pe_ratio?.toFixed(2) || 'N/A'}
                />
            </div>

            {/* Strategy Predictions */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-xl p-6 overflow-hidden">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Strategy Predictions</h2>

                {stock.active_signals && stock.active_signals.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-sm">
                                    <th className="py-2">Strategy Name</th>
                                    <th className="py-2">Date</th>
                                    <th className="py-2">Expected Price</th>
                                    <th className="py-2">Direction</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stock.active_signals.map((signal: any, idx: number) => (
                                    <tr key={idx} className="border-b border-gray-50 dark:border-gray-800 last:border-0 text-sm text-gray-800 dark:text-gray-200">
                                        <td className="py-3 font-medium">{signal.strategy_name}</td>
                                        <td className="py-3">{signal.date}</td>
                                        <td className="py-3 font-semibold">
                                            {signal.expected_value ? `₹${Number(signal.expected_value).toFixed(2)}` : '--'}
                                        </td>
                                        <td className={`py-3 font-bold ${signal.signal_direction === 'UP' ? 'text-green-600' : 'text-red-600'}`}>
                                            {signal.signal_direction || '--'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">No active predictions available for this stock.</p>
                )}
            </div>

            {/* Chart Area */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Price Chart</h2>

                <div className="h-64 flex justify-center items-center text-gray-500 dark:text-gray-400">
                    {prices.length > 0 ? "Chart Coming Soon" : "No price data available"}
                </div>
            </div>

            {/* Trading */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Quick Trade</h2>

                <div className="grid grid-cols-2 gap-4">
                    <button className="py-3 bg-black dark:bg-gray-800 text-white dark:text-gray-100 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-700 transition">
                        Buy
                    </button>
                    <button className="py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                        Sell
                    </button>
                </div>
            </div>

        </div>
    );
}

// 💡 Small reusable UI component for cleaner JSX
function MetricCard({ label, value, icon, accent = "text-gray-900 dark:text-gray-100" }: any) {
    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-xl p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p>
            <div className={`flex items-center gap-2 text-2xl font-bold ${accent}`}>
                {icon} {value}
            </div>
        </div>
    );
}
