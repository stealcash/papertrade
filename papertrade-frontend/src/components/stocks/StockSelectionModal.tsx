"use client";

import { useState, useEffect } from "react";
import { X, Search, Check, AlertCircle } from "lucide-react";
import apiClient from "@/lib/api";

interface Stock {
    id: number;
    symbol: string;
    name: string;
}

interface StockSelectionModalProps {
    isOpen: boolean;
    onConfirm: (selectedIds: string[], dateRange: { start: string; end: string }) => void;
    initialSelection?: string[];
    initialDateRange?: { start: string; end: string };
}

export default function StockSelectionModal({ isOpen, onConfirm, initialSelection = [], initialDateRange }: StockSelectionModalProps) {
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>(initialSelection);
    const [error, setError] = useState("");

    // Date State
    const [startDate, setStartDate] = useState(initialDateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(initialDateRange?.end || new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (isOpen) {
            fetchStocks();
            setSelectedIds(initialSelection);
            if (initialDateRange) {
                setStartDate(initialDateRange.start);
                setEndDate(initialDateRange.end);
            }
        }
    }, [isOpen]);

    const fetchStocks = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/stocks/');
            const data = response.data.data?.stocks || response.data?.results || [];
            setStocks(data);
        } catch (err) {
            console.error("Failed to fetch stocks", err);
        } finally {
            setLoading(false);
        }
    };

    // Filter locally for smoother UX given list size isn't huge yet
    const filteredStocks = stocks.filter(s =>
        s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleStock = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(i => i !== id));
            setError("");
        } else {
            if (selectedIds.length >= 4) {
                setError("You can select up to 4 stocks.");
                return;
            }
            setSelectedIds(prev => [...prev, id]);
            setError("");
        }
    };

    const handleConfirm = () => {
        if (selectedIds.length === 0) {
            setError("Please select at least 1 stock.");
            return;
        }
        if (selectedIds.length > 4) {
            setError("You can select up to 4 stocks.");
            return;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start > end) {
            setError("Start date cannot be after end date.");
            return;
        }

        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 60) {
            setError("Date range cannot exceed 60 days.");
            return;
        }

        onConfirm(selectedIds, { start: startDate, end: endDate });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh] border border-gray-200 dark:border-gray-800">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Compare Stock History</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Select up to 4 stocks and a date range (max 60 days).
                    </p>
                </div>

                {/* Filters Section */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 space-y-3">
                    {/* Date Range Inputs */}
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by symbol or name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loading ? (
                        <div className="py-10 text-center text-gray-500"><div className="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-blue-600 rounded-full" role="status" aria-label="loading"></div></div>
                    ) : (
                        filteredStocks.map(stock => (
                            <button
                                key={stock.id}
                                onClick={() => toggleStock(stock.id.toString())}
                                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${selectedIds.includes(stock.id.toString())
                                        ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 ring-1 ring-blue-500/20"
                                        : "hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent"
                                    }`}
                            >
                                <div className="text-left">
                                    <div className="font-bold text-gray-900 dark:text-gray-100">{stock.symbol}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{stock.name}</div>
                                </div>
                                {selectedIds.includes(stock.id.toString()) && (
                                    <div className="h-6 w-6 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-sm">
                                        <Check size={14} strokeWidth={3} />
                                    </div>
                                )}
                            </button>
                        ))
                    )}
                    {!loading && filteredStocks.length === 0 && (
                        <div className="py-8 text-center text-gray-500">No stocks found matching "{searchQuery}"</div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex flex-col gap-3">
                    {error && (
                        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg border border-red-100 dark:border-red-800/50">
                            <AlertCircle size={14} />
                            {error}
                        </div>
                    )}
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Selected: <span className="text-gray-900 dark:text-gray-100 font-bold">{selectedIds.length}</span>/4
                        </span>
                        <button
                            onClick={handleConfirm}
                            disabled={selectedIds.length === 0}
                            className={`px-6 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-all flex items-center gap-2 ${selectedIds.length > 0
                                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25"
                                    : "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                                }`}
                        >
                            Compare Stocks
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
