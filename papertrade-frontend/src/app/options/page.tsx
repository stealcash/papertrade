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
            <h1 className="text-3xl font-bold text-white">Options Chain & Analysis</h1>

            {/* Controls */}
            <div className="bg-slate-800 p-4 rounded-lg flex gap-4">
                <input
                    type="text"
                    value={underlying}
                    onChange={(e) => setUnderlying(e.target.value)}
                    className="bg-slate-700 text-white p-2 rounded"
                    placeholder="Underlying (e.g. RELIANCE)"
                />
                <button
                    onClick={() => dispatch(fetchOptionContracts({ underlying_type: 'stock', underlying }))}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
                >
                    Refresh Chain
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Option Chain List */}
                <div className="bg-slate-800 rounded-lg p-4 h-[600px] overflow-y-auto">
                    <h2 className="text-xl font-semibold mb-4 text-gray-200">Available Contracts</h2>
                    {loading && <p className="text-gray-400">Loading...</p>}
                    {contracts.length === 0 && !loading && <p className="text-gray-500">No contracts found.</p>}

                    <div className="space-y-2">
                        {contracts.map((contract: any, idx: number) => (
                            <div
                                key={idx}
                                onClick={() => handleContractSelect(contract)}
                                className={`p-3 rounded cursor-pointer transition-colors border border-slate-700
                                    ${selectedContract?.strike === contract.strike && selectedContract?.option_type === contract.option_type
                                        ? 'bg-purple-900/50 border-purple-500'
                                        : 'hover:bg-slate-700'
                                    }`}
                            >
                                <div className="flex justify-between items-center">
                                    <span className={`font-bold ${contract.option_type === 'CE' ? 'text-green-400' : 'text-red-400'}`}>
                                        {contract.option_type}
                                    </span>
                                    <span className="text-white font-mono">{contract.strike}</span>
                                    <span className="text-gray-400 text-sm">{contract.expiry_date}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Charts Area */}
                <div className="lg:col-span-2 bg-slate-800 rounded-lg p-4">
                    <h2 className="text-xl font-semibold mb-4 text-gray-200">
                        {selectedContract
                            ? `${selectedContract.underlying} ${selectedContract.strike} ${selectedContract.option_type} (${selectedContract.expiry_date})`
                            : 'Select a contract to view chart'}
                    </h2>

                    {selectedContract && candles.length > 0 ? (
                        <div className="h-[500px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={candles}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="time" stroke="#94a3b8" />
                                    <YAxis stroke="#94a3b8" domain={['auto', 'auto']} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none' }}
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
                        <div className="h-[500px] flex items-center justify-center text-gray-500">
                            {loading ? 'Loading chart...' : 'No data available'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
