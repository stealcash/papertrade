'use client';

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { fetchSectors, fetchSectorById } from '@/store/slices/sectorsSlice';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function SectorsPage() {
    const dispatch = useDispatch<AppDispatch>();
    const { list, loading } = useSelector((state: RootState) => state.sectors);

    useEffect(() => {
        dispatch(fetchSectors());
    }, [dispatch]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">Sector Analysis</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {list.map((sector: any) => (
                    <div key={sector.id} className="bg-slate-800 rounded-lg p-6 hover:bg-slate-750 transition-colors border border-slate-700">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-white">{sector.name}</h3>
                                <p className="text-purple-400 font-mono text-sm">{sector.symbol}</p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${sector.status === 'active' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                                {sector.status}
                            </span>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-700">
                            <p className="text-gray-400 text-sm">{sector.description || 'No description available.'}</p>
                        </div>

                        <button className="mt-4 w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-sm transition-colors">
                            View Performance
                        </button>
                    </div>
                ))}
            </div>

            {loading && (
                <div className="flex justify-center p-12">
                    <p className="text-gray-400">Loading sectors...</p>
                </div>
            )}
        </div>
    );
}
