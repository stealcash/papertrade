'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { stocksAPI } from '@/lib/api';
import { Search, TrendingUp, TrendingDown, Plus, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { addStockToWatchlist, fetchMyStocks, removeStockFromWatchlist, bulkUpdateWatchlist } from '@/store/slices/myStocksSlice';
import PredictionModal from '@/components/predictions/PredictionModal';

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
    const [filterType, setFilterType] = useState<'all' | 'equity' | 'index'>('all');
    const [pendingChanges, setPendingChanges] = useState<Record<number, 'add' | 'remove'>>({});
    const [isSaving, setIsSaving] = useState(false);

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
                search: debouncedSearch,
                is_index: filterType === 'all' ? undefined : (filterType === 'index')
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
    }, [page, pageSize, sortBy, sortOrder, debouncedSearch, filterType]);

    useEffect(() => {
        fetchStocks();
    }, [fetchStocks]);

    useEffect(() => {
        dispatch(fetchMyStocks());
    }, [dispatch]);

    const handleAddRemove = (stock: any) => {
        setPendingChanges(prev => {
            const newState = { ...prev };
            const isInWatchlist = myStocks.some((s: any) => s.id === stock.id);
            const currentStatus = prev[stock.id];

            if (currentStatus) {
                // If already pending, revert it
                delete newState[stock.id];
            } else {
                // Determine action based on current watchlist state
                if (isInWatchlist) {
                    newState[stock.id] = 'remove';
                } else {
                    newState[stock.id] = 'add';
                }
            }
            return newState;
        });
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        try {
            const add: number[] = [];
            const remove: number[] = [];

            for (const [stockIdStr, action] of Object.entries(pendingChanges)) {
                const stockId = Number(stockIdStr);
                if (action === 'add') {
                    add.push(stockId);
                } else if (action === 'remove') {
                    remove.push(stockId);
                }
            }

            if (add.length > 0 || remove.length > 0) {
                await dispatch(bulkUpdateWatchlist({ add, remove })).unwrap();
            }

            setPendingChanges({});
            // Refresh watchlist to ensure consistency
            dispatch(fetchMyStocks());
        } catch (error) {
            console.error('Failed to save changes', error);
        } finally {
            setIsSaving(false);
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

    const [selectedStockForPrediction, setSelectedStockForPrediction] = useState<any>(null);

    const handlePredict = (stock: any) => {
        setSelectedStockForPrediction(stock);
    };

    return (
        <div className="space-y-6">
            <PredictionModal
                stock={selectedStockForPrediction}
                isOpen={!!selectedStockForPrediction}
                onClose={() => setSelectedStockForPrediction(null)}
            />

            {/* Header: Title and Save Button */}
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Stocks</h1>

                {/* Save Button */}
                {Object.keys(pendingChanges).length > 0 && (
                    <button
                        onClick={handleSaveChanges}
                        disabled={isSaving}
                        className="bg-blue-600 text-white px-6 py-2.5 rounded-lg shadow hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait transition-colors font-medium flex-shrink-0"
                    >
                        {isSaving ? 'Saving...' : `Save Changes (${Object.keys(pendingChanges).length})`}
                    </button>
                )}
            </div>

            {/* Controls Row: Search (Left) and Filters (Right) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                {/* Search Bar (Left) */}
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

                {/* Filters (Right) */}
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
                                                    {stock.last_synced_at ? new Date(stock.last_synced_at).toLocaleString() : '--'}
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
                                                        className={`p-2 rounded-lg transition ${
                                                            // Determine visual state
                                                            (() => {
                                                                const pendingAction = pendingChanges[stock.id];
                                                                const isInWatchlist = myStocks.some((s: any) => s.id === stock.id);

                                                                // Effectively Added? (In Watchlist + No Action) OR (Not In Watchlist + Add Action)
                                                                // Actually let's just determine color based on what it WILL be

                                                                // Logic: 
                                                                // If pending 'add' -> Show as added (Red/Check) but maybe faded or with indicator?
                                                                // User wants "click on cross then it will delete".
                                                                // Let's stick to: Blue (+) = Not monitored, Red (x) = Monitored.

                                                                let effectiveIsAdded = isInWatchlist;
                                                                if (pendingAction === 'add') effectiveIsAdded = true;
                                                                if (pendingAction === 'remove') effectiveIsAdded = false;

                                                                return effectiveIsAdded
                                                                    ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
                                                                    : 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20';
                                                            })()
                                                            }`}
                                                        title={
                                                            (() => {
                                                                const pendingAction = pendingChanges[stock.id];
                                                                const isInWatchlist = myStocks.some((s: any) => s.id === stock.id);
                                                                let effectiveIsAdded = isInWatchlist;
                                                                if (pendingAction === 'add') effectiveIsAdded = true;
                                                                if (pendingAction === 'remove') effectiveIsAdded = false;
                                                                return effectiveIsAdded ? "Remove from Watchlist" : "Add to Watchlist";
                                                            })()
                                                        }
                                                    >
                                                        {(() => {
                                                            const pendingAction = pendingChanges[stock.id];
                                                            const isInWatchlist = myStocks.some((s: any) => s.id === stock.id);
                                                            let effectiveIsAdded = isInWatchlist;
                                                            if (pendingAction === 'add') effectiveIsAdded = true;
                                                            if (pendingAction === 'remove') effectiveIsAdded = false;

                                                            return effectiveIsAdded ? <Plus size={20} className="rotate-45" /> : <Plus size={20} />;
                                                        })()}
                                                    </button>

                                                    {/* Prediction Button */}
                                                    <button
                                                        onClick={() => handlePredict(stock)}
                                                        className="p-2 text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20 rounded-lg transition"
                                                        title="Add Prediction"
                                                    >
                                                        <TrendingUp size={20} />
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
