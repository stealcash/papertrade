'use client';

import { useEffect, useState } from 'react';

export default function AdminOptionsPage() {
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchOptions = async () => {
        try {
            const token = localStorage.getItem('admin_token');
            const response = await fetch('http://localhost:8000/api/v1/options/contracts/', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.status === 'success') {
                setContracts(data.data);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOptions();
    }, []);

    return (
        <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Options Management</h1>
                <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm">
                    + Add Option Contract
                </button>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="p-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Underlying</th>
                            <th className="p-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expiry</th>
                            <th className="p-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                            <th className="p-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Strike</th>
                            <th className="p-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-500 dark:text-gray-400">Loading...</td>
                            </tr>
                        ) : contracts.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-500 dark:text-gray-400">
                                    No options available
                                </td>
                            </tr>
                        ) : (
                            contracts.slice(0, 50).map((contract: any) => (
                                <tr key={contract.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    <td className="p-3 text-gray-900 dark:text-white font-medium">{contract.underlying_symbol}</td>
                                    <td className="p-3 text-gray-600 dark:text-gray-300">{contract.expiry_date}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${contract.option_type === 'CE'
                                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                            }`}>
                                            {contract.option_type}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right font-mono text-gray-700 dark:text-gray-300">{contract.option_strike}</td>
                                    <td className="p-3 text-center">
                                        <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-3 text-sm font-medium">View</button>
                                        <button className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium">Delete</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
