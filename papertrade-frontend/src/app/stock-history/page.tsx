'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import apiClient from '@/lib/api';

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

    // Default range: Last 30 days
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        setMounted(true);
        fetchSectors();
        fetchCategories();
    }, []);

    useEffect(() => {
        if (!mounted) return;
        if (!isAuthenticated) return router.push('/login');

        const timer = setTimeout(() => {
            fetchPrices();
        }, 300); // Debounce fetch

        return () => clearTimeout(timer);
    }, [isAuthenticated, mounted, dateRange, selectedSectors, selectedCategories]);

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

        // Apply client-side search filtering
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

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col text-gray-900 dark:text-gray-100">
            <div className="bg-white dark:bg-gray-900 shadow-sm border-b dark:border-gray-800 shrink-0 transition-all duration-300">
                <div className="max-w-7xl mx-auto px-6 md:px-12 py-6"> {/* Increased padding */}
                    <div className="flex flex-col gap-6">
                        {/* Title Row */}
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Stock Price History</h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Daily closing prices (Last 30 Days)</p>
                        </div>

                        {/* Row 1: Filters (Sectors and Categories) */}
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Sector Multi-Select */}
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sectors (Select Multiple)</label>
                                <div className="h-24 overflow-y-auto border dark:border-gray-700 rounded-md p-2 bg-gray-50 dark:bg-gray-800 text-sm">
                                    {sectors.map(sector => (
                                        <div key={sector.id} className="flex items-center space-x-2 mb-1">
                                            <input
                                                type="checkbox"
                                                id={`sector-${sector.id}`}
                                                checked={selectedSectors.includes(String(sector.id))}
                                                onChange={() => toggleSelection(String(sector.id), selectedSectors, setSelectedSectors)}
                                                className="rounded text-blue-600 focus:ring-blue-500"
                                            />
                                            <label htmlFor={`sector-${sector.id}`} className="cursor-pointer select-none text-gray-700 dark:text-gray-300">
                                                {sector.name}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Category Multi-Select */}
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Categories (Select Multiple)</label>
                                <div className="h-24 overflow-y-auto border dark:border-gray-700 rounded-md p-2 bg-gray-50 dark:bg-gray-800 text-sm">
                                    {categories.map(cat => (
                                        <div key={cat.id} className="flex items-center space-x-2 mb-1">
                                            <input
                                                type="checkbox"
                                                id={`cat-${cat.id}`}
                                                checked={selectedCategories.includes(String(cat.id))}
                                                onChange={() => toggleSelection(String(cat.id), selectedCategories, setSelectedCategories)}
                                                className="rounded text-purple-600 focus:ring-purple-500"
                                            />
                                            <label htmlFor={`cat-${cat.id}`} className="cursor-pointer select-none text-gray-700 dark:text-gray-300">
                                                {cat.name}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Search and Date Range */}
                        <div className="flex flex-col md:flex-row gap-6 items-end">
                            {/* Stock Search */}
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Search Stock</label>
                                <input
                                    type="text"
                                    placeholder="Enter symbol..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>

                            {/* Date Range */}
                            <div className="flex items-center gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">From</label>
                                    <input
                                        type="date"
                                        value={dateRange.start}
                                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                        className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <span className="text-gray-400 mb-2">–</span>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">To</label>
                                    <input
                                        type="date"
                                        value={dateRange.end}
                                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                        className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <main className="flex-1 overflow-hidden p-6 md:p-12 transition-all duration-300">
                <div className="max-w-7xl mx-auto h-full">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border dark:border-gray-800 flex flex-col h-full overflow-hidden">
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
                                        {pivotData.rows.map((row) => (
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
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
