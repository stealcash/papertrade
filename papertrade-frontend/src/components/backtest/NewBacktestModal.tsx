'use client';

import { useState, useEffect } from 'react';
import { X, ChevronRight, Check } from 'lucide-react';
import { strategiesAPI, stocksAPI, backtestAPI, sectorsAPI } from '@/lib/api';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function NewBacktestModal({ isOpen, onClose, onSuccess }: ModalProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Data Sources
    const [strategies, setStrategies] = useState<any[]>([]);
    const [stocks, setStocks] = useState<any[]>([]);
    const [sectors, setSectors] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        strategy_id: '',
        selection_mode: 'stock', // stock, sector, category, watchlist
        selection_ids: [] as number[],
        criteria_type: 'direction', // direction, magnitude
        magnitude_threshold: 50,
        start_date: '',
        end_date: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
        }
    }, [isOpen]);

    const fetchInitialData = async () => {
        setLoading(true);
        // Fetch all data in parallel for speed and isolation
        const fetchStrategies = async () => {
            try {
                const res = await strategiesAPI.getAll();
                setStrategies(res.data.data.results || res.data.data || []);
            } catch (e) {
                console.error("Strategies Error:", e);
            }
        };

        const fetchStocks = async () => {
            try {
                const res = await stocksAPI.getAll({ page_size: 1000 });
                setStocks(res.data.data.stocks || res.data.data.results || res.data.data || []);
            } catch (e) {
                console.error("Stocks Error:", e);
            }
        };

        const fetchSectors = async () => {
            try {
                const res = await sectorsAPI.getAll({ page_size: 100 });
                setSectors(res.data.data.results || res.data.data || []);
            } catch (e) {
                console.error("Sectors Error:", e);
            }
        };

        const fetchCategories = async () => {
            try {
                const res = await stocksAPI.getCategories();
                setCategories(res.data.data || []);
            } catch (e) {
                console.error("Categories Error:", e);
            }
        };

        await Promise.all([
            fetchStrategies(),
            fetchStocks(),
            fetchSectors(),
            fetchCategories()
        ]);
        setLoading(false);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const payload = {
                strategy_id: Number(formData.strategy_id),
                selection_mode: formData.selection_mode,
                selection_config: { ids: formData.selection_ids },
                criteria_type: formData.criteria_type,
                magnitude_threshold: formData.criteria_type === 'magnitude' ? formData.magnitude_threshold : undefined,
                start_date: formData.start_date,
                end_date: formData.end_date,
                initial_wallet: 100000
            };

            await backtestAPI.run(payload);
            setLoading(false);
            onSuccess();
            onClose();
        } catch (e) {
            console.error(e);
            alert("Failed to start backtest");
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">New Backtest</h2>
                        <p className="text-sm text-gray-500">Step {step} of 3</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 overflow-y-auto flex-1">

                    {/* STEP 1: Strategy */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Select Strategy</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {strategies.map((strat) => (
                                    <div
                                        key={strat.id}
                                        onClick={() => setFormData({ ...formData, strategy_id: strat.id })}
                                        className={`p-4 border rounded-xl cursor-pointer transition ${Number(formData.strategy_id) === strat.id
                                            ? 'border-black bg-gray-50 dark:border-white dark:bg-gray-800 ring-1 ring-black dark:ring-white'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
                                            }`}
                                    >
                                        <div className="font-semibold text-gray-900 dark:text-gray-100">{strat.name}</div>
                                        <div className="text-xs text-gray-500 mt-1">{strat.type} • {strat.status}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Stocks / Scope */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Select Scope</h3>

                            {/* Mode Selection */}
                            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                                {['stock', 'watchlist', 'sector', 'category'].map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => setFormData({ ...formData, selection_mode: mode, selection_ids: [] })}
                                        className={`flex-1 py-2 text-xs font-semibold uppercase rounded-md transition ${formData.selection_mode === mode
                                            ? 'bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>

                            {/* Stock Selection */}
                            {formData.selection_mode === 'stock' && (
                                <div>
                                    <div className="mb-2 flex justify-between">
                                        <span className="text-sm font-medium">Stocks</span>
                                        <span className="text-xs text-gray-500">{formData.selection_ids.length} selected</span>
                                    </div>
                                    <div className="h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2 space-y-1">
                                        {stocks.map(stock => (
                                            <label key={stock.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.selection_ids.includes(stock.id)}
                                                    onChange={(e) => {
                                                        const ids = e.target.checked
                                                            ? [...formData.selection_ids, stock.id]
                                                            : formData.selection_ids.filter(id => id !== stock.id);
                                                        setFormData({ ...formData, selection_ids: ids });
                                                    }}
                                                    className="w-4 h-4 rounded border-gray-300 accent-black"
                                                />
                                                <span className="text-gray-900 dark:text-gray-100 font-medium">{stock.symbol}</span>
                                                <span className="text-gray-500 text-xs">{stock.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Sector Selection */}
                            {formData.selection_mode === 'sector' && (
                                <div>
                                    <div className="mb-2 flex justify-between">
                                        <span className="text-sm font-medium">Sectors</span>
                                        <span className="text-xs text-gray-500">{formData.selection_ids.length} selected</span>
                                    </div>
                                    <div className="h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2 space-y-1">
                                        {sectors.map(sec => (
                                            <label key={sec.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.selection_ids.includes(sec.id)}
                                                    onChange={(e) => {
                                                        const ids = e.target.checked
                                                            ? [...formData.selection_ids, sec.id]
                                                            : formData.selection_ids.filter(id => id !== sec.id);
                                                        setFormData({ ...formData, selection_ids: ids });
                                                    }}
                                                    className="w-4 h-4 rounded border-gray-300 accent-black"
                                                />
                                                <span className="text-gray-900 dark:text-gray-100 font-medium">{sec.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Category Selection */}
                            {formData.selection_mode === 'category' && (
                                <div>
                                    <div className="mb-2 flex justify-between">
                                        <span className="text-sm font-medium">Categories</span>
                                        <span className="text-xs text-gray-500">{formData.selection_ids.length} selected</span>
                                    </div>
                                    <div className="h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2 space-y-1">
                                        {categories.map(cat => (
                                            <label key={cat.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.selection_ids.includes(cat.id)}
                                                    onChange={(e) => {
                                                        const ids = e.target.checked
                                                            ? [...formData.selection_ids, cat.id]
                                                            : formData.selection_ids.filter(id => id !== cat.id);
                                                        setFormData({ ...formData, selection_ids: ids });
                                                    }}
                                                    className="w-4 h-4 rounded border-gray-300 accent-black"
                                                />
                                                <span className="text-gray-900 dark:text-gray-100 font-medium">{cat.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Watchlist */}
                            {formData.selection_mode === 'watchlist' && (
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-lg text-sm border border-blue-100">
                                    All stocks in your <strong>Active Watchlist</strong> will be used for this backtest.
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 3: Criteria & Date */}
                    {step === 3 && (
                        <div className="space-y-8">

                            {/* Criteria */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Success Criteria</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    <label className={`p-4 border rounded-xl cursor-pointer flex items-start gap-3 ${formData.criteria_type === 'direction' ? 'border-black ring-1 ring-black bg-gray-50' : 'border-gray-200'
                                        }`}>
                                        <input type="radio" name="crit" checked={formData.criteria_type === 'direction'}
                                            onChange={() => setFormData({ ...formData, criteria_type: 'direction' })}
                                            className="mt-1"
                                        />
                                        <div>
                                            <div className="font-semibold text-gray-900">Direction Only</div>
                                            <div className="text-xs text-gray-500 mt-1">Success if price moves in predicted direction (UP/DOWN).</div>
                                        </div>
                                    </label>

                                    <label className={`p-4 border rounded-xl cursor-pointer flex flex-col gap-4 ${formData.criteria_type === 'magnitude' ? 'border-black ring-1 ring-black bg-gray-50' : 'border-gray-200'
                                        }`}>
                                        <div className="flex items-start gap-3">
                                            <input type="radio" name="crit" checked={formData.criteria_type === 'magnitude'}
                                                onChange={() => setFormData({ ...formData, criteria_type: 'magnitude' })}
                                                className="mt-1"
                                            />
                                            <div>
                                                <div className="font-semibold text-gray-900">Direction + Magnitude</div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    Success if price moves at least <strong>{formData.magnitude_threshold}%</strong> of the predicted change.
                                                </div>
                                            </div>
                                        </div>

                                        {/* Slider Input */}
                                        {formData.criteria_type === 'magnitude' && (
                                            <div className="pl-7 pr-2 w-full">
                                                <div className="flex justify-between text-xs font-semibold mb-2">
                                                    <span>Lenient (0%)</span>
                                                    <span>Strict (100%)</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    step="5"
                                                    value={formData.magnitude_threshold}
                                                    onChange={(e) => setFormData({ ...formData, magnitude_threshold: Number(e.target.value) })}
                                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                                                />
                                                <div className="text-center font-bold mt-2 text-lg">
                                                    {formData.magnitude_threshold}% Threshold
                                                </div>
                                            </div>
                                        )}
                                    </label>
                                </div>
                            </div>

                            {/* Date Range */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Date Range</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            className="w-full border border-gray-300 rounded-lg p-2.5 bg-white"
                                            value={formData.start_date}
                                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                        <input
                                            type="date"
                                            className="w-full border border-gray-300 rounded-lg p-2.5 bg-white"
                                            value={formData.end_date}
                                            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900/50">
                    {step > 1 && (
                        <button
                            onClick={() => setStep(step - 1)}
                            className="px-6 py-2.5 text-gray-600 font-medium hover:text-black transition"
                        >
                            Back
                        </button>
                    )}

                    {step < 3 ? (
                        <button
                            onClick={() => {
                                if (step === 1 && !formData.strategy_id) return alert("Select a strategy");
                                if (step === 2 && formData.selection_mode !== 'watchlist' && formData.selection_ids.length === 0) return alert("Select at least one item");
                                setStep(step + 1);
                            }}
                            className="px-6 py-2.5 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition flex items-center gap-2"
                        >
                            Next <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !formData.start_date}
                            className="px-6 py-2.5 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? 'Starting...' : 'Run Backtest'}
                            {!loading && <Check size={16} />}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
