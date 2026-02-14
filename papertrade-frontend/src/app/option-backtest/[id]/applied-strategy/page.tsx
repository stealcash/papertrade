'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Layers, Target, Clock, AlertTriangle, FileText, Info } from 'lucide-react';
import apiClient from '@/lib/api';

export default function AppliedStrategySnapshotPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [run, setRun] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id && !isNaN(Number(id))) {
            loadData();
        }
    }, [id]);

    async function loadData() {
        try {
            const res = await apiClient.get(`/backtest/option-backtest/${id}/`);
            setRun(res.data.data);
        } catch (err) {
            console.error('Failed to load option backtest snapshot', err);
        }
        setLoading(false);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
        );
    }

    if (!run) {
        return (
            <div className="max-w-4xl mx-auto py-10 px-4 text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Backtest Run Not Found</h1>
                <button onClick={() => router.back()} className="text-blue-600 hover:underline">Go back</button>
            </div>
        );
    }

    const config = run.snapshot_config || {};
    const { legs = [], entry = {}, exit = {} } = config;

    return (
        <div className="max-w-6xl mx-auto py-10 px-4 space-y-10">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-500 hover:text-black transition w-fit group"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Backtest Details
                </button>

                <div className="flex justify-between items-end border-b border-gray-100 pb-8">
                    <div>
                        <div className="flex items-center gap-4 mb-3">
                            <div className="bg-blue-600 p-2.5 rounded-xl shadow-blue-100 shadow-lg">
                                <FileText className="text-white" size={24} />
                            </div>
                            <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">
                                Strategy Snapshot
                            </span>
                        </div>
                        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                            {run.snapshot_name || run.strategy_name}
                        </h1>
                        <p className="text-gray-400 mt-2 font-medium flex items-center gap-2">
                            Used in Backtest <span className="text-gray-900 font-bold">#{run.run_id}</span> • {new Date(run.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Left Column: Details & Legs */}
                <div className="lg:col-span-2 space-y-10">
                    {/* Legs Section */}
                    <section className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden border-b-4 border-gray-100/50">
                        <div className="px-8 py-6 bg-gray-50/50 border-b border-gray-100 flex items-center gap-3">
                            <div className="bg-gray-900 p-1.5 rounded-lg">
                                <Layers size={16} className="text-white" />
                            </div>
                            <h2 className="font-black text-gray-900 uppercase tracking-widest text-xs">Strategy Structure</h2>
                            <span className="ml-auto bg-gray-200 text-gray-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tight">
                                {legs.length} {legs.length === 1 ? 'Leg' : 'Legs'}
                            </span>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {legs.map((leg: any, idx: number) => (
                                <div key={idx} className="p-8 hover:bg-gray-50/30 transition-colors group">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[10px] font-black px-3 py-1 rounded-lg shadow-sm border ${leg.action === 'BUY' ? 'bg-green-500 border-green-600 text-white' : 'bg-red-500 border-red-600 text-white'}`}>
                                                {leg.action}
                                            </span>
                                            <span className={`text-[10px] font-black px-3 py-1 rounded-lg shadow-sm border ${leg.type === 'CE' ? 'bg-blue-600 border-blue-700 text-white' : 'bg-purple-600 border-purple-700 text-white'}`}>
                                                {leg.type}
                                            </span>
                                            <span className="text-lg font-black text-gray-900 tracking-tight">
                                                {leg.strikeSelection === 'ATM' ? 'At The Market (ATM)' :
                                                    leg.strikeSelection === 'ATM_PLUS' ? `ATM + ${leg.strikeOffset}${leg.strikeOffsetType}` :
                                                        `ATM - ${leg.strikeOffset}${leg.strikeOffsetType}`}
                                            </span>
                                        </div>
                                        <div className="text-[10px] font-black text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 uppercase tracking-widest">
                                            Slot ×{leg.lotMultiplier || 1}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-sm mb-6">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-1.5">Rounding</p>
                                            <p className="font-bold text-gray-700">
                                                {leg.strikeRounding === 'UP' ? 'Round Up ↑' : leg.strikeRounding === 'DOWN' ? 'Round Down ↓' : 'Nearest Strike'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-1.5">Selection Logic</p>
                                            <p className="font-bold text-gray-700">{leg.selectBy === 'PREMIUM' ? 'Target Premium' : 'Direct Strike'}</p>
                                        </div>
                                        {leg.selectBy === 'PREMIUM' && (
                                            <div>
                                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-1.5">Premium Range</p>
                                                <p className="font-bold text-gray-700">₹{leg.minPremium} - ₹{leg.maxPremium}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Leg-wise Risk Management */}
                                    {(leg.stopLoss?.enabled || leg.takeProfit?.enabled || leg.trailingStopLoss?.enabled) && (
                                        <div className="mt-6 pt-6 border-t border-gray-100 flex flex-wrap gap-4">
                                            {leg.stopLoss?.enabled && (
                                                <div className="flex items-center gap-2 text-[10px] font-black text-red-600 bg-red-50 px-3 py-2 rounded-xl border border-red-100 shadow-sm">
                                                    <AlertTriangle size={12} /> SL: {leg.stopLoss.value}{leg.stopLoss.type}
                                                </div>
                                            )}
                                            {leg.takeProfit?.enabled && (
                                                <div className="flex items-center gap-2 text-[10px] font-black text-green-600 bg-green-50 px-3 py-2 rounded-xl border border-green-100 shadow-sm">
                                                    <Target size={12} /> TP: {leg.takeProfit.value}{leg.takeProfit.type}
                                                </div>
                                            )}
                                            {leg.trailingStopLoss?.enabled && (
                                                <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-2 rounded-xl border border-blue-100 shadow-sm">
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
                <div className="space-y-8">
                    {/* Entry Section */}
                    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 overflow-hidden relative border-b-4 border-gray-100/50">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="bg-green-500 p-2 rounded-xl shadow-green-100 shadow-lg">
                                <Target size={18} className="text-white" />
                            </div>
                            <h3 className="font-black text-gray-900 uppercase tracking-widest text-xs">Entry Criteria</h3>
                        </div>

                        <div className="space-y-6 text-sm">
                            <div className="flex justify-between items-center bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pricing Mode</span>
                                <span className="font-black text-gray-900 uppercase text-[11px]">{entry.mode === 'DAILY' ? 'Everyday' : 'Expiry Based'}</span>
                            </div>

                            <div className="space-y-4 px-1">
                                <div className="flex justify-between">
                                    <span className="text-gray-400 font-bold text-xs">Price Reference</span>
                                    <span className="font-black text-gray-900 text-xs">{entry.priceRef} Chart</span>
                                </div>
                                {entry.mode === 'EXPIRY_BASED' && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-400 font-bold text-xs">Days Before Expiry</span>
                                        <span className="font-black text-gray-900 text-xs">{entry.daysBeforeExpiry} Trading Days</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-gray-400 font-bold text-xs">Holiday Mode</span>
                                    <span className={`font-black text-xs uppercase ${entry.holidayEntryMode && entry.holidayEntryMode !== 'NONE' ? 'text-blue-600' : 'text-gray-900'}`}>
                                        {entry.holidayEntryMode || (entry.flexibleEntry ? 'PREVIOUS' : 'NONE')}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400 font-bold text-xs">Entry Execution</span>
                                    <span className="font-black text-gray-900 text-xs">{entry.entryTime?.type?.replace('_', ' ') || 'Immediate'} {entry.entryTime?.time && `@ ${entry.entryTime.time}`}</span>
                                </div>
                            </div>

                            {/* Wait and Trade */}
                            {entry.waitAndTrade?.enabled && (
                                <div className="pt-6 mt-6 border-t border-gray-100 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full shadow-blue-200 shadow-lg" />
                                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Wait & Trade Active</p>
                                    </div>
                                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 text-[11px] font-bold text-blue-800 leading-relaxed shadow-sm">
                                        Wait for {entry.waitAndTrade.value}% {entry.waitAndTrade.type.toLowerCase()}
                                        from {
                                            entry.waitAndTrade.ref === 'XTH_DAY_OPEN' ? `Day ${entry.waitAndTrade.refDays} Open` :
                                                entry.waitAndTrade.ref === 'XTH_DAY_CLOSE' ? `Day ${entry.waitAndTrade.refDays} Close` :
                                                    entry.waitAndTrade.ref.replace('_', ' ')
                                        }.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Exit Section */}
                    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 overflow-hidden relative border-b-4 border-gray-100/50">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="bg-red-500 p-2 rounded-xl shadow-red-100 shadow-lg">
                                <Clock size={18} className="text-white" />
                            </div>
                            <h3 className="font-black text-gray-900 uppercase tracking-widest text-xs">Exit Criteria</h3>
                        </div>

                        <div className="space-y-6 text-sm">
                            <div className="flex justify-between items-center bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Primary Exit</span>
                                <span className="font-black text-gray-900 uppercase text-[11px]">
                                    {exit.type === 'DAYS_BEFORE_EXPIRY' ? 'Days Before Expiry' : exit.type?.replace('_', ' ')}
                                </span>
                            </div>

                            <div className="space-y-4 px-1">
                                <div className="flex justify-between">
                                    <span className="text-gray-400 font-bold text-xs">Exit Offset</span>
                                    <span className="font-black text-gray-900 text-xs">{exit.daysBeforeExpiry} Days Before Expiry</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400 font-bold text-xs">Exit Reference</span>
                                    <span className="font-black text-gray-900 text-xs">{exit.exitTimeRef} Price</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400 font-bold text-xs">Exit Time</span>
                                    <span className="font-black text-gray-900 text-xs bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">{exit.exitTime?.time || 'EOD'}</span>
                                </div>
                            </div>

                            {/* Global Risk Management */}
                            {exit.riskManagementMode === 'GLOBAL' && (exit.stopLoss?.enabled || exit.takeProfit?.enabled || exit.trailingStopLoss?.enabled) && (
                                <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
                                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-2 px-1">
                                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full shadow-orange-100 shadow-lg" />
                                        Global Risk Guards
                                    </p>
                                    <div className="space-y-3">
                                        {exit.stopLoss?.enabled && (
                                            <div className="flex justify-between items-center text-[10px] p-3 bg-red-50 rounded-xl border border-red-100 font-black">
                                                <span className="text-red-700">TOTAL STOP LOSS</span>
                                                <span className="text-red-600">{exit.stopLoss.value}{exit.stopLoss.type}</span>
                                            </div>
                                        )}
                                        {exit.takeProfit?.enabled && (
                                            <div className="flex justify-between items-center text-[10px] p-3 bg-green-50 rounded-xl border border-green-100 font-black">
                                                <span className="text-green-700">TOTAL TAKE PROFIT</span>
                                                <span className="text-green-600">{exit.takeProfit.value}{exit.takeProfit.type}</span>
                                            </div>
                                        )}
                                        {exit.trailingStopLoss?.enabled && (
                                            <div className="flex justify-between items-center text-[10px] p-3 bg-blue-50 rounded-xl border border-blue-100 font-black">
                                                <span className="text-blue-700">GLOBAL TRAILING SL</span>
                                                <span className="text-blue-600">{exit.trailingStopLoss.value}{exit.trailingStopLoss.type}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Disclaimer */}
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex gap-3 shadow-sm">
                        <Info size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="space-y-2">
                            <p className="text-[11px] font-black text-amber-900 uppercase tracking-tight">Strategy Snapshot</p>
                            <p className="text-[11px] text-amber-800 leading-relaxed font-bold">
                                This view represents the **exact configuration** of the strategy at the time this backtest was initiated.
                                Changes made to the original strategy after the backtest run are **not** reflected here.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
