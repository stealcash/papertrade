'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Info, Layers, Target, Clock, AlertTriangle } from 'lucide-react';
import { optionStrategiesAPI } from '@/lib/api';

export default function ViewOptionStrategyPage() {
    const router = useRouter();
    const params = useParams();
    const [loading, setLoading] = useState(true);
    const [strategy, setStrategy] = useState<any>(null);

    useEffect(() => {
        if (params.id) {
            fetchStrategy(params.id as string);
        }
    }, [params.id]);

    const fetchStrategy = async (id: string) => {
        try {
            setLoading(true);
            const res = await optionStrategiesAPI.get(id);
            setStrategy(res.data.data || res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
        );
    }

    if (!strategy) {
        return (
            <div className="max-w-4xl mx-auto py-10 px-4 text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Strategy Not Found</h1>
                <button onClick={() => router.back()} className="text-blue-600 hover:underline">Go back</button>
            </div>
        );
    }

    const { configuration } = strategy;
    const { legs = [], entry = {}, exit = {} } = configuration || {};

    return (
        <div className="max-w-5xl mx-auto py-10 px-4 space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-500 hover:text-black transition w-fit"
                >
                    <ChevronLeft size={20} /> Back to Strategies
                </button>
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl font-extrabold text-gray-900">{strategy.name}</h1>
                            {strategy.is_system && (
                                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded">SYSTEM</span>
                            )}
                        </div>
                        <p className="text-gray-500 mt-2 text-lg max-w-2xl">{strategy.description || 'No description provided.'}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Details & Legs */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Legs Section */}
                    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                            <Layers size={18} className="text-gray-400" />
                            <h2 className="font-bold text-gray-800">Strategy Legs</h2>
                            <span className="ml-auto bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
                                {legs.length} {legs.length === 1 ? 'Leg' : 'Legs'}
                            </span>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {legs.map((leg: any, idx: number) => (
                                <div key={leg.id || idx} className="p-6 hover:bg-gray-50 transition">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${leg.action === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {leg.action}
                                            </span>
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${leg.type === 'CE' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                {leg.type}
                                            </span>
                                            <span className="text-sm font-bold text-gray-900">
                                                {leg.strikeSelection === 'ATM' ? 'At The Market (ATM)' :
                                                    leg.strikeSelection === 'ATM_PLUS' ? `ATM + ${leg.strikeOffset}${leg.strikeOffsetType}` :
                                                        `ATM - ${leg.strikeOffset}${leg.strikeOffsetType}`}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-400 font-medium">Slot ×{leg.lotMultiplier || 1}</div>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                                        <div>
                                            <p className="text-gray-400 uppercase tracking-wider mb-1">Rounding</p>
                                            <p className="font-semibold text-gray-700">
                                                {leg.strikeRounding === 'UP' ? 'Round Up ↑' : leg.strikeRounding === 'DOWN' ? 'Round Down ↓' : 'Nearest Strike'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 uppercase tracking-wider mb-1">Select By</p>
                                            <p className="font-semibold text-gray-700">{leg.selectBy === 'PREMIUM' ? 'Target Premium' : 'Strike'}</p>
                                        </div>
                                        {leg.selectBy === 'PREMIUM' && (
                                            <div>
                                                <p className="text-gray-400 uppercase tracking-wider mb-1">Premium Range</p>
                                                <p className="font-semibold text-gray-700">₹{leg.minPremium} - ₹{leg.maxPremium}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Leg-wise Risk Management */}
                                    {(leg.stopLoss?.enabled || leg.takeProfit?.enabled || leg.trailingStopLoss?.enabled) && (
                                        <div className="mt-4 pt-4 border-t border-dashed border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            {leg.stopLoss?.enabled && (
                                                <div className="flex items-center gap-1.5 text-[11px] text-red-600 font-medium">
                                                    <AlertTriangle size={12} /> SL: {leg.stopLoss.value}{leg.stopLoss.type}
                                                </div>
                                            )}
                                            {leg.takeProfit?.enabled && (
                                                <div className="flex items-center gap-1.5 text-[11px] text-green-600 font-medium">
                                                    <Target size={12} /> TP: {leg.takeProfit.value}{leg.takeProfit.type}
                                                </div>
                                            )}
                                            {leg.trailingStopLoss?.enabled && (
                                                <div className="flex items-center gap-1.5 text-[11px] text-blue-600 font-medium">
                                                    <Clock size={12} /> TSL: {leg.trailingStopLoss.value}{leg.trailingStopLoss.type}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Right Column: Entry & Exit Settings */}
                <div className="space-y-6">
                    {/* Entry Section */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 overflow-hidden relative">
                        <div className="flex items-center gap-2 mb-4">
                            <Target size={18} className="text-green-500" />
                            <h3 className="font-bold text-gray-800">Entry Criteria</h3>
                        </div>
                        {strategy.description && (
                            <p className="text-xs text-gray-500 mb-4 pb-4 border-b border-gray-50 leading-relaxed italic">
                                "{strategy.description}"
                            </p>
                        )}
                        <div className="space-y-4 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Mode</span>
                                <span className="font-semibold text-gray-900">{entry.mode === 'DAILY' ? 'Everyday' : 'Expiry Based'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Price Reference</span>
                                <span className="font-semibold text-gray-900">{entry.priceRef} Price</span>
                            </div>
                            {entry.mode === 'EXPIRY_BASED' && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">X Days Before Expiry</span>
                                    <span className="font-semibold text-gray-900">{entry.daysBeforeExpiry} Days</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-gray-500">Holiday Mode</span>
                                <span className="font-semibold text-gray-900">{entry.holidayEntryMode || (entry.flexibleEntry ? 'PREVIOUS' : 'NONE')}</span>
                            </div>

                            {/* Wait and Trade */}
                            {entry.waitAndTrade?.enabled && (
                                <div className="pt-4 mt-2 border-t border-gray-100 space-y-2">
                                    <div className="flex items-center gap-1 text-xs font-bold text-blue-600 uppercase">
                                        Wait & Trade Enabled
                                    </div>
                                    <div className="text-xs text-gray-600">
                                        Wait for {entry.waitAndTrade.value}% {entry.waitAndTrade.type.toLowerCase()}
                                        from {
                                            entry.waitAndTrade.ref === 'XTH_DAY_OPEN' ? `Day ${entry.waitAndTrade.refDays} Open` :
                                                entry.waitAndTrade.ref === 'XTH_DAY_CLOSE' ? `Day ${entry.waitAndTrade.refDays} Close` :
                                                    entry.waitAndTrade.ref.replace('_', ' ')
                                        }
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Exit Section */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 overflow-hidden relative">
                        <div className="flex items-center gap-2 mb-4">
                            <Clock size={18} className="text-red-500" />
                            <h3 className="font-bold text-gray-800">Exit Criteria</h3>
                        </div>
                        <div className="space-y-4 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Type</span>
                                <span className="font-semibold text-gray-900">
                                    {exit.type === 'DAYS_BEFORE_EXPIRY' ? 'Days Before Expiry' : exit.type}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Day/Time Offset</span>
                                <span className="font-semibold text-gray-900">{exit.daysBeforeExpiry} Days Before</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Exit Reference</span>
                                <span className="font-semibold text-gray-900">{exit.exitTimeRef} Price</span>
                            </div>
                        </div>

                        {/* Global Risk Management */}
                        {exit.riskManagementMode === 'GLOBAL' && (exit.stopLoss?.enabled || exit.takeProfit?.enabled || exit.trailingStopLoss?.enabled) && (
                            <div className="mt-6 pt-4 border-t border-gray-100 space-y-4">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Global Risk Management</h4>
                                <div className="space-y-3">
                                    {exit.stopLoss?.enabled && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-red-600 font-medium">Global Stop Loss</span>
                                            <span className="font-bold text-red-600">{exit.stopLoss.value}{exit.stopLoss.type}</span>
                                        </div>
                                    )}
                                    {exit.takeProfit?.enabled && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-green-600 font-medium">Global Take Profit</span>
                                            <span className="font-bold text-green-600">{exit.takeProfit.value}{exit.takeProfit.type}</span>
                                        </div>
                                    )}
                                    {exit.trailingStopLoss?.enabled && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-blue-600 font-medium">Global TSL</span>
                                            <span className="font-bold text-blue-600">{exit.trailingStopLoss.value}{exit.trailingStopLoss.type}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                        <Info size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-700 leading-relaxed">
                            This is a <strong>Read-Only</strong> view. System strategies cannot be modified directly.
                            To customize this strategy, you can create a new strategy based on these parameters.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
