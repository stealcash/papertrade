"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import apiClient from '@/lib/api';
import FilterSidebar from '@/components/ui/FilterSidebar';
import { Filter, RotateCcw, Table, LineChart, LayoutGrid } from 'lucide-react';
import toast from 'react-hot-toast';
import StockSelectionModal from '@/components/stocks/StockSelectionModal';
import { ComparisonChart } from '@/components/stocks/ComparisonChart';
import { StockChart } from '@/components/StockChart';

type ViewMode = 'TABLE' | 'CHART' | 'GRID';

export default function StockHistoryPage() {
    const router = useRouter();
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);
    const [prices, setPrices] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    // View Mode
    const [viewMode, setViewMode] = useState<ViewMode>('TABLE');

    // Filters (Sidebar mainly for Date)
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Core State
    const [selectedStockIds, setSelectedStockIds] = useState<string[]>([]);
    const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(true);

    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        if (!isAuthenticated) return router.push('/login');

        // Only fetch if we have selected stocks
        if (selectedStockIds.length > 0) {
            fetchPrices();
        } else {
            setPrices([]);
            if (!isSelectionModalOpen && mounted) {
                setIsSelectionModalOpen(true);
            }
        }
    }, [isAuthenticated, mounted, selectedStockIds, dateRange]);

    const handleConfirmSelection = (ids: string[], range: { start: string; end: string }) => {
        setSelectedStockIds(ids);
        setDateRange(range);
        setIsSelectionModalOpen(false);
    };

    const fetchPrices = async () => {
        setLoading(true);
        try {
            const params: any = {
                start_date: dateRange.start,
                end_date: dateRange.end,
                stock_ids: selectedStockIds.join(',')
            };

            const response = await apiClient.get('/stocks/prices/daily/', { params });
            setPrices(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch prices:', error);
            toast.error("Failed to load comparison data");
        } finally {
            setLoading(false);
        }
    };

    const processedData = useMemo(() => {
        if (!prices.length) return { stocks: [], rows: [], chartData: {}, gridData: {} };

        const datesSet = new Set(prices.map(p => p.date));
        const dates = Array.from(datesSet).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

        const dateMap = new Map<string, { [symbol: string]: number }>();
        const stockSet = new Set<string>();

        // For Charts
        const chartData: { [symbol: string]: { time: string; value: number }[] } = {}; // % change
        const gridData: { [symbol: string]: any[] } = {}; // Original OHLC

        // First pass: Group by stock for charting
        const pricesByStock: { [symbol: string]: any[] } = {};
        prices.forEach(p => {
            if (!pricesByStock[p.stock_symbol]) pricesByStock[p.stock_symbol] = [];
            pricesByStock[p.stock_symbol].push(p);

            // Map for table
            if (!dateMap.has(p.date)) dateMap.set(p.date, {});
            dateMap.get(p.date)![p.stock_symbol] = p.close_price;
            stockSet.add(p.stock_symbol);
        });

        const stocks = Array.from(stockSet).sort();

        // Process Chart Data (% change) & Grid Data (OHLC)
        stocks.forEach(symbol => {
            const stockPrices = pricesByStock[symbol] || [];
            if (stockPrices.length === 0) return;

            // Sort by date asc for calculation
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

        // Loop for Table Row Changes (Daily % Change)
        // We need date sorted asc for prev calc
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

        // Return desc order for table
        return {
            stocks,
            rows: rowsWithChange.reverse(),
            chartData,
            gridData
        };
    }, [prices]);

    const pivotData = { stocks: processedData.stocks, rows: processedData.rows }; // Compat alias

    if (!mounted) return null;
    if (!isAuthenticated) return <div className="min-h-screen flex items-center justify-center"><div>Redirecting...</div></div>;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col text-gray-900 dark:text-gray-100">
            <StockSelectionModal
                isOpen={isSelectionModalOpen}
                onConfirm={handleConfirmSelection}
                initialSelection={selectedStockIds}
                initialDateRange={dateRange}
            />

            <div className="bg-white dark:bg-gray-900 shadow-sm border-b dark:border-gray-800 shrink-0 h-20">
                <div className="w-full h-full px-6 transition-all duration-300">
                    <div className="flex flex-row items-center justify-between gap-6 h-full">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Compare Stock History</h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Comparing {selectedStockIds.length} Selected Stocks ({dateRange.start} to {dateRange.end})</p>
                        </div>

                        <div className="flex gap-3">
                            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-1">
                                <button
                                    onClick={() => setViewMode('TABLE')}
                                    className={`p-2 rounded-md transition ${viewMode === 'TABLE' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}
                                    title="Table View"
                                >
                                    <Table size={18} />
                                </button>
                                <button
                                    onClick={() => setViewMode('CHART')}
                                    className={`p-2 rounded-md transition ${viewMode === 'CHART' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}
                                    title="Combined Chart"
                                >
                                    <LineChart size={18} />
                                </button>
                                <button
                                    onClick={() => setViewMode('GRID')}
                                    className={`p-2 rounded-md transition ${viewMode === 'GRID' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}
                                    title="Grid View"
                                >
                                    <LayoutGrid size={18} />
                                </button>
                            </div>

                            <button
                                onClick={() => setIsSelectionModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm text-sm font-medium"
                            >
                                <RotateCcw size={18} />
                                Change Selection
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <main className="flex-1 overflow-hidden pb-6 transition-all duration-300 flex flex-col w-full pt-6">

                <div className="h-full w-full">
                    <div className="bg-white dark:bg-gray-900 shadow-sm border dark:border-gray-800 flex flex-col h-full overflow-hidden">
                        {loading ? (
                            <div className="flex items-center justify-center h-full text-gray-600">Loading comparison data...</div>
                        ) : pivotData.rows.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-4">
                                <p>No comparison data loaded.</p>
                                <button className="text-blue-600 hover:underline" onClick={() => setIsSelectionModalOpen(true)}>Select stocks to compare</button>
                            </div>
                        ) : (
                            <>
                                {/* Table View */}
                                {viewMode === 'TABLE' && (
                                    <div className="overflow-auto flex-1">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 border-separate" style={{ borderSpacing: 0 }}>
                                            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-800 border-r dark:border-r-gray-800 w-40">
                                                        Date
                                                    </th>
                                                    {pivotData.stocks.map(symbol => (
                                                        <th key={symbol} className="px-6 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider border-b dark:border-gray-800">
                                                            {symbol}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                                                {pivotData.rows.map((row) => (
                                                    <tr key={row.date} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 sticky left-0 bg-white dark:bg-gray-900 border-r dark:border-r-gray-800">
                                                            {new Date(row.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </td>
                                                        {pivotData.stocks.map(symbol => {
                                                            const price = row.prices[symbol];
                                                            const change = row.changes[symbol];
                                                            return (
                                                                <td key={`${row.date}-${symbol}`} className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                                                    <div className="flex flex-col items-center">
                                                                        <span className="text-gray-900 dark:text-gray-100 font-mono font-medium">
                                                                            {price !== undefined ? `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                                                                        </span>
                                                                        {change !== null && change !== undefined && (
                                                                            <span className={`text-xs font-medium ${change > 0 ? 'text-green-600 dark:text-green-400' : change < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}`}>
                                                                                {change > 0 ? '+' : ''}{change.toFixed(2)}%
                                                                            </span>
                                                                        )}
                                                                    </div>
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
                                    <div className="flex-1 p-4 flex flex-col">
                                        <h3 className="text-lg font-semibold mb-4 text-center">Performance Comparison (% Change)</h3>
                                        <div className="flex-1 w-full min-h-[400px]">
                                            <ComparisonChart data={processedData.chartData} />
                                        </div>
                                    </div>
                                )}

                                {/* Grid View */}
                                {viewMode === 'GRID' && (
                                    <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
                                        {processedData.stocks.map(symbol => (
                                            <div key={symbol} className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-col min-h-[350px] overflow-hidden">
                                                <h4 className="font-bold mb-2 text-center text-gray-700 dark:text-gray-300">{symbol}</h4>
                                                <div className="flex-1 w-full relative">
                                                    {/* Simple wrapper to ensure height */}
                                                    <div className="absolute inset-0">
                                                        <StockChart data={processedData.gridData[symbol]} height={250} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
