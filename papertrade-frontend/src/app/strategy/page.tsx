'use client';

import { useEffect, useState } from 'react';
import { strategiesAPI } from '@/lib/api';
import { Layers, Users, Plus } from 'lucide-react';

// ---------------- Mock as fallback ---------------- //
const MOCK_PREDEFINED = [
    { id: 1, name: "Moving Average Crossover", description: "Classic trend-following strategy using 50 & 200 MA" },
    { id: 2, name: "RSI Mean Reversion", description: "Buy oversold / sell overbought using RSI" },
    { id: 3, name: "Breakout Trading", description: "Trades support / resistance breakouts" },
];

const MOCK_RULE_BASED = [
    { id: 1, name: "My Custom Strategy", description: "MACD + Volume signals combined" },
    { id: 2, name: "Sector Rotation", description: "Momentum-based sector allocation" },
];

const MOCK_ACTIVE_STRATEGIES = [
    { id: 1, name: "Alpha Trend", description: "Captures long-term trends in volatile markets." },
    { id: 2, name: "Delta Neutral", description: "Hedges against directional market moves." },
];

export default function StrategyPage() {

    const [predefined, setPredefined] = useState<any[]>([]);
    const [custom, setCustom] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { load(); }, []);

    async function load() {
        try {
            const p = await strategiesAPI.getPredefined();
            const r = await strategiesAPI.getRuleBased();
            setPredefined(p.data.data || []);
            setCustom(r.data.data || []);
        } catch {
            setPredefined(MOCK_PREDEFINED);
            setCustom(MOCK_RULE_BASED);
        }
        setLoading(false);
    }

    if (loading) return (
        <div className="flex justify-center items-center h-64 text-gray-500 text-lg">
            Loading strategies...
        </div>
    );

    return (

        <div className="space-y-12 max-w-7xl">

            {/* ---------------- Header ---------------- */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Strategies</h1>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                    Create New Strategy
                </button>
            </div>

            {/* Active Strategies */}
            <section>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">Active Strategies</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {MOCK_ACTIVE_STRATEGIES.map((strategy) => (
                        <div key={strategy.id} className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition">
                            <h3 className="text-gray-900 dark:text-gray-100 font-semibold text-lg mb-2">{strategy.name}</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-5 leading-relaxed">{strategy.description}</p>
                            <button className="w-full py-2.5 rounded-md bg-black text-white text-sm font-semibold hover:bg-gray-900 transition">
                                View Details
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            {/* ---------------- Predefined Section ---------------- */}
            <section className="space-y-5">
                <div className="flex items-center gap-2">
                    <Layers size={22} className="text-black dark:text-gray-100" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Predefined Strategies</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {predefined.length ? predefined.map((s) => (
                        <div key={s.id}
                            className="border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition bg-white dark:bg-gray-900"
                        >

                            <h3 className="text-gray-900 dark:text-gray-100 font-semibold text-lg mb-2">{s.name}</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-5 leading-relaxed">{s.description}</p>

                            <button className="w-full py-2.5 rounded-md bg-black dark:bg-gray-800 text-white text-sm font-semibold hover:bg-gray-900 dark:hover:bg-gray-700 transition border dark:border-gray-700">
                                Use Strategy
                            </button>

                        </div>
                    ))
                        :
                        <p className="text-gray-500 col-span-full text-center py-6">
                            No predefined strategies available
                        </p>}
                </div>
            </section>

            {/* ---------------- Custom Strategies ---------------- */}
            <section className="space-y-5">
                <div className="flex items-center gap-2">
                    <Users size={22} className="text-black dark:text-gray-100" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Strategies</h2>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden bg-white dark:bg-gray-800">
                    {custom.length ? (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">

                            {custom.map((s) => (
                                <div key={s.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-gray-900 dark:text-gray-100">{s.name}</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{s.type}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${s.status === 'Active' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                                            {s.status}
                                        </span>
                                    </div>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{s.description}</p>

                                    <div className="flex justify-between items-center text-sm border-t border-gray-100 dark:border-gray-800 pt-4 mt-4">
                                        <div>
                                            <p className="text-gray-500 dark:text-gray-400">Total Return</p>
                                            <p className="font-semibold text-green-600 dark:text-green-400">{s.return}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-gray-500 dark:text-gray-400">Win Rate</p>
                                            <p className="font-semibold text-gray-900 dark:text-gray-100">{s.winRate}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 mt-4">
                                        <button className="px-5 py-2 bg-black text-white rounded-md text-sm hover:bg-gray-900 transition">
                                            Run Backtest
                                        </button>
                                        <button className="px-5 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600 transition">
                                            Edit
                                        </button>
                                    </div>
                                </div>
                            ))}

                        </div>
                    ) : (
                        <p className="p-8 text-center text-gray-500">No custom strategies yet</p>
                    )}
                </div>
            </section >

        </div >
    )
}
