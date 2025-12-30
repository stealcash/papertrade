'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import apiClient, { stocksAPI } from '@/lib/api';
import { Search, Calendar, TrendingUp, TrendingDown, ArrowRight, Layout, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

export default function MarketAnalysisPage() {
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);

    // Data State
    const [stocks, setStocks] = useState<any[]>([]);
    const [selectedStock, setSelectedStock] = useState<any>(null);
    const [priceHistory, setPriceHistory] = useState<any[]>([]);

    // Strategy State
    const [strategies, setStrategies] = useState<any[]>([]);
    const [selectedStrategy, setSelectedStrategy] = useState<string>('');
    const [stats, setStats] = useState({ total: 0, dirCorrect: 0, priceCorrect: 0 });

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
        fetchStrategies();
    }, []);

    useEffect(() => {
        if (selectedStock) {
            fetchHistory(selectedStock.symbol);
        }
    }, [selectedStock, dateRange, selectedStrategy]);

    useEffect(() => {
        if (priceHistory.length > 0 && selectedStrategy) {
            calculateStats();
        } else {
            setStats({ total: 0, dirCorrect: 0, priceCorrect: 0 });
        }
    }, [priceHistory, selectedStrategy]);

    const calculateStats = () => {
        let total = 0;
        let dirCorrect = 0;
        let priceCorrect = 0;

        // priceHistory is sorted Newest First
        // We need Next Day's Actual vs Prediction
        // Prediction on Date X is for Date X.
        // Base is Date X-1 (Previous Close).

        // Loop through history (skipping last item as it has no valid "previous day" in this sorted array)
        for (let i = 0; i < priceHistory.length - 1; i++) {
            const day = priceHistory[i];
            const prevDay = priceHistory[i + 1];

            const predictedPrice = day.predicted_price ? parseFloat(day.predicted_price) : null;
            const predictedDir = day.predicted_direction; // "UP" or "DOWN"

            if (predictedPrice !== null && predictedDir) {
                total++;

                const prevClose = prevDay.close_price;
                const actualClose = day.close_price;
                const actualChange = actualClose - prevClose;
                // Avoid division by zero
                const actualChangePct = prevClose !== 0 ? (actualChange / prevClose) * 100 : 0;

                const actualDir = actualChange >= 0 ? 'UP' : 'DOWN';

                // 1. Direction Correctness
                // If predicted UP and actual UP (or flat), correct.
                // If predicted DOWN and actual DOWN, correct.
                if (predictedDir === actualDir) {
                    dirCorrect++;
                }

                // 2. Price Target Correctness
                // "if i predicted 1% up then at least 50% i mean .5% should be up in real price"
                // This means Actual Move >= 50% of Predicted Move Magnitude (in the correct direction)

                const predictedChangePct = prevClose !== 0 ? ((predictedPrice - prevClose) / prevClose) * 100 : 0;

                if (predictedDir === 'UP') {
                    // Check if actual went up at least 50% of the predicted rise
                    // Example: Pred +2%. Threshold +1%. Actual +1.5% => Correct.
                    if (actualChangePct >= (0.5 * predictedChangePct)) {
                        priceCorrect++;
                    }
                } else { // DOWN
                    // Check if actual went down at least 50% of the predicted drop (keeping in mind negatives)
                    // Example: Pred -2%. Threshold -1%. Actual -1.5% => Correct (is less than -1).
                    // Example: Pred -2%. Threshold -1%. Actual -0.5% => Incorrect (greater than -1).
                    if (actualChangePct <= (0.5 * predictedChangePct)) {
                        priceCorrect++;
                    }
                }
            }
        }

        setStats({ total, dirCorrect, priceCorrect });
    };

    const fetchStocks = async () => {
        try {
            const response = await stocksAPI.getAll();
            const stockData = response.data.data?.stocks || [];
            setStocks(Array.isArray(stockData) ? stockData : []);
        } catch (error) {
            console.error('Failed to fetch stocks', error);
        } finally {
            setLoadingStocks(false);
        }
    };

    const fetchStrategies = async () => {
        try {
            const response = await apiClient.get('/strategies/master/');
            setStrategies(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch strategies', error);
        }
    };

    const fetchHistory = async (symbol: string) => {
        setLoadingHistory(true);
        try {
            const params: any = {
                stock_symbol: symbol,
                start_date: dateRange.start,
                end_date: dateRange.end
            };

            // Pass strategy code to get merged signals
            if (selectedStrategy) {
                params.strategy = selectedStrategy;
            }

            const response = await apiClient.get('/stocks/prices/daily', { params });

            const allPrices = response.data.data || [];
            // Backend now filters by stock_symbol, but we keep sort to be safe
            const filtered = allPrices
                .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

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

    // Search Dropdown State
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const handleSelectStock = (stock: any) => {
        setSelectedStock(stock);
        setSearchQuery('');
        setIsSearchOpen(false);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.24))] gap-6">

            {/* Top Bar: Title, Search & Strategy */}
            <div className="flex flex-col gap-4 shrink-0">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Market Analysis</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Deep dive into individual stock performance</p>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        {/* Strategy Dropdown */}
                        <div className="w-48">
                            <select
                                value={selectedStrategy}
                                onChange={(e) => setSelectedStrategy(e.target.value)}
                                className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm appearance-none"
                            >
                                <option value="">Select Strategy...</option>
                                {strategies.map((s: any) => (
                                    <option key={s.id} value={s.code}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Stock Search */}
                        <div className="relative w-full md:w-96 z-50">
                            <div className="relative">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search stock (e.g. RELIANCE)..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setIsSearchOpen(true);
                                    }}
                                    onFocus={() => setIsSearchOpen(true)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                />
                            </div>

                            {/* Dropdown Results */}
                            {isSearchOpen && searchQuery && (
                                <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                                    {filteredStocks.length === 0 ? (
                                        <div className="p-4 text-center text-sm text-gray-500">No stocks found</div>
                                    ) : (
                                        filteredStocks.slice(0, 50).map(stock => (
                                            <button
                                                key={stock.id}
                                                onClick={() => handleSelectStock(stock)}
                                                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-between group"
                                            >
                                                <div>
                                                    <div className="font-medium text-gray-900 dark:text-gray-100">{stock.symbol}</div>
                                                    <div className="text-xs text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400">{stock.name}</div>
                                                </div>
                                                {selectedStock?.id === stock.id && <ArrowRight size={14} className="text-blue-500" />}
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Overlay to close on click outside */}
                            {isSearchOpen && (
                                <div className="fixed inset-0 z-[-1]" onClick={() => setIsSearchOpen(false)} />
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                {selectedStrategy && stats.total > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-xl flex items-center justify-between">
                            <div>
                                <div className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">Total Predictions</div>
                                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
                            </div>
                            <div className="p-3 bg-blue-100 dark:bg-blue-800/30 rounded-lg text-blue-600 dark:text-blue-400">
                                <AlertCircle size={20} />
                            </div>
                        </div>

                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 p-4 rounded-xl flex items-center justify-between">
                            <div>
                                <div className="text-sm text-green-600 dark:text-green-400 font-medium mb-1">Direction Correct</div>
                                <div className="flex items-baseline gap-2">
                                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.dirCorrect}</div>
                                    <div className="text-sm font-medium text-green-600">
                                        ({((stats.dirCorrect / stats.total) * 100).toFixed(1)}%)
                                    </div>
                                </div>
                            </div>
                            <div className="p-3 bg-green-100 dark:bg-green-800/30 rounded-lg text-green-600 dark:text-green-400">
                                <CheckCircle size={20} />
                            </div>
                        </div>

                        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 p-4 rounded-xl flex items-center justify-between relative group/tooltip">
                            <div>
                                <div className="flex items-center gap-1.5 text-sm text-purple-600 dark:text-purple-400 font-medium mb-1">
                                    Price Target Met
                                    <div className="relative group cursor-help">
                                        <Info size={14} />
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                            Success Criteria: If predicted change is +X%, actual change must be at least +0.5*X% (and mutually inclusive for downward trends).
                                            <div className="absolute top-100 left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900"></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.priceCorrect}</div>
                                    <div className="text-sm font-medium text-purple-600">
                                        ({((stats.priceCorrect / stats.total) * 100).toFixed(1)}%)
                                    </div>
                                </div>
                            </div>
                            <div className="p-3 bg-purple-100 dark:bg-purple-800/30 rounded-lg text-purple-600 dark:text-purple-400">
                                <TrendingUp size={20} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content: Details & History */}
            <div className="flex-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">

                {selectedStock ? (
                    <>
                        {/* Header Details */}
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-wrap justify-between items-center gap-4 bg-gray-50/30 dark:bg-gray-800/30">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                                    {selectedStock.name}
                                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                                        {selectedStock.symbol}
                                    </span>
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">{selectedStock.sector?.name || 'Sector N/A'}</p>
                            </div>

                            {/* Date Controls */}
                            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                <Calendar size={16} className="text-gray-400 ml-2" />
                                <input
                                    type="date"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                    className="text-sm border-none focus:ring-0 text-gray-700 dark:text-gray-200 bg-transparent w-32 outline-none"
                                />
                                <span className="text-gray-300">|</span>
                                <input
                                    type="date"
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                    className="text-sm border-none focus:ring-0 text-gray-700 dark:text-gray-200 bg-transparent w-32 outline-none"
                                />
                            </div>
                        </div>

                        {/* Table Content */}
                        <div className="flex-1 overflow-auto">
                            {loadingHistory ? (
                                <div className="flex items-center justify-center h-full text-gray-500">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                        <p>Loading price data...</p>
                                    </div>
                                </div>
                            ) : priceHistory.length > 0 ? (
                                <div className="relative">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800 sticky top-0 z-10 box-decoration-clone">
                                            <tr>
                                                <th className="px-6 py-3 font-medium border-b dark:border-gray-800">Date</th>
                                                <th className="px-6 py-3 font-medium text-right border-b dark:border-gray-800">Close</th>
                                                {selectedStrategy && (
                                                    <th className="px-6 py-3 font-medium text-center border-b dark:border-gray-800 bg-blue-50/50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400">
                                                        Dir
                                                    </th>
                                                )}
                                                {selectedStrategy && (
                                                    <th className="px-6 py-3 font-medium text-right border-b dark:border-gray-800 bg-blue-50/50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400">
                                                        Price
                                                    </th>
                                                )}
                                                <th className="px-6 py-3 font-medium text-right border-b dark:border-gray-800">Open</th>
                                                <th className="px-6 py-3 font-medium text-right border-b dark:border-gray-800">High</th>
                                                <th className="px-6 py-3 font-medium text-right border-b dark:border-gray-800">Low</th>
                                                <th className="px-6 py-3 font-medium text-right border-b dark:border-gray-800">Volume</th>
                                                <th className="px-6 py-3 font-medium text-right border-b dark:border-gray-800">Change</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {priceHistory.map((day, idx) => {
                                                const prevClose = idx < priceHistory.length - 1 ? priceHistory[idx + 1].close_price : day.open_price;
                                                const change = day.close_price - prevClose;
                                                const changePercent = (change / prevClose) * 100;
                                                const isUp = change >= 0;

                                                // Read predicted info directly
                                                const predictedPrice = day.predicted_price;
                                                const predictedDir = day.predicted_direction;
                                                const isPredUp = predictedDir === 'UP';

                                                return (
                                                    <tr key={day.date} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                                        <td className="px-6 py-3 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                                            {new Date(day.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </td>
                                                        <td className="px-6 py-3 text-right font-semibold dark:text-gray-200 whitespace-nowrap">
                                                            ₹{day.close_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        {selectedStrategy && (
                                                            <td className="px-6 py-3 text-center font-medium bg-blue-50/20 dark:bg-blue-900/10 whitespace-nowrap">
                                                                {predictedDir ? (
                                                                    <div className={`flex items-center justify-center gap-1 ${isPredUp ? 'text-green-600' : 'text-red-500'}`}>
                                                                        {isPredUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                                                        <span className="font-bold">{predictedDir}</span>
                                                                    </div>
                                                                ) : '-'}
                                                            </td>
                                                        )}
                                                        {selectedStrategy && (
                                                            <td className="px-6 py-3 text-right font-medium text-blue-600 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-900/10 whitespace-nowrap">
                                                                {predictedPrice ? `₹${parseFloat(predictedPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                                                            </td>
                                                        )}
                                                        <td className="px-6 py-3 text-right text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                                            ₹{day.open_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-6 py-3 text-right text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                                            ₹{day.high_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-6 py-3 text-right text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                                            ₹{day.low_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-6 py-3 text-right text-gray-500 dark:text-gray-500 whitespace-nowrap">
                                                            {day.volume?.toLocaleString() || '-'}
                                                        </td>
                                                        <td className={`px-6 py-3 text-right font-medium whitespace-nowrap ${isUp ? 'text-green-600' : 'text-red-500'}`}>
                                                            <div className="flex items-center justify-end gap-1">
                                                                {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                                {Math.abs(changePercent).toFixed(2)}%
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
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
                        <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-full mb-4">
                            <Search size={48} className="opacity-20 text-gray-900 dark:text-gray-100" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Start Analysis</h3>
                        <p className="text-sm mt-1 max-w-xs text-center">Search for a stock above to view detailed market data and price history.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
