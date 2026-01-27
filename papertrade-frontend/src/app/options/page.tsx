'use client';

import { useEffect, useState, useMemo, useRef } from 'react';

// --- CUSTOM SEARCHABLE SELECT COMPONENT ---
function SearchableSelect({ label, value, options, onChange, placeholder = "Select..." }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter((opt: any) => {
        const label = opt.label || opt.toString();
        return label.toString().toLowerCase().includes(query.toLowerCase());
    });

    const selectedLabel = options.find((o: any) => o.value == value)?.label || value || placeholder;

    return (
        <div className="relative min-w-[140px]" ref={containerRef}>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</label>
            <button
                onClick={() => { setIsOpen(!isOpen); setQuery(''); }}
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-left text-sm rounded-lg px-3 py-2.5 flex justify-between items-center focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
            >
                <span className="truncate">{selectedLabel}</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    <div className="p-2 sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search..."
                            className="w-full text-xs p-2 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 outline-none focus:border-indigo-500"
                            autoFocus
                        />
                    </div>
                    {filteredOptions.length === 0 ? (
                        <div className="p-3 text-xs text-gray-500 text-center">No results</div>
                    ) : (
                        filteredOptions.map((opt: any) => {
                            const val = opt.value || opt;
                            const lab = opt.label || opt;
                            return (
                                <div
                                    key={val}
                                    onClick={() => { onChange(val); setIsOpen(false); }}
                                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 ${val == value ? 'bg-indigo-50 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-300 font-medium' : 'text-gray-700 dark:text-gray-200'}`}
                                >
                                    {lab}
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}

export default function OptionsPage() {
    // -------------------------------------------------------------------------
    // 1. STATE MANAGEMENT
    // -------------------------------------------------------------------------

    // Dropdown Data
    const [indices, setIndices] = useState<any[]>([]);
    const [years, setYears] = useState<number[]>([]);
    const [expiries, setExpiries] = useState<string[]>([]);

    // Selections
    const [selectedSymbol, setSelectedSymbol] = useState<string>('');
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [selectedExpiry, setSelectedExpiry] = useState<string>('');
    const [viewMode, setViewMode] = useState<'CE' | 'PE' | 'BOTH'>('BOTH');

    // Sidebar State
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Secondary Filters
    const [fromDate, setFromDate] = useState<string>('');
    const [toDate, setToDate] = useState<string>('');
    const [minStrike, setMinStrike] = useState<string>('');
    const [maxStrike, setMaxStrike] = useState<string>('');
    const [visibleColumns, setVisibleColumns] = useState({
        open: true,
        high: true,
        low: true,
        close: true,
        ltp: true,
        change: false,
        volume: true,
        oi: true,
        oiChange: true,
    });

    // Temp state for sidebar
    const [tempFromDate, setTempFromDate] = useState<string>('');
    const [tempToDate, setTempToDate] = useState<string>('');
    const [tempMinStrike, setTempMinStrike] = useState<string>('');
    const [tempMaxStrike, setTempMaxStrike] = useState<string>('');
    const [tempVisibleColumns, setTempVisibleColumns] = useState(visibleColumns);

    // Data
    const [chainData, setChainData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingFilters, setLoadingFilters] = useState(false);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

    // -------------------------------------------------------------------------
    // 2. DATA FETCHING EFFECTS
    // -------------------------------------------------------------------------

    useEffect(() => {
        fetch(`${API_URL}/options/instruments/`)
            .then(res => res.json())
            .then(data => {
                if (data.data) {
                    setIndices(data.data.map((i: any) => ({
                        label: `${i.is_index ? 'Index' : 'Stock'}: ${i.name || i.symbol}`,
                        value: i.symbol,
                        ...i
                    })));
                    if (data.data.length > 0) setSelectedSymbol(data.data[0].symbol);
                }
            })
            .catch(err => console.error(err));
    }, [API_URL]);

    useEffect(() => {
        if (!selectedSymbol) return;
        setLoadingFilters(true);
        fetch(`${API_URL}/options/years/?symbol=${selectedSymbol}`)
            .then(res => res.json())
            .then(data => {
                if (data.data) {
                    setYears(data.data);
                    if (data.data.length > 0) setSelectedYear(data.data[data.data.length - 1].toString());
                    else setSelectedYear('');
                }
            })
            .finally(() => setLoadingFilters(false));
    }, [selectedSymbol, API_URL]);

    useEffect(() => {
        if (!selectedSymbol || !selectedYear) return;
        setLoadingFilters(true);
        fetch(`${API_URL}/options/expiries/?symbol=${selectedSymbol}&year=${selectedYear}`)
            .then(res => res.json())
            .then(data => {
                if (data.data) {
                    setExpiries(data.data);
                    if (data.data.length > 0) setSelectedExpiry(data.data[0]);
                    else setSelectedExpiry('');
                }
            })
            .finally(() => setLoadingFilters(false));
    }, [selectedSymbol, selectedYear, API_URL]);

    useEffect(() => {
        if (!selectedSymbol || !selectedExpiry) return;

        const fetchChain = async () => {
            setLoading(true);
            try {
                let url = `${API_URL}/options/chain/?symbol=${selectedSymbol}&expiry=${selectedExpiry}&type=${viewMode}`;

                if (fromDate && toDate) {
                    url += `&from_date=${fromDate}&to_date=${toDate}`;
                }

                const res = await fetch(url);
                const data = await res.json();
                setChainData(data.data || []);
            } catch (err) {
                console.error("Failed to fetch option chain", err);
            } finally {
                setLoading(false);
            }
        };
        fetchChain();
    }, [selectedSymbol, selectedExpiry, viewMode, fromDate, toDate, API_URL]);

    // -------------------------------------------------------------------------
    // 3. HELPERS
    // -------------------------------------------------------------------------
    const fmt = (val: number | null) => val ? val.toLocaleString('en-IN') : '-';

    // Group Data by Date
    const groupedData = useMemo(() => {
        const groups: Record<string, any[]> = {};
        chainData.forEach((item: any) => {
            if (viewMode !== 'BOTH' && item.option_type !== viewMode) return;
            if (!groups[item.date]) groups[item.date] = [];
            groups[item.date].push(item);
        });
        return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
    }, [chainData, viewMode]);

    const isITM = (item: any, optionType: 'CE' | 'PE') => {
        const strike = parseFloat(item.strike_price);
        const spot = item.underlying_value;
        if (!spot) return false;
        if (optionType === 'CE') return spot > strike;
        if (optionType === 'PE') return spot < strike;
        return false;
    };

    const processSideBySide = (items: any[]) => {
        const strikes = new Set<number>();
        const map: Record<number, { CE?: any, PE?: any }> = {};

        items.forEach((item: any) => {
            const k = parseFloat(item.strike_price);
            strikes.add(k);
            if (!map[k]) map[k] = {};
            if (item.option_type === 'CE') map[k].CE = item;
            if (item.option_type === 'PE') map[k].PE = item;
        });

        let sortedStrikes = Array.from(strikes).sort((a, b) => a - b);

        if (minStrike) {
            const min = parseFloat(minStrike);
            if (!isNaN(min)) sortedStrikes = sortedStrikes.filter(s => s >= min);
        }
        if (maxStrike) {
            const max = parseFloat(maxStrike);
            if (!isNaN(max)) sortedStrikes = sortedStrikes.filter(s => s <= max);
        }

        return sortedStrikes.map(k => ({ strike: k, CE: map[k].CE, PE: map[k].PE }));
    };

    // -------------------------------------------------------------------------
    // 4. RENDER
    // -------------------------------------------------------------------------
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 transition-colors font-sans relative overflow-x-hidden">
            <div className="max-w-[1800px] mx-auto space-y-6">

                {/* TOP BAR */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-4 items-center justify-between sticky top-0 z-20">

                    {/* Left: Searchable Selects */}
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">

                        <SearchableSelect
                            label="Instrument"
                            value={selectedSymbol}
                            options={indices}
                            onChange={setSelectedSymbol}
                        />

                        <SearchableSelect
                            label="Year"
                            value={selectedYear}
                            options={years.map(y => ({ label: y.toString(), value: y.toString() }))}
                            onChange={setSelectedYear}
                        />

                        <SearchableSelect
                            label="Expiry"
                            value={selectedExpiry}
                            options={expiries.map(e => ({ label: e, value: e }))}
                            onChange={setSelectedExpiry}
                        />

                        {/* View Mode Toggle */}
                        <div className="min-w-[150px]">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">View Mode</label>
                            <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-lg h-[42px]">
                                {['CE', 'BOTH', 'PE'].map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => setViewMode(mode as any)}
                                        className={`flex-1 text-xs font-bold rounded ${viewMode === mode ? 'bg-white dark:bg-gray-700 shadow text-indigo-600' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: Filter Trigger */}
                    <button
                        onClick={() => {
                            setTempFromDate(fromDate);
                            setTempToDate(toDate);
                            setTempMinStrike(minStrike);
                            setTempMaxStrike(maxStrike);
                            setTempVisibleColumns(visibleColumns);
                            setIsSidebarOpen(true);
                        }}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                        <span>More Filters</span>
                    </button>
                </div>

                {/* DATA TABLE */}
                <div className="space-y-8">
                    {loading ? (
                        <div className="text-center py-20 animate-pulse text-gray-500">Fetching Chain Data...</div>
                    ) : groupedData.length === 0 ? (
                        <div className="text-center py-20 text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                            <p>No data found for this selection.</p>
                            <p className="text-xs mt-2 text-gray-400">Try changing the date range or expiry.</p>
                        </div>
                    ) : (
                        groupedData.map(([date, items]) => {
                            const spot = items[0]?.underlying_value || 0;
                            const processedRows = processSideBySide(items);
                            if (processedRows.length === 0) return null;

                            return (
                                <div key={date} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-3 border-b dark:border-gray-700 flex justify-between items-center sticky top-0 bg-opacity-95 backdrop-blur">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-indigo-600 text-white px-3 py-1 rounded text-xs font-bold uppercase shadow-sm">
                                                {new Date(date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                Spot: <span className="font-mono text-indigo-600 dark:text-indigo-400">{fmt(spot)}</span>
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-500 px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded">{processedRows.length} Strikes</span>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs text-center border-collapse">
                                            <thead className="bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-semibold border-b dark:border-gray-700">
                                                <tr>
                                                    {/* STRIKE (Left if Single View, Center if BOTH) */}
                                                    {viewMode !== 'BOTH' && <th className="p-3 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-x dark:border-gray-700 min-w-[80px]">Strike</th>}

                                                    {(viewMode === 'BOTH' || viewMode === 'CE') && (
                                                        <>
                                                            {visibleColumns.oi && <th className="p-3 border-r dark:border-gray-700">CE OI</th>}
                                                            {visibleColumns.oiChange && <th className="p-3 border-r dark:border-gray-700">Chng</th>}
                                                            {visibleColumns.volume && <th className="p-3 border-r dark:border-gray-700">Vol</th>}
                                                            {visibleColumns.open && <th className="p-3 border-r dark:border-gray-700">Open</th>}
                                                            {visibleColumns.high && <th className="p-3 border-r dark:border-gray-700">High</th>}
                                                            {visibleColumns.low && <th className="p-3 border-r dark:border-gray-700">Low</th>}
                                                            {visibleColumns.close && <th className="p-3 border-r dark:border-gray-700">Close</th>}
                                                            {visibleColumns.ltp && <th className="p-3 border-r dark:border-gray-700 bg-green-50/50 text-green-700">LTP</th>}
                                                        </>
                                                    )}

                                                    {/* STRIKE (Center if BOTH) */}
                                                    {viewMode === 'BOTH' && <th className="p-3 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-x dark:border-gray-700 min-w-[80px]">Strike</th>}

                                                    {(viewMode === 'BOTH' || viewMode === 'PE') && (
                                                        <>
                                                            {visibleColumns.ltp && <th className="p-3 border-l dark:border-gray-700 bg-red-50/50 text-red-700">LTP</th>}
                                                            {visibleColumns.close && <th className="p-3 border-l dark:border-gray-700">Close</th>}
                                                            {visibleColumns.high && <th className="p-3 border-l dark:border-gray-700">High</th>}
                                                            {visibleColumns.low && <th className="p-3 border-l dark:border-gray-700">Low</th>}
                                                            {visibleColumns.open && <th className="p-3 border-l dark:border-gray-700">Open</th>}
                                                            {visibleColumns.volume && <th className="p-3 border-l dark:border-gray-700">Vol</th>}
                                                            {visibleColumns.oiChange && <th className="p-3 border-l dark:border-gray-700">Chng</th>}
                                                            {visibleColumns.oi && <th className="p-3 border-l dark:border-gray-700">PE OI</th>}
                                                        </>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                {processedRows.map((row) => {
                                                    const isCE_ITM = row.CE && isITM(row.CE, 'CE');
                                                    const isPE_ITM = row.PE && isITM(row.PE, 'PE');
                                                    const ceClass = isCE_ITM ? 'bg-[#f2eed9] dark:bg-[#f2eed9]/20' : '';
                                                    const peClass = isPE_ITM ? 'bg-[#f2eed9] dark:bg-[#f2eed9]/20' : '';

                                                    return (
                                                        <tr key={row.strike} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">

                                                            {/* Strike Left */}
                                                            {viewMode !== 'BOTH' && <td className="p-2 font-bold bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono border-x dark:border-gray-700">{fmt(row.strike)}</td>}

                                                            {(viewMode === 'BOTH' || viewMode === 'CE') && (
                                                                <>
                                                                    {visibleColumns.oi && <td className={`p-2 border-r dark:border-gray-700 font-mono ${ceClass}`}>{fmt(row.CE?.open_interest)}</td>}
                                                                    {visibleColumns.oiChange && <td className={`p-2 border-r dark:border-gray-700 font-mono ${ceClass} ${row.CE?.change_in_oi > 0 ? 'text-green-600' : 'text-red-500'}`}>{row.CE?.change_in_oi}</td>}
                                                                    {visibleColumns.volume && <td className={`p-2 border-r dark:border-gray-700 font-mono ${ceClass}`}>{fmt(row.CE?.volume)}</td>}

                                                                    {visibleColumns.open && <td className={`p-2 border-r dark:border-gray-700 font-mono ${ceClass}`}>{fmt(row.CE?.open_price)}</td>}
                                                                    {visibleColumns.high && <td className={`p-2 border-r dark:border-gray-700 font-mono ${ceClass}`}>{fmt(row.CE?.high_price)}</td>}
                                                                    {visibleColumns.low && <td className={`p-2 border-r dark:border-gray-700 font-mono ${ceClass}`}>{fmt(row.CE?.low_price)}</td>}
                                                                    {visibleColumns.close && <td className={`p-2 border-r dark:border-gray-700 font-mono ${ceClass}`}>{fmt(row.CE?.close_price)}</td>}

                                                                    {visibleColumns.ltp && <td className={`p-2 border-r dark:border-gray-700 font-bold ${ceClass} ${isCE_ITM ? 'text-gray-900 dark:text-gray-100' : 'text-green-700'}`}>{fmt(row.CE?.ltp)}</td>}
                                                                </>
                                                            )}

                                                            {/* Strike Center */}
                                                            {viewMode === 'BOTH' && <td className="p-2 font-bold bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono border-x dark:border-gray-700">{fmt(row.strike)}</td>}

                                                            {(viewMode === 'BOTH' || viewMode === 'PE') && (
                                                                <>
                                                                    {visibleColumns.ltp && <td className={`p-2 border-l dark:border-gray-700 font-bold ${peClass} ${isPE_ITM ? 'text-gray-900 dark:text-gray-100' : 'text-red-700'}`}>{fmt(row.PE?.ltp)}</td>}
                                                                    {visibleColumns.close && <td className={`p-2 border-l dark:border-gray-700 font-mono ${peClass}`}>{fmt(row.PE?.close_price)}</td>}

                                                                    {visibleColumns.high && <td className={`p-2 border-l dark:border-gray-700 font-mono ${peClass}`}>{fmt(row.PE?.high_price)}</td>}
                                                                    {visibleColumns.low && <td className={`p-2 border-l dark:border-gray-700 font-mono ${peClass}`}>{fmt(row.PE?.low_price)}</td>}
                                                                    {visibleColumns.open && <td className={`p-2 border-l dark:border-gray-700 font-mono ${peClass}`}>{fmt(row.PE?.open_price)}</td>}

                                                                    {visibleColumns.volume && <td className={`p-2 border-l dark:border-gray-700 font-mono ${peClass}`}>{fmt(row.PE?.volume)}</td>}
                                                                    {visibleColumns.oiChange && <td className={`p-2 border-l dark:border-gray-700 font-mono ${peClass} ${row.PE?.change_in_oi > 0 ? 'text-green-600' : 'text-red-500'}`}>{row.PE?.change_in_oi}</td>}
                                                                    {visibleColumns.oi && <td className={`p-2 border-l dark:border-gray-700 font-mono ${peClass}`}>{fmt(row.PE?.open_interest)}</td>}
                                                                </>
                                                            )}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

            </div>

            {/* SIDEBAR - Moved here for true full-screen coverage */}
            <div className={`fixed inset-0 z-[100] ${isSidebarOpen ? 'visible' : 'invisible'}`}>
                {/* Backdrop */}
                <div
                    className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => setIsSidebarOpen(false)}
                ></div>

                {/* Panel */}
                <div className={`absolute top-0 right-0 h-full w-full max-w-sm bg-white dark:bg-gray-900 shadow-2xl border-l dark:border-gray-700 flex flex-col transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="text-indigo-600">⚡</span> Filter Settings
                        </h2>
                        <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>

                    <div className="p-6 space-y-8 flex-1 overflow-y-auto">
                        {/* Date Range */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white pb-1 border-b dark:border-gray-700">Date Range</h3>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-tight">From Date</label>
                                    <input type="date" value={tempFromDate} onChange={e => setTempFromDate(e.target.value)} className="input-field" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-tight">To Date</label>
                                    <input type="date" value={tempToDate} onChange={e => setTempToDate(e.target.value)} className="input-field" />
                                </div>
                            </div>
                        </div>

                        {/* Strike Range */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white pb-1 border-b dark:border-gray-700">Strike Price Range</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-tight">Min Strike</label>
                                    <input type="number" value={tempMinStrike} onChange={e => setTempMinStrike(e.target.value)} className="input-field" placeholder="0" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-tight">Max Strike</label>
                                    <input type="number" value={tempMaxStrike} onChange={e => setTempMaxStrike(e.target.value)} className="input-field" placeholder="100000" />
                                </div>
                            </div>
                        </div>

                        {/* Columns */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white pb-1 border-b dark:border-gray-700">Table Columns</h3>
                            <div className="grid grid-cols-1 gap-2">
                                {Object.entries(tempVisibleColumns).map(([key, val]) => (
                                    <label key={key} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/30">
                                        <input
                                            type="checkbox"
                                            checked={val}
                                            onChange={() => setTempVisibleColumns(prev => ({ ...prev, [key]: !val }))}
                                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                                        />
                                        <span className="text-sm font-medium capitalize text-gray-700 dark:text-gray-300">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex gap-3">
                        <button onClick={() => setIsSidebarOpen(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-all font-bold">
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                setFromDate(tempFromDate);
                                setToDate(tempToDate);
                                setMinStrike(tempMinStrike);
                                setMaxStrike(tempMaxStrike);
                                setVisibleColumns(tempVisibleColumns);
                                setIsSidebarOpen(false);
                            }}
                            className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg transition-all shadow"
                        >
                            Apply Filters
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .input-field {
                    @apply w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm;
                }
            `}</style>
        </div>
    );
}
