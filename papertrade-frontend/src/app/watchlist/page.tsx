'use client';

import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { RootState } from '@/store';
import { fetchMyStocks, removeStockFromWatchlist, reorderWatchlist, MyStock } from '@/store/slices/myStocksSlice';
import { TrendingUp, TrendingDown, Trash2, GripVertical } from 'lucide-react';
import Link from 'next/link';

function SortableItem({ stock, onRemove }: { stock: any, onRemove: (id: number) => void }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: stock.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 mb-3 flex items-center justify-between shadow-sm group">
            <div className="flex items-center gap-4">
                <div {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <GripVertical size={20} />
                </div>
                <Link href={`/stocks/${stock.id}`} className="block">
                    <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{stock.symbol}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{stock.name}</p>
                    </div>
                </Link>
            </div>

            <div className="flex items-center gap-6">
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
                <button
                    onClick={() => onRemove(stock.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition opacity-0 group-hover:opacity-100"
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
    const { stocks, loading, totalCount, totalPages } = useSelector((state: any) => state.myStocks);
    const [isMounted, setIsMounted] = useState(false);

    // Pagination State
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        dispatch(fetchMyStocks({ page, page_size: pageSize }));
    }, [dispatch, page, pageSize]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            const oldIndex = stocks.findIndex((stock: any) => stock.id === active.id);
            const newIndex = stocks.findIndex((stock: any) => stock.id === over?.id);
            const newOrder = arrayMove(stocks, oldIndex, newIndex);

            // Optimistic update
            // dispatch(setStocks(newOrder)); 
            // We can dispatch reorder action which will handle backend sync
            dispatch(reorderWatchlist(newOrder as MyStock[]));
        }
    };

    if (!isMounted) return null;

    if (loading && stocks.length === 0) return <div className="p-10 text-center text-gray-500">Loading Watchlist...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Watchlist</h1>

            {stocks.length === 0 && !loading ? (
                <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 border-dashed">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">You haven't added any stocks to your watchlist yet.</p>
                    <Link href="/stocks" className="text-blue-600 hover:underline">
                        Browse Stocks
                    </Link>
                </div>
            ) : (
                <>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={stocks.map((s: any) => s.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {stocks.map((stock: any) => (
                                <SortableItem
                                    key={stock.id}
                                    stock={stock}
                                    onRemove={(id) => dispatch(removeStockFromWatchlist({ id }))}
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
