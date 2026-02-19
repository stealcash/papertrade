'use client';

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { patternService, PatternFinderResult } from '@/services/patternService';
// Assuming stock service exists or we need to fetch stocks similar to mobile
import api from '@/lib/api';
import PatternChart from '@/components/charts/PatternChart';
import { Search, Info } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PatternFinderPage() {
    const [symbol, setSymbol] = useState('NIFTY');
    const [tolerance, setTolerance] = useState(0.5);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<PatternFinderResult | null>(null);
    const [stocks, setStocks] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        loadStocks();
    }, []);

    const loadStocks = async () => {
        try {
            // Re-using the same endpoint as mobile
            // Response structure: { status: 'success', data: { stocks: [], pagination: ... } }
            const res = await api.get('/stocks/');
            if (res.data?.data?.stocks) {
                setStocks(res.data.data.stocks);
            } else if (Array.isArray(res.data)) {
                setStocks(res.data);
            }
        } catch (error) {
            console.error('Failed to load stocks', error);
        }
    };

    const handleFind = async () => {
        if (!symbol) {
            toast.error('Please select a stock');
            return;
        }

        setLoading(true);
        try {
            const data = await patternService.find(symbol, tolerance);
            if ((data as any).error) {
                toast.error((data as any).error);
            } else {
                setResult(data);
                toast.success(`Found ${data.count} patterns`);
            }
        } catch (error) {
            toast.error('Failed to analyze patterns');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredStocks = Array.isArray(stocks) ? stocks.filter(s =>
        s.symbol?.toLowerCase().includes(search.toLowerCase()) ||
        s.name?.toLowerCase().includes(search.toLowerCase())
    ) : [];

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Pattern Finder</h1>
                <div className="text-sm text-gray-500">
                    Find historical price patterns similar to the last 7 days.
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                {/* Stock Selector */}
                <div className="md:col-span-4 relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Stock / Index</label>
                    <div
                        className="relative"
                        onClick={() => setShowDropdown(!showDropdown)}
                    >
                        <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white flex items-center justify-between cursor-pointer hover:border-blue-500 transition-colors">
                            <span className="font-medium">{symbol || 'Select Stock'}</span>
                            <Search size={16} className="text-gray-400" />
                        </div>
                    </div>

                    {showDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                            <input
                                type="text"
                                className="w-full p-3 border-b border-gray-100 outline-none text-sm"
                                placeholder="Search..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                            />
                            {filteredStocks.map(stock => (
                                <div
                                    key={stock.symbol}
                                    className="px-4 py-2 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                                    onClick={() => {
                                        setSymbol(stock.symbol);
                                        setShowDropdown(false);
                                    }}
                                >
                                    <span className="font-bold text-gray-800">{stock.symbol}</span>
                                    <span className="text-xs text-gray-500 truncate ml-2 max-w-[150px]">{stock.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Tolerance */}
                <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tolerance ({tolerance}%)
                    </label>
                    <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.1"
                        value={tolerance}
                        onChange={(e) => setTolerance(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>Strict (0.1%)</span>
                        <span>Loose (1.0%)</span>
                    </div>
                </div>

                {/* Action */}
                <div className="md:col-span-4">
                    <button
                        onClick={handleFind}
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Analyzing...' : 'Find Patterns'}
                    </button>
                </div>
            </div>

            {/* Results */}
            {result && (
                <div className="space-y-6 animate-fade-in">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                            <div>
                                <div className="text-sm text-gray-500 mb-1">Matches Found</div>
                                <div className="text-2xl font-bold text-gray-900">{result.count}</div>
                            </div>
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                                <Search size={20} />
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                            <div>
                                <div className="text-sm text-gray-500 mb-1">Avg 3-Day Return</div>
                                <div className={`text-2xl font-bold ${result.avg_3d_return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {result.avg_3d_return > 0 ? '+' : ''}{result.avg_3d_return.toFixed(2)}%
                                </div>
                            </div>
                            <div className={`p-3 rounded-full ${result.avg_3d_return >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                <Info size={20} />
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                            <div className="text-sm text-gray-500 mb-2">Current Target Pattern</div>
                            <div className="h-10">
                                <PatternChart
                                    data={result.target_pattern.map(d => d.change_pct)}
                                    height={40}
                                    barWidth={4}
                                    gap={2}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Matches Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {result.matches.map((match, idx) => {
                            const chartData = [
                                ...match.pattern_data,
                                ...match.projection_data.map(d => d.change_pct)
                            ];
                            const next3Return = match.projection_data.reduce((sum, d) => sum + d.change_pct, 0);

                            return (
                                <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="font-bold text-gray-900 text-sm">{match.date}</div>
                                            <div className="text-xs text-gray-500">End Date</div>
                                        </div>
                                        <div className={`px-2 py-1 rounded text-xs font-bold ${next3Return >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            3D: {next3Return > 0 ? '+' : ''}{next3Return.toFixed(2)}%
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <PatternChart
                                            data={chartData}
                                            highlightLast={3}
                                            height={60}
                                        />
                                    </div>

                                    <div className="pt-3 border-t border-gray-50 flex justify-between text-xs text-gray-500">
                                        <div>Start: {match.start_date}</div>
                                        <div>
                                            {match.projection_data[0]?.close?.toFixed(0)} → {match.projection_data[2]?.close?.toFixed(0)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
