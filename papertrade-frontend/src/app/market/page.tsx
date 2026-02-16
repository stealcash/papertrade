'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { stocksAPI, sectorsAPI } from '@/lib/api';
import { Search, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, ArrowDownAZ, ArrowDownZA, Filter, X } from 'lucide-react';
import PredictionModal from '@/components/predictions/PredictionModal';

export default function StocksPage() {
    // Server-side state
    const [stocks, setStocks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination & Sort State
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [sortBy, setSortBy] = useState('symbol');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'equity' | 'index'>('all');

    // Category & Sector Filters
    const [categories, setCategories] = useState<any[]>([]);
    const [sectors, setSectors] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedSector, setSelectedSector] = useState('');

    // Quick Sort Preset
    const [quickSort, setQuickSort] = useState('a_to_z');

    // Metadata
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Fetch categories and sectors on mount
    useEffect(() => {
        stocksAPI.getCategories().then(res => {
            const data = res.data?.data || res.data || [];
            setCategories(Array.isArray(data) ? data : []);
        }).catch(() => setCategories([]));

        sectorsAPI.getAll().then(res => {
            const data = res.data?.data?.sectors || res.data?.data || res.data?.results || res.data || [];
            setCategories(prev => prev); // keep categories
            setSectors(Array.isArray(data) ? data : []);
        }).catch(() => setSectors([]));
    }, []);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchStocks = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {
                page,
                page_size: pageSize,
                sort_by: sortBy,
                order: sortOrder,
                search: debouncedSearch || undefined,
                is_index: filterType === 'all' ? undefined : (filterType === 'index'),
                category_id: selectedCategory || undefined,
                sector_id: selectedSector || undefined,
            };

            const response = await stocksAPI.getAll(params);
            const responseData = response.data?.data || response.data;
            const stockList = responseData.stocks || responseData.results || [];
            const meta = responseData.pagination || {};

            setStocks(Array.isArray(stockList) ? stockList : []);
            setTotalCount(meta.total_count || 0);
            setTotalPages(meta.total_pages || 1);

        } catch (error) {
            console.error('Failed to fetch stocks', error);
            setStocks([]);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, sortBy, sortOrder, debouncedSearch, filterType, selectedCategory, selectedSector]);

    useEffect(() => {
        fetchStocks();
    }, [fetchStocks]);

    const handleQuickSort = (preset: string) => {
        if (quickSort === preset) {
            // Toggle off — reset to default
            setQuickSort('');
            setSortBy('symbol');
            setSortOrder('asc');
        } else {
            setQuickSort(preset);
            switch (preset) {
                case 'a_to_z':
                    setSortBy('symbol');
                    setSortOrder('asc');
                    break;
                case 'z_to_a':
                    setSortBy('symbol');
                    setSortOrder('desc');
                    break;
                case 'top_gainers':
                    setSortBy('price_change');
                    setSortOrder('desc');
                    break;
                case 'top_losers':
                    setSortBy('price_change');
                    setSortOrder('asc');
                    break;
            }
        }
        setPage(1);
    };

    const hasActiveFilters = selectedCategory || selectedSector || quickSort;

    const clearAllFilters = () => {
        setSelectedCategory('');
        setSelectedSector('');
        setQuickSort('');
        setFilterType('all');
        setSortBy('symbol');
        setSortOrder('asc');
        setSearchQuery('');
        setPage(1);
    };



    const [selectedStockForPrediction, setSelectedStockForPrediction] = useState<any>(null);

    const handlePredict = (stock: any) => {
        setSelectedStockForPrediction(stock);
    };

    return (
        <div className="space-y-5">
            <PredictionModal
                stock={selectedStockForPrediction}
                isOpen={!!selectedStockForPrediction}
                onClose={() => setSelectedStockForPrediction(null)}
            />

            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Market</h1>
                {hasActiveFilters && (
                    <button
                        onClick={clearAllFilters}
                        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition"
                    >
                        <X size={14} />
                        Clear All Filters
                    </button>
                )}
            </div>

            {/* Row 1: Search (Left) + Type Filters (Right) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative w-full max-w-md">
                    <Search size={20} className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by symbol or name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder-gray-400 
                                   focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                    />
                </div>

                <div className="flex space-x-2">
                    <button
                        onClick={() => { setFilterType('all'); setPage(1); }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterType === 'all'
                            ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                            }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => { setFilterType('equity'); setPage(1); }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterType === 'equity'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                            }`}
                    >
                        Equities
                    </button>
                    <button
                        onClick={() => { setFilterType('index'); setPage(1); }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterType === 'index'
                            ? 'bg-purple-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                            }`}
                    >
                        Indices
                    </button>
                </div>
            </div>

            {/* Row 2: Category, Sector, Sort Presets */}
            <div className="flex flex-wrap items-center gap-3">
                <Filter size={16} className="text-gray-400 flex-shrink-0" />

                {/* Category Dropdown */}
                <select
                    value={selectedCategory}
                    onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500 transition min-w-[140px]"
                >
                    <option value="">All Categories</option>
                    {categories.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>

                {/* Sector Dropdown */}
                <select
                    value={selectedSector}
                    onChange={(e) => { setSelectedSector(e.target.value); setPage(1); }}
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500 transition min-w-[140px]"
                >
                    <option value="">All Sectors</option>
                    {sectors.map((sec: any) => (
                        <option key={sec.id} value={sec.id}>{sec.name}</option>
                    ))}
                </select>

                <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 hidden sm:block" />

                {/* Quick Sort Buttons */}
                <button
                    onClick={() => handleQuickSort('a_to_z')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${quickSort === 'a_to_z'
                        ? 'bg-gray-800 text-white dark:bg-white dark:text-gray-900'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                        }`}
                >
                    <ArrowDownAZ size={12} className="inline mr-1" />
                    A → Z
                </button>
                <button
                    onClick={() => handleQuickSort('z_to_a')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${quickSort === 'z_to_a'
                        ? 'bg-gray-800 text-white dark:bg-white dark:text-gray-900'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                        }`}
                >
                    <ArrowDownZA size={12} className="inline mr-1" />
                    Z → A
                </button>
                <button
                    onClick={() => handleQuickSort('top_gainers')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${quickSort === 'top_gainers'
                        ? 'bg-green-600 text-white'
                        : 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-800'
                        }`}
                >
                    <TrendingUp size={12} className="inline mr-1" />
                    Top Gainers
                </button>
                <button
                    onClick={() => handleQuickSort('top_losers')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${quickSort === 'top_losers'
                        ? 'bg-red-600 text-white'
                        : 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800'
                        }`}
                >
                    <TrendingDown size={12} className="inline mr-1" />
                    Top Losers
                </button>
            </div>

            {/* Stock List Table */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                ) : stocks.length > 0 ? (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-sm select-none">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">Stock Name</th>
                                        <th className="px-6 py-4 font-medium">Last Sync At</th>
                                        <th className="px-6 py-4 font-medium text-right">Last Sync Price</th>
                                        <th className="px-6 py-4 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                    {stocks.map(stock => (
                                        <tr key={stock.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition bg-white dark:bg-gray-900">
                                            <td className="px-6 py-4">
                                                <Link href={`/market/${stock.id}`} className="block">
                                                    <p className="font-semibold text-gray-900 dark:text-gray-100">{stock.symbol}</p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">{stock.name}</p>
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                {stock.last_synced_at ? new Date(stock.last_synced_at).toLocaleString() : '--'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="font-semibold text-gray-900 dark:text-gray-100">
                                                    {stock.last_price ? `₹${Number(stock.last_price).toFixed(2)}` : '--'}
                                                </p>
                                                {stock.price_change !== undefined && stock.price_change !== null && (
                                                    <div className={`flex items-center justify-end gap-1 text-sm ${stock.price_change >= 0 ? "text-green-600" : "text-red-600"}`}>
                                                        {stock.price_change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                        {Number(stock.price_change).toFixed(2)}%
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handlePredict(stock)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-semibold rounded-lg hover:bg-purple-100 transition"
                                                    title="Add Prediction"
                                                >
                                                    <TrendingUp size={16} />
                                                    Add Prediction
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        <div className="border-t border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800/30">

                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">Rows per page:</span>
                                <select
                                    value={pageSize}
                                    onChange={(e) => {
                                        setPageSize(Number(e.target.value));
                                        setPage(1);
                                    }}
                                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-sm rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    {[10, 20, 50, 100].map(size => (
                                        <option key={size} value={size}>{size}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                                <span className="hidden sm:inline">
                                    Page {page} of {totalPages} ({totalCount} items)
                                </span>
                                <span className="sm:hidden">
                                    {page} / {totalPages}
                                </span>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center p-10 text-gray-400">
                        <p>No results found{debouncedSearch ? ` for "${debouncedSearch}"` : ''}</p>
                        {hasActiveFilters && (
                            <button onClick={clearAllFilters} className="mt-3 text-blue-500 hover:underline text-sm">
                                Clear all filters
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

