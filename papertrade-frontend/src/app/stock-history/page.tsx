'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import apiClient from '@/lib/api';
import FilterSidebar from '@/components/ui/FilterSidebar';
import { Filter } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StockHistoryPage() {
    const router = useRouter();
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);
    const [prices, setPrices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    // Filters
    const [sectors, setSectors] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // New Filters
    const [filterType, setFilterType] = useState('all'); // 'all', 'stock', 'index'
    const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);

    // Default range: Last 30 days
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });



    // ... (existing imports)

    // Sidebar State
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Pagination State
    const [visibleRowCount, setVisibleRowCount] = useState(10);

    useEffect(() => {
        setMounted(true);
        fetchSectors();
        fetchCategories();
    }, []);

    useEffect(() => {
        if (!mounted) return;
        if (!isAuthenticated) return router.push('/login');

        // Only fetch when applied filters change (no debounce needed now if explicit apply, but kept for safety)
        fetchPrices();
    }, [isAuthenticated, mounted, dateRange, selectedSectors, selectedCategories, filterType, showWatchlistOnly]);

    const handleApplyFilters = (newFilters: any) => {
        // Date Validation
        const start = new Date(newFilters.dateRange.start);
        const end = new Date(newFilters.dateRange.end);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 30) {
            toast.error('Date range cannot exceed 30 days.');
            return;
        }

        setDateRange(newFilters.dateRange);
        setSelectedSectors(newFilters.selectedSectors);
        setSelectedCategories(newFilters.selectedCategories);
        setSearchQuery(newFilters.searchQuery);
        setFilterType(newFilters.filterType);
        setShowWatchlistOnly(newFilters.showWatchlistOnly);
        setIsFilterOpen(false); // Close sidebar after applying filters
        setVisibleRowCount(10); // Reset pagination
    };

    const fetchSectors = async () => {
        try {
            const response = await apiClient.get('/sectors/');
            setSectors(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch sectors', error);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await apiClient.get('/stocks/categories/');
            setCategories(response.data.data || []);
        } catch (error) {
            // Fallback if that endpoint fails, try sync endpoint or admin endpoint logic?
            // User App might need permissions for this endpoint if it's protected.
            // Assuming public access or authenticated user access for read.
            console.error('Failed to fetch categories', error);
        }
    };

    const fetchPrices = async () => {
        setLoading(true);
        try {
            const params: any = {
                start_date: dateRange.start,
                end_date: dateRange.end
            };
            if (selectedSectors.length > 0) {
                params.sector_ids = selectedSectors.join(',');
            }
            if (selectedCategories.length > 0) {
                params.category_ids = selectedCategories.join(',');
            }

            // New Filters
            if (filterType === 'stock') {
                params.is_index = 'false';
            } else if (filterType === 'index') {
                params.is_index = 'true';
            }

            if (showWatchlistOnly) {
                params.watchlist_only = 'true';
            }

            const response = await apiClient.get('/stocks/prices/daily/', { params });
            setPrices(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch prices:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate Pivot Data
    const pivotData = useMemo(() => {
        let filteredPrices = prices;

        // Client-side search is now also handled by server-side or just handled here if we want immediate feedback?
        // Wait, the plan was explicit apply. If I use `searchQuery` state, it will only update on Apply.
        // So this logic works.
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filteredPrices = prices.filter(p => p.stock_symbol.toLowerCase().includes(query));
        }

        if (!filteredPrices.length) return { dates: [], rows: [] };

        // 1. Get unique sorted dates
        const datesSet = new Set(filteredPrices.map(p => p.date));
        const dates = Array.from(datesSet).sort();

        // 2. Group by Stock Symbol
        const stockMap = new Map<string, { [date: string]: number }>();

        filteredPrices.forEach(p => {
            if (!stockMap.has(p.stock_symbol)) {
                stockMap.set(p.stock_symbol, {});
            }
            stockMap.get(p.stock_symbol)![p.date] = p.close_price;
        });

        // 3. Convert to Array for rendering
        const rows = Array.from(stockMap.entries()).map(([symbol, priceMap]) => ({
            symbol,
            prices: priceMap
        })).sort((a, b) => a.symbol.localeCompare(b.symbol));

        return { dates, rows };
    }, [prices, searchQuery]);

    const toggleSelection = (id: string, current: string[], setter: any) => {
        if (current.includes(id)) {
            setter(current.filter(i => i !== id));
        } else {
            setter([...current, id]);
        }
    };

    if (!mounted) {
        return null; // Prevent hydration error
    }

    if (!isAuthenticated) {
        return <div className="min-h-screen flex items-center justify-center"><div>Redirecting...</div></div>;
    }

    const activeFilterCount =
        (selectedSectors.length > 0 ? 1 : 0) +
        (selectedCategories.length > 0 ? 1 : 0) +
        (filterType !== 'all' ? 1 : 0) +
        (showWatchlistOnly ? 1 : 0) +
        (searchQuery ? 1 : 0);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col text-gray-900 dark:text-gray-100">
            <div className="bg-white dark:bg-gray-900 shadow-sm border-b dark:border-gray-800 shrink-0 transition-all duration-300">
                <div className="max-w-7xl mx-auto px-6 md:px-12 py-6"> {/* Increased padding */}
                    <div className="flex flex-row items-center justify-between gap-6">
                        {/* Title Row */}
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Stock Price History</h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Daily closing prices</p>
                        </div>

                        <button
                            onClick={() => setIsFilterOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm text-sm font-medium"
                        >
                            <Filter size={18} />
                            Filters
                            {activeFilterCount > 0 && (
                                <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full ml-1">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <FilterSidebar
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                onApply={handleApplyFilters}
                initialFilters={{
                    dateRange,
                    selectedSectors,
                    selectedCategories,
                    searchQuery,
                    filterType,
                    showWatchlistOnly
                }}
                options={{
                    sectors,
                    categories
                }}
            />

            <main className="flex-1 overflow-hidden pb-6 transition-all duration-300">
                <div className="max-w-7xl mx-auto h-full">
                    <div className="bg-white dark:bg-gray-900 rounded-b-xl shadow-sm border dark:border-gray-800 border-t-0 flex flex-col h-full overflow-hidden">
                        {loading ? (
                            <div className="flex items-center justify-center h-full text-gray-600">Loading history data...</div>
                        ) : pivotData.rows.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-gray-600">
                                No data found for this selection.
                            </div>
                        ) : (
                            <div className="overflow-auto flex-1">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 border-separate" style={{ borderSpacing: 0 }}>
                                    <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-800 border-r dark:border-r-gray-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] z-20 w-32 min-w-[120px]">
                                                Stock
                                            </th>
                                            {pivotData.dates.map(date => (
                                                <th key={date} className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b dark:border-gray-800 min-w-[100px]">
                                                    {new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                    <div className="text-[10px] text-gray-400 font-normal">{date}</div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                                        {pivotData.rows.slice(0, visibleRowCount).map((row) => (
                                            <tr key={row.symbol} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 sticky left-0 bg-white dark:bg-gray-900 border-r dark:border-r-gray-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] z-10">
                                                    {row.symbol}
                                                </td>
                                                {pivotData.dates.map(date => {
                                                    const price = row.prices[date];
                                                    return (
                                                        <td key={`${row.symbol}-${date}`} className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                                                            {price !== undefined ?
                                                                `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                                                                : '-'}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {visibleRowCount < pivotData.rows.length && (
                                    <div className="p-4 flex justify-center border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                                        <button
                                            onClick={() => setVisibleRowCount(prev => prev + 10)}
                                            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm"
                                        >
                                            Show More ({pivotData.rows.length - visibleRowCount} remaining)
                                        </button>
                                    </div>
                                )}

                            </div>
                        )}
                    </div>
                </div>
            </main >
        </div >
    );
}
