'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { stocksAPI, portfolioAPI } from '@/lib/api';
import { StockChart } from '@/components/StockChart';

import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';

export default function StockDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const stockId = Number(id);

    const [stock, setStock] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState<any[]>([]);
    const [markers, setMarkers] = useState<any[]>([]);
    const [priceTargets, setPriceTargets] = useState<any[]>([]);

    // Trade Modal State
    const [tradeModal, setTradeModal] = useState({ isOpen: false, type: 'BUY' });
    const [tradeQuantity, setTradeQuantity] = useState(1);
    const [tradeLoading, setTradeLoading] = useState(false);
    const [tradeError, setTradeError] = useState('');
    const [tradeSuccess, setTradeSuccess] = useState('');
    const [ownedQuantity, setOwnedQuantity] = useState(0);

    useEffect(() => {
        fetchDetails();
    }, [stockId]);

    const openTradeModal = (type: string) => {
        setTradeModal({ isOpen: true, type });
        setTradeQuantity(1);
        setTradeError('');
        setTradeSuccess('');
    };

    const executeTrade = async () => {
        setTradeLoading(true);
        setTradeError('');

        try {
            await portfolioAPI.trade({
                stock_id: stockId,
                quantity: tradeQuantity,
                action: tradeModal.type as 'BUY' | 'SELL'
            });
            setTradeSuccess('Order executed successfully!');
            setTimeout(() => {
                setTradeModal({ ...tradeModal, isOpen: false });
                router.refresh();
                fetchDetails(); // Refresh details to update owned quantity
            }, 1500);
        } catch (error: any) {
            setTradeError(error.response?.data?.message || 'Trade failed');
        } finally {
            setTradeLoading(false);
        }
    };

    const fetchDetails = async () => {
        try {
            const [s, p, h] = await Promise.all([
                stocksAPI.getById(stockId),
                stocksAPI.getPrices({ stock_id: stockId, days: 365 }), // Increased days for better chart
                portfolioAPI.getHoldings()
            ]);

            setStock(s.data.data);

            // Format for Lightweight Charts
            const rawPrices = p.data.data || [];

            const formatted = rawPrices.map((d: any) => ({
                time: d.date, // 'yyyy-mm-dd'
                open: Number(d.open_price),
                high: Number(d.high_price),
                low: Number(d.low_price),
                close: Number(d.close_price),
            })).sort((a: any, b: any) => (new Date(a.time).getTime() - new Date(b.time).getTime())); // Ensure ascending order

            setChartData(formatted);

            setChartData(formatted);

            // Create Markers and Price Targets from Active Signals
            if (s.data.data.active_signals) {
                const signals = s.data.data.active_signals;

                // Markers
                const signalMarkers = signals.map((signal: any) => ({
                    time: signal.date,
                    position: signal.signal_direction === 'UP' ? 'belowBar' : 'aboveBar',
                    color: signal.signal_direction === 'UP' ? '#26a69a' : '#ef5350',
                    shape: signal.signal_direction === 'UP' ? 'arrowUp' : 'arrowDown',
                    text: signal.strategy_name.substring(0, 3), // Short text for marker
                    size: 2,
                }));
                signalMarkers.sort((a: any, b: any) => (new Date(a.time).getTime() - new Date(b.time).getTime()));
                setMarkers(signalMarkers);

                // Price Targets
                const targets = signals
                    .filter((signal: any) => signal.expected_value)
                    .map((signal: any) => ({
                        price: Number(signal.expected_value),
                        label: `Target: ${signal.expected_value}`,
                        color: signal.signal_direction === 'UP' ? '#26a69a' : '#ef5350',
                    }));
                setPriceTargets(targets);
            }

            const holdings = h.data.data.holdings || [];
            const current = holdings.find((item: any) => item.stock === stockId);
            setOwnedQuantity(current ? current.quantity : 0);

        } catch {
            // Fallback for demo if API fails
            setStock({
                id: stockId,
                symbol: "RELIANCE",
                company_name: "Reliance Industries Ltd",
                last_price: 2456.75,
                price_change: 2.3,
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-60 text-gray-500 dark:text-gray-400">Loading...</div>;
    if (!stock) return <div className="flex justify-center items-center h-60 text-gray-500 dark:text-gray-400">Stock Not Found</div>;

    return (
        <div className="space-y-6">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-xl p-6">

                {/* Left: Back & Title */}
                <div className="flex items-center gap-4">
                    <button
                        className="p-2 -ml-2 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-gray-200 transition rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">{stock.symbol}</h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">{stock.company_name}</p>
                    </div>
                </div>

                {/* Right: Metrics */}
                <div className="flex items-center gap-6 md:gap-8 border-t md:border-t-0 border-gray-100 dark:border-gray-800 pt-4 md:pt-0">
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Last Price</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">₹{stock.last_price?.toFixed(2) || '--'}</p>
                    </div>

                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Change</p>
                        <div className={`flex items-center gap-1.5 font-bold text-lg ${stock.price_change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                            {stock.price_change >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                            {stock.price_change?.toFixed(2) || '--'}%
                        </div>
                    </div>
                </div>
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
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-xl p-6 overflow-hidden">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Price Chart</h2>

                <div className="h-[400px] w-full">
                    {chartData.length > 0 ? (
                        <StockChart
                            data={chartData}
                            colors={{
                                backgroundColor: 'transparent',
                                textColor: '#888',
                            }}
                        />
                    ) : (
                        <div className="flex justify-center items-center h-full text-gray-500">
                            No chart data available
                        </div>
                    )}
                </div>

            </div>

            {/* Trading */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Trade Stock</h2>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => openTradeModal('BUY')}
                        disabled={!stock.last_price}
                        className="py-3 bg-black dark:bg-gray-800 text-white dark:text-gray-100 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Buy
                    </button>
                    <button
                        onClick={() => openTradeModal('SELL')}
                        disabled={!stock.last_price}
                        className="py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Sell
                    </button>
                </div>
            </div>

            {/* Trade Modal */}
            {tradeModal.isOpen && (
                <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl w-full max-w-sm shadow-xl">
                        <h3 className="text-xl font-bold mb-4">
                            {tradeModal.type === 'BUY' ? 'Buy Stock' : 'Sell Stock'}
                        </h3>

                        <div className="space-y-4">
                            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg flex justify-between items-center text-sm">
                                <span className="text-gray-500">Currently Owned:</span>
                                <span className="font-semibold text-gray-900 dark:text-white">{ownedQuantity} shares</span>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Quantity</label>
                                <input
                                    type="number"
                                    min="1"
                                    max={tradeModal.type === 'SELL' ? ownedQuantity : 100000}
                                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2 dark:bg-gray-800"
                                    value={tradeQuantity}
                                    onChange={(e) => setTradeQuantity(Number(e.target.value))}
                                />
                            </div>

                            <div className="flex justify-between text-sm text-gray-500">
                                <span>Estim. Price:</span>
                                <span>₹{stock.last_price}</span>
                            </div>
                            <div className="flex justify-between font-semibold">
                                <span>Total:</span>
                                <span>₹{(stock.last_price * tradeQuantity).toLocaleString()}</span>
                            </div>

                            {tradeError && <p className="text-red-500 text-sm">{tradeError}</p>}
                            {tradeSuccess && <p className="text-green-600 text-sm">{tradeSuccess}</p>}

                            <div className="grid grid-cols-2 gap-3 mt-4">
                                <button
                                    onClick={() => setTradeModal({ ...tradeModal, isOpen: false })}
                                    className="py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={executeTrade}
                                    disabled={tradeLoading || (tradeModal.type === 'SELL' && (ownedQuantity === 0 || tradeQuantity > ownedQuantity))}
                                    className={`py-2 rounded-lg text-white font-semibold transition ${tradeModal.type === 'BUY'
                                        ? 'bg-green-600 hover:bg-green-700'
                                        : 'bg-red-600 hover:bg-red-700'
                                        } ${(tradeLoading || (tradeModal.type === 'SELL' && ownedQuantity === 0)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {tradeLoading ? 'Processing...' : `Confirm ${tradeModal.type}`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
