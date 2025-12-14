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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Sector Analysis</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {list.map((sector: any) => (
                    <div key={sector.id} className="bg-white dark:bg-gray-900 rounded-lg p-6 hover:shadow-md transition border border-gray-200 dark:border-gray-800">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{sector.name}</h3>
                                <p className="text-purple-600 dark:text-purple-400 font-mono text-sm">{sector.symbol}</p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${sector.status === 'active' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                                {sector.status}
                            </span>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <p className="text-gray-600 dark:text-gray-400 text-sm">{sector.description || 'No description available.'}</p>
                        </div>

                        <button className="mt-4 w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 py-2 rounded text-sm transition-colors border border-gray-200 dark:border-gray-700">
                            View Performance
                        </button>
                    </div>
                ))}
            </div>

            {loading && (
                <div className="flex justify-center p-12">
                    <p className="text-gray-500 dark:text-gray-400">Loading sectors...</p>
                </div>
            )}
        </div>
    );
}
