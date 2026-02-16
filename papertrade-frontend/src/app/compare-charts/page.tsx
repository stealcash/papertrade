"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import apiClient from '@/lib/api';
import { Search, X, Table, LineChart, LayoutGrid, AlertCircle, Calendar, Check, Filter, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { ComparisonChart } from '@/components/stocks/ComparisonChart';
import { StockChart } from '@/components/StockChart';

type ViewMode = 'TABLE' | 'CHART' | 'GRID';

interface Stock {
    id: number;
    symbol: string;
    name: string;
}

export default function StockHistoryPage() {
    const router = useRouter();
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);

    // Data State
    const [prices, setPrices] = useState<any[]>([]);
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingStocks, setLoadingStocks] = useState(false);
    const [mounted, setMounted] = useState(false);

    // View & Search State
    const [viewMode, setViewMode] = useState<ViewMode>('CHART');
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Filter State
    const [selectedStockIds, setSelectedStockIds] = useState<string[]>([]);
    const [startDate, setStartDate] = useState<Date | null>(new Date(Date.now() - 15 * 24 * 60 * 60 * 1000));
    const [endDate, setEndDate] = useState<Date | null>(new Date());

    const [autoFetched, setAutoFetched] = useState(false);

    useEffect(() => {
        setMounted(true);
        fetchStocks();
    }, []);

    useEffect(() => {
        if (!mounted) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
    }, [isAuthenticated, mounted]);

    // Auto-select first 2 stocks and fetch once stocks are loaded
    useEffect(() => {
        if (stocks.length >= 2 && !autoFetched) {
            const sorted = [...stocks].sort((a, b) => a.symbol.localeCompare(b.symbol));
            const first2 = [sorted[0].id.toString(), sorted[1].id.toString()];
            setSelectedStockIds(first2);
            setAutoFetched(true);
            // Auto-fetch prices for the default selection
            autoFetchPrices(first2);
        }
    }, [stocks, autoFetched]);

    // Close search dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsSearchFocused(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchStocks = async () => {
        setLoadingStocks(true);
        try {
            const response = await apiClient.get('/stocks/');
            const data = response.data.data?.stocks || response.data?.results || [];
            setStocks(data);
        } catch (err) {
            console.error("Failed to fetch stocks", err);
        } finally {
            setLoadingStocks(false);
        }
    };

    const autoFetchPrices = async (stockIds: string[]) => {
        if (!startDate || !endDate) return;
        setLoading(true);
        try {
            const params: any = {
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0],
                stock_ids: stockIds.join(',')
            };
            const response = await apiClient.get('/stocks/prices/daily/', { params });
            const data = response.data.data || [];
            setPrices(data);
        } catch (error) {
            console.error('Failed to fetch prices:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPrices = async () => {
        if (selectedStockIds.length === 0) {
            toast.error("Please select at least one stock");
            return;
        }

        if (!startDate || !endDate) {
            toast.error("Please select a valid date range");
            return;
        }

        setLoading(true);
        try {
            const params: any = {
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0],
                stock_ids: selectedStockIds.join(',')
            };

            const response = await apiClient.get('/stocks/prices/daily/', { params });
            const data = response.data.data || [];
            setPrices(data);
            if (data.length === 0) {
                toast.error("No data found for the selected range");
            }
        } catch (error) {
            console.error('Failed to fetch prices:', error);
            toast.error("Failed to load comparison data");
        } finally {
            setLoading(false);
        }
    };

    const toggleStock = (id: string) => {
        if (selectedStockIds.includes(id)) {
            setSelectedStockIds(prev => prev.filter(i => i !== id));
        } else {
            if (selectedStockIds.length >= 4) {
                toast.error("You can select up to 4 stocks.");
                return;
            }
            setSelectedStockIds(prev => [...prev, id]);
        }
        setSearchQuery("");
        setIsSearchFocused(false);
    };

    const filteredStocks = useMemo(() => {
        if (!searchQuery) return stocks.slice(0, 10);
        return stocks.filter(s =>
            s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.name.toLowerCase().includes(searchQuery.toLowerCase())
        ).slice(0, 10);
    }, [stocks, searchQuery]);

    const processedData = useMemo(() => {
        if (!prices.length) return { stocks: [], rows: [], chartData: {}, gridData: {} };

        const datesSet = new Set(prices.map(p => p.date));
        const dates = Array.from(datesSet).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

        const dateMap = new Map<string, { [symbol: string]: number }>();
        const stockSet = new Set<string>();

        const chartData: { [symbol: string]: { time: string; value: number }[] } = {};
        const gridData: { [symbol: string]: any[] } = {};

        const pricesByStock: { [symbol: string]: any[] } = {};
        prices.forEach(p => {
            if (!pricesByStock[p.stock_symbol]) pricesByStock[p.stock_symbol] = [];
            pricesByStock[p.stock_symbol].push(p);

            if (!dateMap.has(p.date)) dateMap.set(p.date, {});
            dateMap.get(p.date)![p.stock_symbol] = p.close_price;
            stockSet.add(p.stock_symbol);
        });

        const stocks = Array.from(stockSet).sort();

        stocks.forEach(symbol => {
            const stockPrices = pricesByStock[symbol] || [];
            if (stockPrices.length === 0) return;
            stockPrices.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const startPrice = stockPrices[0].close_price;
            chartData[symbol] = stockPrices.map(p => ({
                time: p.date,
                value: ((p.close_price - startPrice) / startPrice) * 100
            }));
            gridData[symbol] = stockPrices.map(p => ({
                time: p.date,
                open: Number(p.open_price),
                high: Number(p.high_price),
                low: Number(p.low_price),
                close: Number(p.close_price),
            }));
        });

        const datesAsc = [...dates].reverse();
        const prevPriceMap: { [symbol: string]: number } = {};
        const rowsWithChange = datesAsc.map(date => {
            const rowPrices = dateMap.get(date) || {};
            const rowChanges: { [symbol: string]: number | null } = {};
            stocks.forEach(s => {
                const current = rowPrices[s];
                const prev = prevPriceMap[s];
                if (current !== undefined && prev !== undefined) {
                    rowChanges[s] = ((current - prev) / prev) * 100;
                } else {
                    rowChanges[s] = null;
                }
                if (current !== undefined) prevPriceMap[s] = current;
            });
            return { date, prices: rowPrices, changes: rowChanges };
        });

        return { stocks, rows: rowsWithChange.reverse(), chartData, gridData };
    }, [prices]);

    if (!mounted) return null;
    if (!isAuthenticated) return <div className="min-h-screen flex items-center justify-center"><div>Redirecting...</div></div>;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col text-gray-900 dark:text-gray-100">

            {/* FULL-WIDTH TOP BAR */}
            <div className="bg-white dark:bg-gray-900 shadow-sm border-b dark:border-gray-800 sticky top-0 z-30 px-4 py-3">
                <div className="flex flex-col xl:flex-row gap-4 xl:items-center justify-between">

                    {/* LEFT: Search & Selection */}
                    <div className="flex-1 flex flex-col md:flex-row gap-4 md:items-center">
                        <div className="relative w-full md:w-60" ref={searchRef}>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search stocks..."
                                    value={searchQuery}
                                    onFocus={() => setIsSearchFocused(true)}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                                />
                                {loadingStocks && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                                    </div>
                                )}
                            </div>

                            {/* Dropdown */}
                            {isSearchFocused && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl max-h-64 overflow-y-auto z-50 py-2">
                                    {filteredStocks.length > 0 ? (
                                        filteredStocks.map(stock => (
                                            <button
                                                key={stock.id}
                                                onClick={() => toggleStock(stock.id.toString())}
                                                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${selectedStockIds.includes(stock.id.toString()) ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                            >
                                                <div className="flex flex-col items-start">
                                                    <span className="font-bold">{stock.symbol}</span>
                                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight truncate max-w-[150px]">{stock.name}</span>
                                                </div>
                                                {selectedStockIds.includes(stock.id.toString()) && <Check size={14} strokeWidth={3} />}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-4 py-8 text-center text-xs text-gray-500">No stocks found</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Selected Chips */}
                        <div className="flex flex-wrap gap-2">
                            {selectedStockIds.map(id => {
                                const stock = stocks.find(s => s.id.toString() === id);
                                if (!stock) return null;
                                return (
                                    <div key={id} className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full border border-blue-100 dark:border-blue-900/50 text-xs font-semibold">
                                        {stock.symbol}
                                        <button onClick={() => toggleStock(id)} className="hover:text-blue-800 dark:hover:text-white transition-colors">
                                            <X size={12} strokeWidth={3} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* RIGHT: Date, Apply & View Mode */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Unified Date Range Input using react-datepicker */}
                        <div className="relative">
                            <DatePicker
                                selectsRange={true}
                                startDate={startDate}
                                endDate={endDate}
                                onChange={(update: [Date | null, Date | null]) => {
                                    const [start, end] = update;
                                    setStartDate(start);
                                    setEndDate(end);
                                }}
                                maxDate={new Date()}
                                placeholderText="Select date range"
                                dateFormat="dd MMM, yyyy"
                                customInput={
                                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors group">
                                        <Calendar size={14} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                                        <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                                            {startDate && endDate
                                                ? `${startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`
                                                : "Select Range"}
                                        </span>
                                        <ChevronDown size={14} className="text-gray-400" />
                                    </div>
                                }
                            />
                        </div>

                        <button
                            onClick={fetchPrices}
                            disabled={loading}
                            className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm text-sm font-semibold active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${loading ? 'cursor-not-allowed' : ''}`}
                        >
                            {loading ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Filter size={16} />}
                            Apply
                        </button>

                        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-1">
                            {(['TABLE', 'CHART', 'GRID'] as ViewMode[]).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`p-1.5 rounded-md transition-all ${viewMode === mode ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}
                                    title={`${mode.charAt(0) + mode.slice(1).toLowerCase()} View`}
                                >
                                    {mode === 'TABLE' && <Table size={16} />}
                                    {mode === 'CHART' && <LineChart size={16} />}
                                    {mode === 'GRID' && <LayoutGrid size={16} />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col w-full">
                <div className="w-full h-full flex flex-col">
                    <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 flex flex-col flex-1 h-full min-h-[600px]">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center flex-1 text-gray-500 gap-4">
                                <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full" />
                                <span className="font-semibold text-base">Fetching comparison data...</span>
                            </div>
                        ) : selectedStockIds.length === 0 && prices.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-6 p-20 text-center">
                                <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center">
                                    <LayoutGrid size={40} className="text-gray-300" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Compare Charts</h3>
                                    <p className="mt-2 max-w-sm text-sm text-gray-500">Search and select up to 4 stocks from the top bar and select a date range to see the historical performance breakdown.</p>
                                </div>
                            </div>
                        ) : prices.length === 0 || !startDate || !endDate ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-6 p-20 text-center">
                                <AlertCircle size={40} className="text-gray-300" />
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Ready to Compare</h3>
                                    <p className="mt-2 text-sm text-gray-500">Click <span className="font-semibold text-blue-600">Apply</span> to load the data.</p>
                                </div>
                            </div>
                        ) : processedData.rows.length === 0 ? (
                            <div className="flex flex-col items-center justify-center flex-1 text-gray-600 gap-4 p-20">
                                <p className="font-semibold text-lg text-gray-400">No Results Found</p>
                                <p className="text-sm text-gray-500">Try extending your date range or selecting different stocks.</p>
                                <button onClick={() => {
                                    setStartDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
                                    setEndDate(new Date());
                                }} className="mt-4 text-blue-600 font-semibold hover:underline text-sm">Try Last 90 Days</button>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                {/* Table View */}
                                {viewMode === 'TABLE' && (
                                    <div className="overflow-auto flex-1 h-full">
                                        <table className="w-full text-left">
                                            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-sm sticky top-0 z-20">
                                                <tr>
                                                    <th className="px-6 py-4 font-medium sticky left-0 bg-gray-50 dark:bg-gray-800/50 z-30 border-r border-gray-200 dark:border-gray-700">
                                                        Date
                                                    </th>
                                                    {processedData.stocks.map(symbol => (
                                                        <th key={symbol} className="px-6 py-4 font-medium text-center">
                                                            {symbol}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                                {processedData.rows.map((row, index) => (
                                                    <tr key={row.date} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                                                        <td className={`px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 sticky left-0 border-r border-gray-200 dark:border-gray-700 z-10 ${index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/10'}`}>
                                                            {new Date(row.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </td>
                                                        {processedData.stocks.map(symbol => {
                                                            const price = row.prices[symbol];
                                                            const change = row.changes[symbol];
                                                            return (
                                                                <td key={`${row.date}-${symbol}`} className="px-6 py-3 whitespace-nowrap text-sm text-center">
                                                                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                                                                        {price !== undefined ? `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                                                                    </p>
                                                                    {change !== null && change !== undefined && (
                                                                        <span className={`text-xs ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                                                            {change > 0 ? '+' : ''}{change.toFixed(2)}%
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Combined Chart View */}
                                {viewMode === 'CHART' && (
                                    <div className="flex-1 p-8 flex flex-col h-full overflow-hidden bg-white dark:bg-gray-900">
                                        <div className="flex justify-between items-center mb-6">
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Relative Performance</h3>
                                                <p className="text-xs text-gray-400 mt-1">Base indexed to 0% at {startDate?.toLocaleDateString()}</p>
                                            </div>
                                            <div className="flex gap-4">
                                                {processedData.stocks.map((s, idx) => (
                                                    <div key={s} className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ['#2563eb', '#16a34a', '#dc2626', '#d97706'][idx % 4] }}></div>
                                                        <span className="text-xs font-medium text-gray-500">{s}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex-1 w-full relative min-h-[500px]">
                                            <ComparisonChart data={processedData.chartData} />
                                        </div>
                                    </div>
                                )}

                                {/* Grid View */}
                                {viewMode === 'GRID' && (
                                    <div className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-2 gap-6 overflow-y-auto bg-gray-50 dark:bg-gray-950">
                                        {processedData.stocks.map(symbol => (
                                            <div key={symbol} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 flex flex-col min-h-[400px] shadow-sm">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h4 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{symbol}</h4>
                                                    <span className="text-xs text-gray-400 font-medium">Historical Chart</span>
                                                </div>
                                                <div className="flex-1 w-full relative">
                                                    <div className="absolute inset-0">
                                                        <StockChart data={processedData.gridData[symbol]} height={350} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                        }
                    </div>
                </div>
            </main>
        </div>
    );
}
