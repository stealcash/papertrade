'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { stocksAPI } from '@/lib/api';
import { Search, TrendingUp, TrendingDown, Plus, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { addStockToWatchlist, fetchMyStocks, removeStockFromWatchlist } from '@/store/slices/myStocksSlice';

export default function StocksPage() {
    const dispatch = useDispatch<any>();
    const { stocks: myStocks } = useSelector((state: any) => state.myStocks);

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

    // Metadata
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPage(1); // Reset to page 1 on search change
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchStocks = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page,
                page_size: pageSize,
                sort_by: sortBy,
                order: sortOrder,
                search: debouncedSearch
            };

            const response = await stocksAPI.getAll(params);

            // Backend returns { stocks: [...], pagination: {...} } or { results: [...] } depending on standard DRF
            // Based on previous logs/code: { data: { stocks: [...], pagination: {...} } } wrapper might be there from get_success_response
            // Let's handle the response structure safely

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
    }, [page, pageSize, sortBy, sortOrder, debouncedSearch]);

    useEffect(() => {
        fetchStocks();
    }, [fetchStocks]);

    useEffect(() => {
        dispatch(fetchMyStocks());
    }, [dispatch]);

    const handleAddRemove = (stock: any) => {
        const isInWatchlist = myStocks.some((s: any) => s.id === stock.id);
        if (isInWatchlist) {
            dispatch(removeStockFromWatchlist({ id: stock.id }));
        } else {
            dispatch(addStockToWatchlist({
                id: stock.id,
                symbol: stock.symbol,
                name: stock.name,
                last_price: stock.last_price,
                last_sync_at: stock.last_sync_at
            }));
        }
    };

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
        setPage(1);
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (sortBy !== field) return <ArrowUpDown size={14} className="text-gray-400 ml-1 inline" />;
        return sortOrder === 'asc'
            ? <ArrowUp size={14} className="text-blue-500 ml-1 inline" />
            : <ArrowDown size={14} className="text-blue-500 ml-1 inline" />;
    };

    return (
        <div className="space-y-6">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Stocks</h1>

                {/* Search Bar */}
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
                                        <th
                                            className="px-6 py-4 font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                                            onClick={() => handleSort('symbol')}
                                        >
                                            Stock Name <SortIcon field="symbol" />
                                        </th>
                                        <th
                                            className="px-6 py-4 font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                                            onClick={() => handleSort('last_synced_at')}
                                        >
                                            Last Sync At <SortIcon field="last_synced_at" />
                                        </th>
                                        <th className="px-6 py-4 font-medium text-right">Last Sync Price</th>
                                        <th className="px-6 py-4 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                    {stocks.map(stock => {
                                        const isAdded = myStocks.some((s: any) => s.id === stock.id);
                                        return (
                                            <tr key={stock.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition bg-white dark:bg-gray-900">
                                                <td className="px-6 py-4">
                                                    <Link href={`/stocks/${stock.id}`} className="block">
                                                        <p className="font-semibold text-gray-900 dark:text-gray-100">{stock.symbol}</p>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">{stock.name}</p>
                                                    </Link>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                    {stock.last_sync_at ? new Date(stock.last_sync_at).toLocaleString() : '--'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                                                        {stock.last_price ? `₹${stock.last_price.toFixed(2)}` : '--'}
                                                    </p>
                                                    {stock.price_change !== undefined && (
                                                        <div className={`flex items-center justify-end gap-1 text-sm ${stock.price_change >= 0 ? "text-green-600" : "text-red-600"}`}>
                                                            {stock.price_change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                            {stock.price_change.toFixed(2)}%
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleAddRemove(stock)}
                                                        className={`p-2 rounded-lg transition ${isAdded ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20' : 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20'}`}
                                                        title={isAdded ? "Remove from Watchlist" : "Add to Watchlist"}
                                                    >
                                                        {isAdded ? <Plus size={20} className="rotate-45" /> : <Plus size={20} />}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
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
                        <p>No results found for "{debouncedSearch}"</p>
                    </div>
                )}
            </div>
        </div>
    );
}
