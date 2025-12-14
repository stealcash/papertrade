'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { stocksAPI } from '@/lib/api';
import { Search, TrendingUp, TrendingDown } from 'lucide-react';

export default function StocksPage() {
    const [stocks, setStocks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchStocks();
    }, []);

    const fetchStocks = async () => {
        try {
            const response = await stocksAPI.getAll();
            // Backend returns { stocks: [...], pagination: {...} }
            const stockData = response.data.data?.stocks || [];
            setStocks(Array.isArray(stockData) ? stockData : []);
        } catch (error) {
            console.error('Failed to fetch stocks', error);
            setStocks([]);
        } finally {
            setLoading(false);
        }
    };

    const filtered = stocks.filter(stock =>
        stock.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-gray-400">Loading Stocks...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">

            {/* Page Title */}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Stocks</h1>

            {/* Search Bar */}
            <div className="relative w-full max-w-md">
                <Search size={20} className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search stocks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder-gray-400 
                               focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
            </div>

            {/* White Card Stock List */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">

                {filtered.length > 0 ? (
                    <div className="divide-y divide-gray-200 dark:divide-gray-800">
                        {filtered.map(stock => (
                            <Link
                                key={stock.id}
                                href={`/stocks/${stock.id}`}
                                className="block px-8 py-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                            >
                                <div className="flex justify-between items-center">

                                    <div>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{stock.symbol}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{stock.name}</p>
                                    </div>

                                    <div className="text-right">
                                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                                            {/* TODO: Add live price usage when available */}
                                            {stock.last_price ? `₹${stock.last_price.toFixed(2)}` : '--'}
                                        </p>

                                        {stock.price_change !== undefined && (
                                            <span className={`flex items-center justify-end gap-1 mt-1 text-sm 
                                                ${stock.price_change >= 0 ? "text-green-600" : "text-red-600"}`}>
                                                {stock.price_change >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                                                {stock.price_change.toFixed(2)}%
                                            </span>
                                        )}
                                    </div>

                                </div>
                            </Link>
                        ))}
                    </div>

                ) : (
                    <p className="text-center py-10 text-gray-400">
                        No results found
                    </p>
                )}
            </div>

        </div>
    );
}
