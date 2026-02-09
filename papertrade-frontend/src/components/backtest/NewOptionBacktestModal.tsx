'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import apiClient from '@/lib/api';
import Link from 'next/link';

import { optionStrategiesAPI, subscriptionsAPI } from '@/lib/api';

const optionBacktestAPI = {
    run: (data: any) => apiClient.post('/backtest/option-backtest/run/', data),
};

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialStrategyId?: number;
}

export default function NewOptionBacktestModal({ isOpen, onClose, onSuccess, initialStrategyId }: ModalProps) {
    const [strategies, setStrategies] = useState<any[]>([]);
    const [stocks, setStocks] = useState<any[]>([]);
    const [indices, setIndices] = useState<any[]>([]);
    const [underlyingType, setUnderlyingType] = useState<'index' | 'stock'>('index');
    const [formData, setFormData] = useState({
        strategy_id: initialStrategyId || '',
        underlying_symbol: '',
        lot_size: 50,
        start_date: '',
        end_date: '',
    });
    const [loading, setLoading] = useState(false);
    const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
    const [upgradeMessage, setUpgradeMessage] = useState('');
    const [subscription, setSubscription] = useState<any>(null);

    // Hardcoded frontend defaults for convenience
    const lotSizeDefaults: Record<string, number> = {
        'NIFTY50': 50,
        'NIFTY': 50,
        'BANKNIFTY': 25,
        'FINNIFTY': 40,
        'MIDCPNIFTY': 75,
    };

    useEffect(() => {
        if (isOpen) {
            fetchStrategies();
            fetchIndices();
            fetchStocks();
            fetchSubscription();
            if (initialStrategyId) {
                setFormData(prev => ({ ...prev, strategy_id: initialStrategyId }));
            }
        }
    }, [isOpen, initialStrategyId]);

    async function fetchStrategies() {
        try {
            const res = await optionStrategiesAPI.getAll();
            const data = res.data.data.results || res.data.data || [];
            setStrategies(data);
        } catch (err) {
            console.error('Failed to load strategies', err);
        }
    }

    async function fetchSubscription() {
        try {
            const res = await subscriptionsAPI.getCurrent();
            if (res.data) {
                setSubscription(res.data.data || res.data);
            }
        } catch (err) {
            console.error("Failed to fetch subscription", err);
        }
    }

    async function fetchIndices() {
        try {
            const res = await apiClient.get('/stocks/?is_index=true&is_option_enable=true');
            const data = res.data.data.stocks || res.data.data.results || [];
            setIndices(data);

            // Set default symbol if type is index and no symbol is selected yet
            if (underlyingType === 'index' && data.length > 0 && !formData.underlying_symbol) {
                const firstAsset = data[0];
                setFormData(prev => ({
                    ...prev,
                    underlying_symbol: firstAsset.symbol,
                    lot_size: lotSizeDefaults[firstAsset.symbol] || 50
                }));
            }
        } catch (err) {
            console.error('Failed to load indices', err);
        }
    }

    async function fetchStocks() {
        try {
            // Fetching stocks that have options enabled and are not indices
            const res = await apiClient.get('/stocks/?is_index=false&is_option_enable=true&page_size=200');
            const data = res.data.data.stocks || res.data.data.results || [];
            setStocks(data);
        } catch (err) {
            console.error('Failed to load stocks', err);
        }
    }

    const handleTypeChange = (type: 'index' | 'stock') => {
        setUnderlyingType(type);
        const assets = type === 'index' ? indices : stocks;
        const firstAsset = assets[0];
        setFormData(prev => ({
            ...prev,
            underlying_symbol: firstAsset?.symbol || '',
            lot_size: lotSizeDefaults[firstAsset?.symbol] || (type === 'index' ? 50 : 1)
        }));
    };

    const handleSymbolChange = (symbol: string) => {
        const assets = underlyingType === 'index' ? indices : stocks;
        const selectedAsset = assets.find(a => a.symbol === symbol);
        setFormData(prev => ({
            ...prev,
            underlying_symbol: symbol,
            lot_size: lotSizeDefaults[symbol] || prev.lot_size
        }));
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                strategy_id: Number(formData.strategy_id),
                underlying_symbol: formData.underlying_symbol,
                lot_size: formData.lot_size,
                start_date: formData.start_date,
                end_date: formData.end_date,
            };
            await optionBacktestAPI.run(payload);
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Backtest Run Error:", err);
            console.log("Error Response Data:", err.response?.data);

            // Check for subscription limit error
            const errData = err.response?.data;
            const subError = errData?.subscription || errData?.details?.subscription || errData?.non_field_errors;

            if (subError) {
                const msg = Array.isArray(subError) ? subError[0] : subError;
                setUpgradeMessage(msg);
                setUpgradeModalOpen(true);
            } else {
                alert(errData?.detail || errData?.message || 'Failed to run backtest');
            }
        }
        setLoading(false);
    }

    if (!isOpen) return null;

    // Group strategies
    const systemStrategies = strategies.filter(s => s.is_system);
    const myStrategies = strategies.filter(s => !s.is_system);

    const getPlanLimits = () => {
        const feature = subscription?.plan?.features?.OPTION_BACKTEST_RUN;
        if (!feature) return { limit: 0, used: 0, canRun: false, unlimited: false };

        const limit = feature.limit;
        const used = subscription.usage?.OPTION_BACKTEST_RUN ?? 0;
        const unlimited = limit === -1;
        const canRun = unlimited || used < limit;

        return { limit, used, canRun, unlimited };
    };

    const { canRun, used: usedBacktests, limit: backtestLimit, unlimited: backtestUnlimited } = getPlanLimits();

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4">
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900">New Option Backtest</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Strategy Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Option Strategy
                        </label>
                        <select
                            value={formData.strategy_id}
                            onChange={(e) => setFormData({ ...formData, strategy_id: e.target.value })}
                            className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-black focus:outline-none text-gray-900 bg-white"
                            required
                        >
                            <option value="" className="text-gray-900">Select Strategy</option>
                            {systemStrategies.length > 0 && (
                                <optgroup label="System Strategies" className="text-gray-900 font-bold">
                                    {systemStrategies.map((s) => (
                                        <option key={s.id} value={s.id} className="text-gray-900">{s.name}</option>
                                    ))}
                                </optgroup>
                            )}
                            {myStrategies.length > 0 && (
                                <optgroup label="My Strategies" className="text-gray-900 font-bold">
                                    {myStrategies.map((s) => (
                                        <option key={s.id} value={s.id} className="text-gray-900">{s.name}</option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                    </div>

                    {/* Underlying Selection UI */}
                    <div className="space-y-4">
                        <label className="block text-sm font-semibold text-gray-700">
                            Select Underlying Asset
                        </label>

                        {/* Toggle Switches */}
                        <div className="flex p-1 bg-gray-100 rounded-lg w-full max-w-xs">
                            <button
                                type="button"
                                onClick={() => handleTypeChange('index')}
                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${underlyingType === 'index' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Index
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTypeChange('stock')}
                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${underlyingType === 'stock' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Stock
                            </button>
                        </div>

                        {/* Symbol Selector */}
                        <div>
                            {underlyingType === 'index' ? (
                                <select
                                    value={formData.underlying_symbol}
                                    onChange={(e) => handleSymbolChange(e.target.value)}
                                    className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-black focus:outline-none text-gray-900 bg-white"
                                    required
                                >
                                    {indices.length === 0 && <option value="">No Indices available</option>}
                                    {indices.map((idx) => (
                                        <option key={idx.id} value={idx.symbol} className="text-gray-900">
                                            {idx.name} ({idx.symbol})
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <select
                                    value={formData.underlying_symbol}
                                    onChange={(e) => handleSymbolChange(e.target.value)}
                                    className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-black focus:outline-none text-gray-900 bg-white"
                                    required
                                >
                                    <option value="" className="text-gray-900">Select Stock</option>
                                    {stocks.map((stock) => (
                                        <option key={stock.id} value={stock.symbol} className="text-gray-900">
                                            {stock.symbol} - {stock.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    {/* Lot Size */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Lot Size (Quantity per Trade)
                        </label>
                        <input
                            type="number"
                            value={formData.lot_size}
                            onChange={(e) => setFormData({ ...formData, lot_size: Number(e.target.value) })}
                            className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-black focus:outline-none text-gray-900 bg-white"
                            placeholder="e.g., 50 for NIFTY"
                            min="1"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Current defaults: NIFTY50=50, BANKNIFTY=25. You can edit this.
                        </p>
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-black focus:outline-none text-gray-900 bg-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                End Date
                            </label>
                            <input
                                type="date"
                                value={formData.end_date}
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-black focus:outline-none text-gray-900 bg-white"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !canRun}
                            className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
                        >
                            {loading ? 'Running...' : (!canRun ? 'Limit Reached' : 'Run Backtest')}
                        </button>
                    </div>
                </form>
            </div>

            {/* Upgrade Modal */}
            {upgradeModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-60 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-sm w-full p-6 text-center space-y-4 animate-in fade-in zoom-in duration-200">
                        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                            <span className="text-2xl">⚡</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">Upgrade Required</h3>
                        <p className="text-gray-600">{upgradeMessage || "Your current plan limits the number of backtests you can run."}</p>

                        <div className="pt-4 flex flex-col gap-2">
                            <Link href="/subscription" className="w-full py-2.5 bg-black text-white hover:bg-gray-800 rounded-lg font-medium transition">
                                View Plans
                            </Link>
                            <button
                                onClick={() => setUpgradeModalOpen(false)}
                                className="w-full py-2.5 text-gray-500 hover:bg-gray-100 rounded-lg font-medium transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
