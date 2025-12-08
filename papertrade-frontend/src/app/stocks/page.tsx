'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { stocksAPI } from '@/lib/api';
import { Search, TrendingUp, TrendingDown } from 'lucide-react';

// Mock fallback dataset
const MOCK_STOCKS = [
    { id: 1, symbol: 'RELIANCE', company_name: 'Reliance Industries Ltd', last_price: 2456.75, price_change: 2.3 },
    { id: 2, symbol: 'TCS', company_name: 'Tata Consultancy Services', last_price: 3678.90, price_change: -0.8 },
    { id: 3, symbol: 'HDFCBANK', company_name: 'HDFC Bank Ltd', last_price: 1654.30, price_change: 1.2 },
    { id: 4, symbol: 'INFY', company_name: 'Infosys Ltd', last_price: 1432.50, price_change: 0.5 },
    { id: 5, symbol: 'ICICIBANK', company_name: 'ICICI Bank Ltd', last_price: 987.65, price_change: -1.1 },
    { id: 6, symbol: 'HINDUNILVR', company_name: 'Hindustan Unilever Ltd', last_price: 2341.20, price_change: 0.9 },
    { id: 7, symbol: 'ITC', company_name: 'ITC Ltd', last_price: 432.80, price_change: 1.5 },
    { id: 8, symbol: 'SBIN', company_name: 'State Bank of India', last_price: 623.45, price_change: -0.3 },
    { id: 9, symbol: 'BHARTIARTL', company_name: 'Bharti Airtel Ltd', last_price: 1123.90, price_change: 2.1 },
    { id: 10, symbol: 'KOTAKBANK', company_name: 'Kotak Mahindra Bank', last_price: 1789.30, price_change: 0.7 },
];

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
            // Ensure we handle the nested data structure robustly
            const stockData = response.data.data;
            setStocks(Array.isArray(stockData) ? stockData : []);
        } catch (error) {
            console.log('API unavailable — using mock stocks');
            setStocks(MOCK_STOCKS);
        } finally {
            setLoading(false);
        }
    };

    const filtered = stocks.filter(stock =>
        stock.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
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
            <h1 className="text-3xl font-bold text-gray-900">Stocks</h1>

            {/* Search Bar */}
            <div className="relative w-full max-w-md">
                <Search size={20} className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search stocks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 placeholder-gray-400 
                               focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
            </div>

            {/* White Card Stock List */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">

                {filtered.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                        {filtered.map(stock => (
                            <Link
                                key={stock.id}
                                href={`/stocks/${stock.id}`}
                                className="block px-8 py-5 hover:bg-gray-50 transition"
                            >
                                <div className="flex justify-between items-center">

                                    <div>
                                        <p className="text-lg font-semibold text-gray-900">{stock.symbol}</p>
                                        <p className="text-sm text-gray-500">{stock.company_name}</p>
                                    </div>

                                    <div className="text-right">
                                        <p className="font-semibold text-gray-900">
                                            ₹{stock.last_price?.toFixed(2) || '--'}
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
