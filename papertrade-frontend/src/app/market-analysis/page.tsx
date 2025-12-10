'use client';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import apiClient, { stocksAPI } from '@/lib/api';
import { Search, Calendar, TrendingUp, TrendingDown, ArrowRight, Layout } from 'lucide-react';

export default function MarketAnalysisPage() {
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);

    // Data State
    const [stocks, setStocks] = useState<any[]>([]);
    const [selectedStock, setSelectedStock] = useState<any>(null);
    const [priceHistory, setPriceHistory] = useState<any[]>([]);

    // Loading State
    const [loadingStocks, setLoadingStocks] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchStocks();
    }, []);

    useEffect(() => {
        if (selectedStock) {
            fetchHistory(selectedStock.symbol);
        }
    }, [selectedStock, dateRange]);

    const fetchStocks = async () => {
        try {
            const response = await stocksAPI.getAll();
            setStocks(response.data.data || []);
            // Select first stock by default if available
            if (response.data.data?.length > 0 && !selectedStock) {
                // Optional: setSelectedStock(response.data.data[0]);
            }
        } catch (error) {
            console.error('Failed to fetch stocks', error);
        } finally {
            setLoadingStocks(false);
        }
    };

    const fetchHistory = async (symbol: string) => {
        setLoadingHistory(true);
        try {
            const response = await apiClient.get('/stocks/prices/daily', {
                params: {
                    stock_symbol: symbol, // API supports filtering by symbol if backend supports it OR we filter client side if needed. 
                    // Based on previous logs: /api/v1/stock/data?stock_enum=ABFRL&date=... 
                    // But standard endpoint is /stocks/prices/daily/
                    // Let's assume standard list endpoint supports filtering or we might need to adjust.
                    // Actually, let's filter the huge list or rely on backend. 
                    // For now, let's try passing symbol. If backend ignores, we might get all.
                    start_date: dateRange.start,
                    end_date: dateRange.end
                }
            });

            // Filter client side just in case backend returns all
            const allPrices = response.data.data || [];
            const filtered = allPrices
                .filter((p: any) => p.stock_symbol === symbol)
                .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first

            setPriceHistory(filtered);
        } catch (error) {
            console.error('Failed to fetch history', error);
            setPriceHistory([]);
        } finally {
            setLoadingHistory(false);
        }
    };

    const filteredStocks = stocks.filter(s =>
        s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-[calc(100vh-theme(spacing.24))] gap-6">

            {/* LEFT SIDEBAR: Stock List */}
            <div className="w-80 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden shrink-0">
                {/* Search Header */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Layout size={16} /> Select Stock
                    </h2>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search symbol..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                        />
                    </div>
                </div>

                {/* List Content */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loadingStocks ? (
                        <div className="p-4 text-center text-sm text-gray-500">Loading stocks...</div>
                    ) : (
                        filteredStocks.map(stock => (
                            <button
                                key={stock.id}
                                onClick={() => setSelectedStock(stock)}
                                className={`w-full text-left p-3 rounded-lg text-sm transition-all border border-transparent 
                                    ${selectedStock?.id === stock.id
                                        ? 'bg-black text-white shadow-md'
                                        : 'hover:bg-gray-50 text-gray-700 hover:border-gray-200'
                                    }`}
                            >
                                <div className="font-semibold flex justify-between">
                                    {stock.symbol}
                                    {selectedStock?.id === stock.id && <ArrowRight size={14} />}
                                </div>
                                <div className={`text-xs truncate mt-0.5 ${selectedStock?.id === stock.id ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {stock.name}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT CONTENT: Details & History */}
            <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">

                {selectedStock ? (
                    <>
                        {/* Header Details */}
                        <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/30">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{selectedStock.name}</h1>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-600 border border-gray-200">
                                        {selectedStock.symbol}
                                    </span>
                                    <span className="text-sm text-gray-500">{selectedStock.sector?.name || 'N/A'}</span>
                                </div>
                            </div>

                            {/* Date Controls */}
                            <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                                <Calendar size={16} className="text-gray-400 ml-2" />
                                <input
                                    type="date"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                    className="text-sm border-none focus:ring-0 text-gray-700 w-32"
                                />
                                <span className="text-gray-300">|</span>
                                <input
                                    type="date"
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                    className="text-sm border-none focus:ring-0 text-gray-700 w-32"
                                />
                            </div>
                        </div>

                        {/* Table Content */}
                        <div className="flex-1 overflow-auto p-0">
                            {loadingHistory ? (
                                <div className="flex items-center justify-center h-full text-gray-500 animate-pulse">
                                    Loading price data...
                                </div>
                            ) : priceHistory.length > 0 ? (
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0 z-10 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">Date</th>
                                            <th className="px-6 py-3 font-medium text-right">Close</th>
                                            <th className="px-6 py-3 font-medium text-right">Open</th>
                                            <th className="px-6 py-3 font-medium text-right">High</th>
                                            <th className="px-6 py-3 font-medium text-right">Low</th>
                                            <th className="px-6 py-3 font-medium text-right">Volume</th>
                                            <th className="px-6 py-3 font-medium text-right">Change</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {priceHistory.map((day, idx) => {
                                            const prevClose = idx < priceHistory.length - 1 ? priceHistory[idx + 1].close_price : day.open_price;
                                            const change = day.close_price - prevClose;
                                            const changePercent = (change / prevClose) * 100;
                                            const isUp = change >= 0;

                                            return (
                                                <tr key={day.date} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-6 py-3 font-medium text-gray-900">
                                                        {new Date(day.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </td>
                                                    <td className="px-6 py-3 text-right font-semibold">
                                                        ₹{day.close_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-6 py-3 text-right text-gray-600">
                                                        ₹{day.open_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-6 py-3 text-right text-gray-600">
                                                        ₹{day.high_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-6 py-3 text-right text-gray-600">
                                                        ₹{day.low_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-6 py-3 text-right text-gray-500">
                                                        {day.volume?.toLocaleString() || '-'}
                                                    </td>
                                                    <td className={`px-6 py-3 text-right font-medium flex items-center justify-end gap-1 ${isUp ? 'text-green-600' : 'text-red-500'}`}>
                                                        {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                        {Math.abs(changePercent).toFixed(2)}%
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <div className="p-4 bg-gray-50 rounded-full mb-3">
                                        <Search size={24} className="opacity-50" />
                                    </div>
                                    <p>No price history found for this period.</p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <div className="p-6 bg-gray-50 rounded-full mb-4">
                            <TrendingUp size={48} className="opacity-20 text-gray-900" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-700">Select a Stock</h3>
                        <p className="text-sm mt-1 max-w-xs text-center">Choose a stock from the sidebar to view its daily price movements and history.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
