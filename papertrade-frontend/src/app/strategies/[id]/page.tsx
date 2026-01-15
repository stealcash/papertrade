'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { strategiesAPI, backtestAPI } from '@/lib/api';
import { ArrowLeft, Calendar, Search, TrendingUp, TrendingDown, Target, Clock, RefreshCw, Info } from 'lucide-react';
import Link from 'next/link';
import SignalHistoryModal from '@/components/strategies/SignalHistoryModal';

export default function StrategyDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string; // Now ID

    const [strategy, setStrategy] = useState<any>(null);
    const [performanceData, setPerformanceData] = useState<any[]>([]);
    const [latestBacktest, setLatestBacktest] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [selectedSector, setSelectedSector] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [allSectors, setAllSectors] = useState<string[]>([]);
    const [allCategories, setAllCategories] = useState<string[]>([]);

    const [dateRange, setDateRange] = useState<{ min: string | null, max: string | null }>({ min: null, max: null });

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStock, setSelectedStock] = useState<{ id: number, symbol: string } | null>(null);
    const [showDescription, setShowDescription] = useState(false);

    useEffect(() => {
        if (id) {
            loadData();
        }
    }, [id]);

    async function loadData() {
        setLoading(true);
        try {
            // 1. Fetch Strategy Details by ID
            let stratData = null;
            try {
                const res = await strategiesAPI.get(id);
                stratData = res.data.data || res.data;
            } catch (e) {
                console.error("Failed to fetch strategy by ID", e);
            }
            setStrategy(stratData);

            // If we have strategy code from data, we can use it for backtest lookup if needed, 
            // but for performance signal API we can use ID.
            const strategyCode = stratData?.code;

            // 2. Fetch Performance Stats (Last 60 Days)
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 60);
            const startDateStr = startDate.toISOString().split('T')[0];

            // Use strategy_id param
            const perfRes = await strategiesAPI.getPerformance({
                strategy_id: id,
                start_date: startDateStr
            });

            const perfData = perfRes.data.data || perfRes.data?.data || [];
            const meta = perfRes.data.metadata || perfRes.data?.metadata || {};

            setDateRange({
                min: meta.min_date || startDateStr,
                max: meta.max_date || new Date().toISOString().split('T')[0]
            });

            if (meta.all_sectors) setAllSectors(meta.all_sectors);
            if (meta.all_categories) setAllCategories(meta.all_categories);

            if (Array.isArray(perfData)) {
                setPerformanceData(perfData);
            } else {
                setPerformanceData([]);
            }

            // 3. Fetch Latest Backtest (for Stats)
            // Backtest runs are usually linked by strategy code in this system currently?
            // Or can we filter by strategy_id?
            // The backtestAPI.getRuns likely takes code or id. Let's check logic. 
            // Previous code used code. Let's try to use code if valid, else use ID.
            if (strategyCode) {
                try {
                    const runsRes = await backtestAPI.getRuns({ strategy_code: strategyCode });
                    const runs = runsRes.data.data?.results || runsRes.data?.data || [];
                    const latest = runs.find((r: any) => r.strategy_predefined === strategyCode && r.status === 'COMPLETED');
                    if (latest) {
                        setLatestBacktest(latest);
                    }
                } catch (e) { console.error(e) }
            }

        } catch (e) {
            console.error("Failed to load strategy details", e);
        } finally {
            setLoading(false);
        }
    }

    // Top 5 Performers from Backtest Data
    const topStocks = useMemo(() => {
        if (!latestBacktest || !latestBacktest.list_of_trades_json) return [];

        const stats: Record<string, { wins: number, total: number }> = {};
        latestBacktest.list_of_trades_json.forEach((trade: any) => {
            const sym = trade.stock_symbol;
            if (!stats[sym]) stats[sym] = { wins: 0, total: 0 };
            stats[sym].total += 1;
            if (trade.result === 'WIN') stats[sym].wins += 1;
        });

        return Object.entries(stats)
            .map(([symbol, data]) => ({
                symbol,
                wins: data.wins,
                total: data.total,
                rate: (data.wins / data.total) * 100
            }))
            .sort((a, b) => b.rate - a.rate || b.wins - a.wins)
            .slice(0, 5);
    }, [latestBacktest]);

    // Top 5 Live Performers (Global, Unfiltered or Filtered?)
    // User asked "Top 5 performance stock" above "This page shows live...".
    // Let's make it based on live data, perhaps global best.
    const topLivePerformers = useMemo(() => {
        return [...performanceData]
            .sort((a, b) => b.win_rate - a.win_rate || b.wins - a.wins)
            .slice(0, 5);
    }, [performanceData]);

    // Last Sync Stats (Loose)
    const lastSyncFromData = dateRange.max || 'N/A';

    const filteredSignals = performanceData.filter(s => {
        const matchesSearch = s.stock_symbol?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSector = selectedSector ? s.sectors?.includes(selectedSector) : true;
        const matchesCategory = selectedCategory ? s.categories?.includes(selectedCategory) : true;

        return matchesSearch && matchesSector && matchesCategory;
    });

    if (loading) return <div className="flex h-screen items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>;
    if (!strategy) return <div className="p-10 text-center">Strategy Not Found</div>;

    return (
        <div className="max-w-7xl mx-auto py-10 px-4 pb-20">
            {/* Header with Title and Info Tooltip */}
            <div className="flex justify-between items-start mb-10">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-bold text-gray-900">{strategy.name}</h1>
                        <div className="relative">
                            <button
                                onMouseEnter={() => setShowDescription(true)}
                                onMouseLeave={() => setShowDescription(false)}
                                className="text-gray-400 hover:text-blue-600 transition p-1"
                            >
                                <Info size={20} />
                            </button>
                            {/* Simple Tooltip */}
                            {showDescription && (
                                <div className="absolute left-full top-0 ml-2 w-72 bg-gray-900 text-white text-sm p-3 rounded-lg shadow-xl z-50">
                                    <p>{strategy.description}</p>
                                    <div className="mt-2 text-xs text-gray-400 border-t border-gray-700 pt-2">
                                        Logic: Signal = Direction, Momentum = Close - Prev Close.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                        <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md font-medium">System Strategy</span>
                        <span className="flex items-center gap-1"><Clock size={14} /> Last Data: {lastSyncFromData}</span>
                    </div>
                </div>

                {latestBacktest && (
                    <div className="text-right bg-gray-50 p-4 rounded-xl border border-gray-100 min-w-[200px]">
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Win Rate</p>
                        <div className={`text-4xl font-bold ${Number(latestBacktest.win_rate) >= 50 ? 'text-green-600' : 'text-red-500'}`}>
                            {latestBacktest.win_rate}%
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Based on last backtest</p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* ... Left Side (Table) ... */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Filters & Header */}
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <TrendingUp size={20} className="text-blue-600" /> Stock Performance
                            </h2>
                            {dateRange.min && (
                                <span className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                    {dateRange.min} — {dateRange.max}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search Stock..."
                                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-full focus:ring-2 focus:ring-black focus:outline-none"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Sector Filter */}
                            <select
                                className="border border-gray-200 rounded-lg text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-black bg-white"
                                value={selectedSector}
                                onChange={(e) => setSelectedSector(e.target.value)}
                            >
                                <option value="">All Sectors</option>
                                {allSectors.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>

                            {/* Category Filter */}
                            <select
                                className="border border-gray-200 rounded-lg text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-black bg-white"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                <option value="">All Categories</option>
                                {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto mt-2">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3">Stock</th>
                                    <th className="px-6 py-3 text-center">Signals</th>
                                    <th className="px-6 py-3 text-center">Wins</th>
                                    <th className="px-6 py-3 text-center">Losses</th>
                                    <th className="px-6 py-3 text-center">Win Rate</th>
                                    <th className="px-6 py-3 text-right">Total PnL</th>
                                    <th className="px-6 py-3 text-right whitespace-nowrap min-w-[140px] pr-8">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredSignals.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                            No data found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSignals.slice(0, 50).map((item: any, i: number) => (
                                        <tr
                                            key={i}
                                            className="hover:bg-gray-50 transition cursor-pointer"
                                            onClick={() => setSelectedStock({ id: item.stock_id, symbol: item.stock_symbol })}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900">{item.stock_symbol}</div>
                                                {(item.sectors?.length > 0 || item.categories?.length > 0) && (
                                                    <div className="text-xs text-gray-400 mt-0.5 flex gap-1 flex-wrap">
                                                        {item.sectors?.map((s: string) => <span key={s}>{s}</span>)}
                                                        {item.categories?.length > 0 && <span className="text-gray-300">|</span>}
                                                        {item.categories?.map((c: string) => <span key={c}>{c}</span>)}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center text-gray-600">{item.total_signals}</td>
                                            <td className="px-6 py-4 text-center text-green-600 font-medium">{item.wins}</td>
                                            <td className="px-6 py-4 text-center text-red-500 font-medium">{item.losses}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${item.win_rate >= 50 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                                                    }`}>
                                                    {item.win_rate}%
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 text-right font-mono font-medium ${item.total_pnl > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                {item.total_pnl ? Number(item.total_pnl).toFixed(2) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right pr-8 whitespace-nowrap">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedStock({ id: item.stock_id, symbol: item.stock_symbol });
                                                    }}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-semibold rounded-lg hover:bg-blue-100 transition"
                                                >
                                                    View Trades
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        {filteredSignals.length > 50 && (
                            <div className="p-3 text-center text-xs text-gray-400 border-t border-gray-100">
                                Showing top 50 rows
                            </div>
                        )}
                    </div>
                </div>

                {/* ───────── RIGHT: Sidebar ───────── */}
                <div className="space-y-6">
                    {/* Top 5 Performers Card (Live Data) */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Target size={18} className="text-purple-600" /> Top Performers (Live)
                        </h2>
                        {topLivePerformers.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-4">No enough data</p>
                        ) : (
                            <div className="space-y-3">
                                {topLivePerformers.map((stock, i) => (
                                    <div key={stock.stock_symbol} className="flex justify-between items-center text-sm border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`
                                                  w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold 
                                                  ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}
                                              `}>
                                                {i + 1}
                                            </span>
                                            <span className="font-medium text-gray-900">{stock.stock_symbol}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-green-600">{stock.win_rate}%</div>
                                            <div className="text-[10px] text-gray-400">{stock.wins} Wins</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {latestBacktest && (
                        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Clock size={18} className="text-orange-500" /> Backtest History
                            </h2>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <p className="text-xs text-gray-500">Wins</p>
                                        <p className="text-lg font-bold text-green-600">{latestBacktest.win_count}</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <p className="text-xs text-gray-500">Losses</p>
                                        <p className="text-lg font-bold text-red-500">{latestBacktest.loss_count}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            <SignalHistoryModal
                isOpen={!!selectedStock}
                onClose={() => setSelectedStock(null)}
                stockSymbol={selectedStock?.symbol || ''}
                stockId={selectedStock?.id || 0}
                strategyCode={strategy?.code}
            />
        </div>
    );
}
