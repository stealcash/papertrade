'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, ChevronRight, Check, Search, Filter, Plus, Trash2 } from 'lucide-react';
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

    // UI Store
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'search' | 'watchlist' | 'sector' | 'category'>('search');
    const [selectedSector, setSelectedSector] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');

    // Form State
    const [formData, setFormData] = useState({
        strategy_id: '',
        is_system_strategy: false,
        scope_type: 'stocks', // indices, stocks

        // This tracks the visual selection (Stock IDs)
        selection_ids: [] as number[],

        // This tracks the backend intent
        backend_selection_mode: 'stock', // stock, watchlist, sector, category
        backend_context_id: '' as string | number,

        criteria_type: 'direction', // direction, magnitude
        magnitude_threshold: 50,
        start_date: '',
        end_date: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
            // Reset state on open
            setStep(1);
            setFormData(prev => ({
                ...prev,
                selection_ids: [],
                backend_selection_mode: 'stock',
                backend_context_id: ''
            }));
        }
    }, [isOpen]);

    const fetchInitialData = async () => {
        setLoading(true);
        // Fetch strategies
        const fetchStrategies = async () => {
            try {
                const [resSys, resUser] = await Promise.all([
                    strategiesAPI.getAll(),
                    strategiesAPI.getRuleBased()
                ]);
                const sysStrats = (resSys.data.data.results || resSys.data.data || []).map((s: any) => ({ ...s, is_system: true }));
                const linkedRuleIds = sysStrats.map((s: any) => s.rule_based_strategy).filter(Boolean);
                const userStrats = (resUser.data.data.results || resUser.data.data || [])
                    .filter((s: any) => !linkedRuleIds.includes(s.id))
                    .map((s: any) => ({ ...s, is_system: false }));
                setStrategies([...sysStrats, ...userStrats]);
            } catch (e) {
                console.error("Strategies Error:", e);
            }
        };

        const fetchStocks = async () => {
            try {
                const res = await stocksAPI.getAll({ page_size: 2000 }); // Fetch enough stocks
                setStocks(res.data.data.stocks || res.data.data.results || res.data.data || []);
            } catch (e) {
                console.error("Stocks Error:", e);
            }
        };

        const fetchSectors = async () => {
            try {
                const res = await sectorsAPI.getAll({ page_size: 100 });
                setSectors(res.data.data.results || res.data.data || []);
            } catch (e) { console.error(e); }
        };

        const fetchCategories = async () => {
            try {
                const res = await stocksAPI.getCategories();
                setCategories(res.data.data || []);
            } catch (e) { console.error(e); }
        };

        await Promise.all([fetchStrategies(), fetchStocks(), fetchSectors(), fetchCategories()]);
        setLoading(false);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const selectedStrat = strategies.find(s =>
                s.id === Number(formData.strategy_id) &&
                s.is_system === formData.is_system_strategy
            );
            if (!selectedStrat) throw new Error("Strategy not found");

            // Construct payload based on mode
            const payload: any = {
                // If scope is indices, force stock mode (as indices are treated as stocks in backend currently)
                // If scope is stocks, use the intelligent backend_selection_mode
                selection_mode: formData.scope_type === 'indices' ? 'stock' : formData.backend_selection_mode,

                criteria_type: formData.criteria_type,
                magnitude_threshold: formData.criteria_type === 'magnitude' ? formData.magnitude_threshold : undefined,
                start_date: formData.start_date,
                end_date: formData.end_date,
                initial_wallet: 100000
            };

            // Handle Config
            if (formData.scope_type === 'indices') {
                payload.selection_config = { ids: formData.selection_ids };
            } else {
                // Stocks Scope
                if (formData.backend_selection_mode === 'stock') {
                    payload.selection_config = { ids: formData.selection_ids };
                } else if (formData.backend_selection_mode === 'watchlist') {
                    payload.selection_config = {}; // Watchlist implicit
                } else {
                    // Sector or Category
                    payload.selection_config = { ids: [formData.backend_context_id] };
                }
            }

            if (selectedStrat.is_system) {
                payload.strategy_id = selectedStrat.id;
            } else {
                payload.strategy_rule_based = selectedStrat.id;
            }

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

    // ─── HELPER MAPPINGS ───

    // Indices Only
    const indicesList = useMemo(() => stocks.filter(s => s.is_index), [stocks]);

    // Builder Lists
    const currentTabProxies = useMemo(() => {
        if (formData.scope_type === 'indices') return [];

        if (activeTab === 'search') {
            if (!searchQuery) return [];
            return stocks.filter(s =>
                !s.is_index &&
                (s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    s.name.toLowerCase().includes(searchQuery.toLowerCase()))
            ).slice(0, 50);
        }
        if (activeTab === 'watchlist') {
            return stocks.filter(s => s.is_in_watchlist && !s.is_index);
        }
        if (activeTab === 'sector') {
            if (!selectedSector) return [];
            return stocks.filter(s => !s.is_index && s.sectors?.includes(Number(selectedSector)));
        }
        if (activeTab === 'category') {
            if (!selectedCategory) return [];
            return stocks.filter(s => !s.is_index && s.categories?.includes(Number(selectedCategory)));
            // Note: s.categories is likely list of IDs based on serializer
        }
        return [];
    }, [stocks, activeTab, searchQuery, selectedSector, selectedCategory, formData.scope_type]);

    const toggleId = (id: number) => {
        setFormData(prev => {
            // If we touch individual items, we fallback to custom stock mode
            // unless we are just toggling an index (which is always stock mode)
            const exists = prev.selection_ids.includes(id);
            let newIds = [];
            if (exists) newIds = prev.selection_ids.filter(x => x !== id);
            else newIds = [...prev.selection_ids, id];

            return {
                ...prev,
                selection_ids: newIds,
                backend_selection_mode: 'stock',
                backend_context_id: ''
            };
        });
    };

    const handleSelectAll = (mode: string, contextId: any, ids: number[]) => {
        setFormData(prev => {
            // Union currently selected with new ones (visually)
            const newIds = new Set(prev.selection_ids);
            ids.forEach(id => newIds.add(id));

            return {
                ...prev,
                selection_ids: Array.from(newIds),
                backend_selection_mode: mode,
                backend_context_id: contextId
            };
        });
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

                <div className="p-8 overflow-y-auto flex-1">
                    {/* STEP 1: Strategy */}
                    {step === 1 && (
                        <div className="space-y-8">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Select Strategy</h3>
                                <a href="/backtest/strategies/create" className="text-sm text-blue-600 hover:underline font-medium">+ Create New Strategy</a>
                            </div>

                            {/* My Strategies */}
                            {strategies.filter(s => !s.is_system && s.user).length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">My Strategies</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {strategies.filter(s => !s.is_system && s.user).map((strat) => (
                                            <div key={strat.id} onClick={() => setFormData({ ...formData, strategy_id: strat.id, is_system_strategy: false })}
                                                className={`p-4 border rounded-xl cursor-pointer transition relative group ${Number(formData.strategy_id) === strat.id && !formData.is_system_strategy ? 'border-black bg-gray-50 dark:border-white ring-1 ring-black' : 'border-gray-200 hover:border-black'}`}>
                                                <div className="font-semibold">{strat.name}</div>
                                                <div className="text-xs text-gray-500 mt-1">{strat.description || 'Custom'}</div>
                                                <span className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.5 rounded">MINE</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* System */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">System Strategies</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {strategies.filter(s => s.is_system || !s.user).map((strat) => (
                                        <div key={strat.id} onClick={() => setFormData({ ...formData, strategy_id: strat.id, is_system_strategy: true })}
                                            className={`p-4 border rounded-xl cursor-pointer transition ${Number(formData.strategy_id) === strat.id && formData.is_system_strategy ? 'border-black bg-gray-50 dark:border-white ring-1 ring-black' : 'border-gray-200 hover:border-black'}`}>
                                            <div className="font-semibold">{strat.name}</div>
                                            <div className="text-xs text-gray-500 mt-1">{strat.type} • {strat.status}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Stock Selection */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Select Scope</h3>

                            {/* Scope Toggle */}
                            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                                <button onClick={() => setFormData({ ...formData, scope_type: 'indices', selection_ids: [] })}
                                    className={`flex-1 py-2 text-sm font-semibold rounded-md transition ${formData.scope_type === 'indices' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}>Indices</button>
                                <button onClick={() => setFormData({ ...formData, scope_type: 'stocks', selection_ids: [] })}
                                    className={`flex-1 py-2 text-sm font-semibold rounded-md transition ${formData.scope_type === 'stocks' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}>Stocks</button>
                            </div>

                            {/* INDICES MODE */}
                            {formData.scope_type === 'indices' && (
                                <div>
                                    <div className="text-sm text-gray-500 mb-2">Select at least one index</div>
                                    <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                                        {indicesList.map(stock => (
                                            <div key={stock.id} onClick={() => toggleId(stock.id)} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer">
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${formData.selection_ids.includes(stock.id) ? 'bg-black border-black text-white' : 'border-gray-300'}`}>
                                                    {formData.selection_ids.includes(stock.id) && <Check size={12} />}
                                                </div>
                                                <div className="font-medium text-gray-900">{stock.symbol}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* STOCKS MODE */}
                            {formData.scope_type === 'stocks' && (
                                <div className="space-y-4">
                                    {/* Tabs */}
                                    <div className="flex border-b border-gray-200 overflow-x-auto">
                                        {[
                                            { id: 'search', label: 'Search' },
                                            { id: 'watchlist', label: 'Watchlist' },
                                            { id: 'sector', label: 'Sector' },
                                            { id: 'category', label: 'Category' }
                                        ].map(tab => (
                                            <button key={tab.id}
                                                onClick={() => setActiveTab(tab.id as any)}
                                                className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${activeTab === tab.id ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Controls Area */}
                                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                                        {activeTab === 'search' && (
                                            <div className="relative">
                                                <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                                                <input type="text" placeholder="Search stock (e.g. RELIANCE)"
                                                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black" />
                                            </div>
                                        )}

                                        {activeTab === 'watchlist' && (
                                            <div className="flex justify-between items-center">
                                                <p className="text-sm text-gray-600">Showing stocks in your watchlist.</p>
                                                <button onClick={() => handleSelectAll('watchlist', null, currentTabProxies.map(s => s.id))} className="text-xs font-semibold text-blue-600 hover:underline">Select All</button>
                                            </div>
                                        )}

                                        {activeTab === 'sector' && (
                                            <div className="space-y-2">
                                                <select value={selectedSector} onChange={e => setSelectedSector(e.target.value)}
                                                    className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-white">
                                                    <option value="">Select Sector...</option>
                                                    {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                                {selectedSector && <button onClick={() => handleSelectAll('sector', selectedSector, currentTabProxies.map(s => s.id))} className="text-xs font-semibold text-blue-600 hover:underline">Select All in Sector</button>}
                                            </div>
                                        )}

                                        {activeTab === 'category' && (
                                            <div className="space-y-2">
                                                <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
                                                    className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-white">
                                                    <option value="">Select Category...</option>
                                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                                {selectedCategory && <button onClick={() => handleSelectAll('category', selectedCategory, currentTabProxies.map(s => s.id))} className="text-xs font-semibold text-blue-600 hover:underline">Select All in Category</button>}
                                            </div>
                                        )}

                                        {/* Result List */}
                                        <div className="max-h-48 overflow-y-auto space-y-1 mt-2">
                                            {currentTabProxies.length > 0 ? currentTabProxies.map(stock => (
                                                <div key={stock.id} onClick={() => toggleId(stock.id)} className="flex items-center justify-between p-2 bg-white border border-gray-100 rounded cursor-pointer hover:border-blue-300 transition">
                                                    <div>
                                                        <div className="font-semibold text-sm">{stock.symbol}</div>
                                                        <div className="text-xs text-gray-500">{stock.name}</div>
                                                    </div>
                                                    {formData.selection_ids.includes(stock.id) ?
                                                        <Check size={16} className="text-blue-600" /> :
                                                        <Plus size={16} className="text-gray-400" />
                                                    }
                                                </div>
                                            )) : (
                                                <div className="text-center text-xs text-gray-400 py-4">No stocks found matching criteria</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Selection Summary */}
                                    <div className="border-t pt-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-bold">Selected ({formData.selection_ids.length})</span>
                                            {formData.selection_ids.length > 0 &&
                                                <button onClick={() => setFormData({ ...formData, selection_ids: [] })} className="text-xs text-red-500 hover:underline">Clear All</button>
                                            }
                                        </div>
                                        {formData.selection_ids.length > 0 && (
                                            <div className="flex flex-wrap gap-2 text-xs">
                                                {stocks.filter(s => formData.selection_ids.includes(s.id)).slice(0, 10).map(s => (
                                                    <span key={s.id} className="bg-gray-100 px-2 py-1 rounded-full flex items-center gap-1">
                                                        {s.symbol} <X size={10} className="cursor-pointer" onClick={() => toggleId(s.id)} />
                                                    </span>
                                                ))}
                                                {formData.selection_ids.length > 10 && <span className="text-gray-400 px-1">+{formData.selection_ids.length - 10} more</span>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 3: Criteria & Date */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Date Range</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="date" className="border p-2 rounded" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
                                    <input type="date" className="border p-2 rounded" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Success Criteria</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    <label className={`p-4 border rounded-xl cursor-pointer flex items-start gap-3 ${formData.criteria_type === 'direction' ? 'border-black ring-1 ring-black bg-gray-50' : 'border-gray-200'}`}>
                                        <input type="radio" checked={formData.criteria_type === 'direction'} onChange={() => setFormData({ ...formData, criteria_type: 'direction' })} />
                                        <div><div className="font-semibold">Direction Only</div><div className="text-xs text-gray-500">Success if price moves in predicted direction.</div></div>
                                    </label>
                                    <label className={`p-4 border rounded-xl cursor-pointer flex flex-col gap-4 ${formData.criteria_type === 'magnitude' ? 'border-black ring-1 ring-black bg-gray-50' : 'border-gray-200'}`}>
                                        <div className="flex items-start gap-3">
                                            <input type="radio" checked={formData.criteria_type === 'magnitude'} onChange={() => setFormData({ ...formData, criteria_type: 'magnitude' })} />
                                            <div><div className="font-semibold">Direction + Magnitude</div><div className="text-xs text-gray-500">Success if price moves % of predicted change.</div></div>
                                        </div>
                                        {formData.criteria_type === 'magnitude' && (
                                            <div className="pl-7 pr-2 w-full">
                                                <input type="range" min="0" max="100" step="5" value={formData.magnitude_threshold} onChange={e => setFormData({ ...formData, magnitude_threshold: Number(e.target.value) })} className="w-full h-2 bg-gray-200 rounded-lg accent-black" />
                                                <div className="text-center font-bold mt-2">{formData.magnitude_threshold}% Threshold</div>
                                            </div>
                                        )}
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900/50">
                    {step > 1 && <button onClick={() => setStep(step - 1)} className="px-6 py-2.5 text-gray-600 hover:text-black">Back</button>}
                    {step < 3 ? (
                        <button onClick={() => {
                            if (step === 1 && !formData.strategy_id) return alert("Select a strategy");
                            if (step === 2 && formData.selection_ids.length === 0) return alert("Select at least one item (Index or Stock)");
                            setStep(step + 1);
                        }} className="px-6 py-2.5 bg-black text-white rounded-lg font-semibold flex items-center gap-2">Next <ChevronRight size={16} /></button>
                    ) : (
                        <button onClick={handleSubmit} disabled={loading || !formData.start_date} className="px-6 py-2.5 bg-black text-white rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50">
                            {loading ? 'Starting...' : 'Run Backtest'}
                            {!loading && <Check size={16} />}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
