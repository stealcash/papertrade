'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { RootState } from '@/store';
import { fetchMyStocks, removeStockFromWatchlist, addStockToWatchlist, reorderWatchlist, bulkUpdateWatchlist, MyStock } from '@/store/slices/myStocksSlice';
import { TrendingUp, TrendingDown, Trash2, GripVertical, Search, Plus, X, Check } from 'lucide-react';
import Link from 'next/link';
import PredictionModal from '@/components/predictions/PredictionModal';
import { stocksAPI } from '@/lib/api';
import { useToast } from '@/context/ToastContext';

interface SortableItemProps {
    stock: any;
    onRemove: (id: number) => void;
    isSelected: boolean;
    onToggle: (id: number) => void;
    onPredict: (stock: any) => void;
}

function SortableItem({ stock, onRemove, isSelected, onToggle, onPredict }: SortableItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: stock.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 mb-3 flex items-center justify-between shadow-sm group">
            <div className="flex items-center gap-4">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(stock.id)}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <div {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <GripVertical size={20} />
                </div>
                <Link href={`/market/${stock.id}`} className="block">
                    <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{stock.symbol}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{stock.name}</p>
                    </div>
                </Link>
            </div>

            <div className="flex items-center gap-6">
                {/* Last Sync At */}
                <div className="text-right hidden sm:block">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Last Sync</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                        {stock.last_synced_at ? new Date(stock.last_synced_at).toLocaleString() : '--'}
                    </p>
                </div>

                {/* Price & Change */}
                <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {stock.last_price ? `₹${Number(stock.last_price).toFixed(2)}` : '--'}
                    </p>
                    {stock.price_change !== undefined && (
                        <div className={`flex items-center justify-end gap-1 text-sm ${stock.price_change >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {stock.price_change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {stock.price_change.toFixed(2)}%
                        </div>
                    )}
                </div>

                {/* Prediction Button */}
                <button
                    onClick={() => onPredict(stock)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-semibold rounded-lg hover:bg-purple-100 transition"
                    title="Add Prediction"
                >
                    <TrendingUp size={16} />
                    Predict
                </button>

                <button
                    onClick={() => onRemove(stock.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                    title="Remove from Watchlist"
                >
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    );
}

export default function MyStocksPage() {
    const dispatch = useDispatch<any>();
    const { showToast } = useToast();
    const { stocks, loading, totalCount, totalPages } = useSelector((state: any) => state.myStocks);
    const [isMounted, setIsMounted] = useState(false);

    // Pagination State
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);

    // Reorder State
    const [localStocks, setLocalStocks] = useState<MyStock[]>([]);
    const [hasUnsavedOrder, setHasUnsavedOrder] = useState(false);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [selectedStockForPrediction, setSelectedStockForPrediction] = useState<any>(null);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [addingStockId, setAddingStockId] = useState<number | null>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Search stocks with debounce
    const handleSearchChange = useCallback((query: string) => {
        setSearchQuery(query);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        searchTimerRef.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await stocksAPI.getAll({ search: query, page_size: 10 });
                const data = res.data?.data?.stocks || res.data?.results || res.data || [];
                setSearchResults(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Stock search failed', err);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);
    }, []);

    // Add stock to watchlist
    const handleAddStock = async (stock: any) => {
        // Check if already in watchlist
        const alreadyInWatchlist = stocks.some((s: MyStock) => s.id === stock.id);
        if (alreadyInWatchlist) {
            showToast(`${stock.symbol} is already in your watchlist`, 'error');
            return;
        }

        setAddingStockId(stock.id);
        try {
            await dispatch(addStockToWatchlist({
                id: stock.id,
                symbol: stock.symbol,
                name: stock.name,
            })).unwrap();
            showToast(`${stock.symbol} added to watchlist`, 'success');
            setSearchQuery('');
            setSearchResults([]);
            setIsSearchFocused(false);
            // Refresh watchlist
            dispatch(fetchMyStocks({ page, page_size: pageSize }));
        } catch (error: any) {
            showToast(error || 'Failed to add stock', 'error');
        } finally {
            setAddingStockId(null);
        }
    };

    // Close search dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsSearchFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggleSelection = (id: number) => {
        setSelectedIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(item => item !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;

        setIsDeleting(true);
        try {
            await dispatch(bulkUpdateWatchlist({ add: [], remove: selectedIds })).unwrap();
            setSelectedIds([]);
            dispatch(fetchMyStocks({ page, page_size: pageSize }));
        } catch (error) {
            console.error('Failed to bulk delete', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSaveOrder = async () => {
        setIsSavingOrder(true);
        try {
            await dispatch(reorderWatchlist(localStocks)).unwrap();
            setHasUnsavedOrder(false);
        } catch (error) {
            console.error('Failed to save order', error);
        } finally {
            setIsSavingOrder(false);
        }
    };

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        dispatch(fetchMyStocks({ page, page_size: pageSize }));
    }, [dispatch, page, pageSize]);

    // Sync remote stocks to localStocks unless we have unsaved changes
    useEffect(() => {
        if (!hasUnsavedOrder && stocks.length > 0) {
            setLocalStocks(stocks);
        } else if (stocks.length === 0 && !loading) {
            setLocalStocks([]);
        }
    }, [stocks, hasUnsavedOrder, loading]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            setLocalStocks((items) => {
                const oldIndex = items.findIndex((stock: any) => stock.id === active.id);
                const newIndex = items.findIndex((stock: any) => stock.id === over?.id);
                return arrayMove(items, oldIndex, newIndex);
            });
            setHasUnsavedOrder(true);
        }
    };

    // Check if a stock is already in watchlist
    const isInWatchlist = (stockId: number) => stocks.some((s: MyStock) => s.id === stockId);

    if (!isMounted) return null;

    if (loading && stocks.length === 0) return <div className="p-10 text-center text-gray-500">Loading Watchlist...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <PredictionModal
                stock={selectedStockForPrediction}
                isOpen={!!selectedStockForPrediction}
                onClose={() => setSelectedStockForPrediction(null)}
            />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Watchlist</h1>
                <div className="flex items-center gap-2">
                    {hasUnsavedOrder && (
                        <button
                            onClick={handleSaveOrder}
                            disabled={isSavingOrder}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition text-sm font-medium"
                        >
                            {isSavingOrder ? 'Saving Order...' : 'Save Order'}
                        </button>
                    )}
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            disabled={isDeleting}
                            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition text-sm font-medium"
                        >
                            <Trash2 size={18} />
                            {isDeleting ? 'Deleting...' : `Delete Selected (${selectedIds.length})`}
                        </button>
                    )}
                </div>
            </div>

            {/* Stock Search Bar */}
            <div ref={searchRef} className="relative">
                <div className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 shadow-sm">
                    <Search size={18} className="text-gray-400 flex-shrink-0" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        placeholder="Search stocks to add to watchlist..."
                        className="flex-1 bg-transparent border-0 outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setSearchResults([]);
                            }}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                        >
                            <X size={16} />
                        </button>
                    )}
                    {isSearching && (
                        <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full flex-shrink-0" />
                    )}
                </div>

                {/* Search Dropdown */}
                {isSearchFocused && searchQuery.trim() && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl max-h-72 overflow-y-auto z-50">
                        {isSearching && searchResults.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-gray-400">
                                <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
                                Searching stocks...
                            </div>
                        ) : searchResults.length > 0 ? (
                            <div className="py-1">
                                {searchResults.map((stock) => {
                                    const alreadyAdded = isInWatchlist(stock.id);
                                    const isAdding = addingStockId === stock.id;
                                    return (
                                        <button
                                            key={stock.id}
                                            onClick={() => !alreadyAdded && handleAddStock(stock)}
                                            disabled={alreadyAdded || isAdding}
                                            className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${alreadyAdded
                                                ? 'bg-green-50/50 dark:bg-green-900/10 cursor-default'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer'
                                                }`}
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{stock.symbol}</span>
                                                <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight truncate max-w-[280px]">{stock.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {stock.last_price && (
                                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                        ₹{Number(stock.last_price).toFixed(2)}
                                                    </span>
                                                )}
                                                {alreadyAdded ? (
                                                    <span className="flex items-center gap-1 text-green-600 text-xs font-semibold">
                                                        <Check size={14} strokeWidth={3} />
                                                        Added
                                                    </span>
                                                ) : isAdding ? (
                                                    <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                                                ) : (
                                                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 text-xs font-semibold bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md">
                                                        <Plus size={14} strokeWidth={3} />
                                                        Add
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : !isSearching ? (
                            <div className="px-4 py-8 text-center text-sm text-gray-400">
                                No stocks found for "{searchQuery}"
                            </div>
                        ) : null}
                    </div>
                )}
            </div>

            {stocks.length === 0 && !loading ? (
                <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 border-dashed">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">You haven't added any stocks to your watchlist yet.</p>
                    <p className="text-sm text-gray-400">Use the search bar above to find and add stocks.</p>
                </div>
            ) : (
                <>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={localStocks.map((s: any) => s.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {localStocks.map((stock: any) => (
                                <SortableItem
                                    key={stock.id}
                                    stock={stock}
                                    onRemove={(id) => dispatch(removeStockFromWatchlist({ id }))}
                                    isSelected={selectedIds.includes(stock.id)}
                                    onToggle={handleToggleSelection}
                                    onPredict={(s) => setSelectedStockForPrediction(s)}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>

                    {/* Pagination Controls */}
                    <div className="border-t border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800/30 rounded-xl">

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

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-3 py-1 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-3 py-1 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

