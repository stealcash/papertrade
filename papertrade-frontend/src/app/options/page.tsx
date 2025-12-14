'use client';

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { fetchOptionContracts, fetchOptionCandles, selectContract } from '@/store/slices/optionsSlice';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function OptionsPage() {
    const dispatch = useDispatch<AppDispatch>();
    const { contracts, candles, selectedContract, loading, error } = useSelector((state: RootState) => state.options);

    // Local state for filters
    const [underlying, setUnderlying] = useState('RELIANCE');
    const [expiry, setExpiry] = useState('');

    useEffect(() => {
        // Fetch contracts on mount or when filters change
        dispatch(fetchOptionContracts({
            underlying_type: 'stock',
            underlying: underlying
        }));
    }, [dispatch, underlying]);

    const handleContractSelect = (contract: any) => {
        dispatch(selectContract(contract));
        dispatch(fetchOptionCandles({
            underlying_type: contract.underlying_type,
            underlying: contract.underlying,
            expiry_date: contract.expiry_date,
            option_type: contract.option_type,
            strike: contract.strike,
            date: new Date().toISOString().split('T')[0] // today
        }));
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Options Chain & Analysis</h1>

            {/* Controls */}
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg flex gap-4 border border-gray-200 dark:border-gray-800 shadow-sm">
                <input
                    type="text"
                    value={underlying}
                    onChange={(e) => setUnderlying(e.target.value)}
                    className="bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-2 rounded border border-gray-300 dark:border-gray-700 outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Underlying (e.g. RELIANCE)"
                />
                <button
                    onClick={() => dispatch(fetchOptionContracts({ underlying_type: 'stock', underlying }))}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded font-medium transition"
                >
                    Refresh Chain
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Option Chain List */}
                <div className="bg-white dark:bg-gray-900 rounded-lg p-4 h-[600px] overflow-y-auto border border-gray-200 dark:border-gray-800 shadow-sm">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Available Contracts</h2>
                    {loading && <p className="text-gray-400">Loading...</p>}
                    {contracts.length === 0 && !loading && <p className="text-gray-500 dark:text-gray-400">No contracts found.</p>}

                    <div className="space-y-2">
                        {contracts.map((contract: any, idx: number) => (
                            <div
                                key={idx}
                                onClick={() => handleContractSelect(contract)}
                                className={`p-3 rounded cursor-pointer transition-colors border 
                                    ${selectedContract?.strike === contract.strike && selectedContract?.option_type === contract.option_type
                                        ? 'bg-purple-50 dark:bg-purple-900/50 border-purple-500'
                                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                            >
                                <div className="flex justify-between items-center">
                                    <span className={`font-bold ${contract.option_type === 'CE' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {contract.option_type}
                                    </span>
                                    <span className="text-gray-900 dark:text-gray-100 font-mono font-medium">{contract.strike}</span>
                                    <span className="text-gray-500 dark:text-gray-400 text-sm">{contract.expiry_date}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Charts Area */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                        {selectedContract
                            ? `${selectedContract.underlying} ${selectedContract.strike} ${selectedContract.option_type} (${selectedContract.expiry_date})`
                            : 'Select a contract to view chart'}
                    </h2>

                    {selectedContract && candles.length > 0 ? (
                        <div className="h-[500px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={candles}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.2} />
                                    <XAxis dataKey="time" stroke="#94a3b8" />
                                    <YAxis stroke="#94a3b8" domain={['auto', 'auto']} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="close"
                                        stroke="#8b5cf6"
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-[500px] flex items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                            {loading ? 'Loading chart...' : 'No data available'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
