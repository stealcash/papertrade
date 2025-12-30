import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import MultiSelect from './MultiSelect';

interface FilterState {
    dateRange: { start: string; end: string };
    selectedSectors: string[];
    selectedCategories: string[];
    searchQuery: string;
    filterType: string;
    showWatchlistOnly: boolean;
}

interface FilterSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (filters: FilterState) => void;
    initialFilters: FilterState;
    options: {
        sectors: any[];
        categories: any[];
    };
}

export default function FilterSidebar({ isOpen, onClose, onApply, initialFilters, options }: FilterSidebarProps) {
    const [filters, setFilters] = useState<FilterState>(initialFilters);

    // Sync from props when sidebar opens
    useEffect(() => {
        if (isOpen) {
            setFilters(initialFilters);
        }
    }, [isOpen, initialFilters]);

    const handleApply = () => {
        onApply(filters);
        onClose();
    };

    const handleReset = () => {
        setFilters({
            ...initialFilters,
            // Reset logic: keep date range? or reset all?
            // Let's reset selections but keep date range maybe, or reset all to defaults if we knew them.
            // For now, let's just clear selections.
            selectedSectors: [],
            selectedCategories: [],
            searchQuery: '',
            filterType: 'all',
            showWatchlistOnly: false
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Sidebar */}
            <div className="relative w-full max-w-sm h-full bg-white dark:bg-gray-900 shadow-xl border-l dark:border-gray-800 flex flex-col animate-in slide-in-from-right duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filters</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Search */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Search Stock</label>
                        <input
                            type="text"
                            placeholder="Enter symbol..."
                            value={filters.searchQuery}
                            onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    {/* Type Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Type</label>
                        <select
                            value={filters.filterType}
                            onChange={(e) => setFilters(prev => ({ ...prev, filterType: e.target.value }))}
                            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 outline-none"
                        >
                            <option value="all">All</option>
                            <option value="stock">Stocks</option>
                            <option value="index">Indices</option>
                        </select>
                    </div>

                    {/* Watchlist Toggle */}
                    <div>
                        <label className="flex items-center gap-3 cursor-pointer select-none group">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${filters.showWatchlistOnly ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 group-hover:border-gray-400'}`}>
                                {filters.showWatchlistOnly && <Check size={14} />}
                            </div>
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={filters.showWatchlistOnly}
                                onChange={(e) => setFilters(prev => ({ ...prev, showWatchlistOnly: e.target.checked }))}
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">My Watchlist Only</span>
                        </label>
                    </div>

                    <div className="h-px bg-gray-200 dark:bg-gray-800" />

                    {/* Sectors */}
                    <div>
                        <MultiSelect
                            label="Sectors"
                            options={options.sectors}
                            selected={filters.selectedSectors}
                            onChange={(sel) => setFilters(prev => ({ ...prev, selectedSectors: sel }))}
                            placeholder="All Sectors"
                        />
                    </div>

                    {/* Categories */}
                    <div>
                        <MultiSelect
                            label="Categories"
                            options={options.categories}
                            selected={filters.selectedCategories}
                            onChange={(sel) => setFilters(prev => ({ ...prev, selectedCategories: sel }))}
                            placeholder="All Categories"
                        />
                    </div>

                    <div className="h-px bg-gray-200 dark:bg-gray-800" />

                    {/* Date Range */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date Range</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">From</label>
                                <input
                                    type="date"
                                    value={filters.dateRange.start}
                                    onChange={(e) => setFilters(prev => ({ ...prev, dateRange: { ...prev.dateRange, start: e.target.value } }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">To</label>
                                <input
                                    type="date"
                                    value={filters.dateRange.end}
                                    onChange={(e) => setFilters(prev => ({ ...prev, dateRange: { ...prev.dateRange, end: e.target.value } }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex flex-col gap-3">
                    <button
                        onClick={handleApply}
                        className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 active:translate-y-0.5 transition"
                    >
                        Apply Filters
                    </button>
                    <button
                        onClick={handleReset}
                        className="w-full text-gray-600 dark:text-gray-400 py-2.5 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    >
                        Reset to Default
                    </button>
                </div>
            </div>
        </div>
    );
}
