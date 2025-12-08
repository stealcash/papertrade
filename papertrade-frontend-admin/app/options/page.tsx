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
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Options Management</h1>
                <button className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg">
                    + Add Option Contract
                </button>
            </div>

            <div className="bg-slate-800 rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-700">
                        <tr>
                            <th className="p-3 text-left">Underlying</th>
                            <th className="p-3 text-left">Expiry</th>
                            <th className="p-3 text-left">Type</th>
                            <th className="p-3 text-right">Strike</th>
                            <th className="p-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center">Loading...</td>
                            </tr>
                        ) : contracts.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-400">
                                    No options available
                                </td>
                            </tr>
                        ) : (
                            contracts.slice(0, 50).map((contract: any) => (
                                <tr key={contract.id} className="border-b border-slate-700">
                                    <td className="p-3">{contract.underlying_symbol}</td>
                                    <td className="p-3">{contract.expiry_date}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded text-xs ${contract.option_type === 'CE' ? 'bg-purple-600' : 'bg-green-600'
                                            }`}>
                                            {contract.option_type}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right font-mono">{contract.option_strike}</td>
                                    <td className="p-3 text-center">
                                        <button className="text-blue-400 hover:text-blue-300 mr-3">View</button>
                                        <button className="text-red-400 hover:text-red-300">Delete</button>
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
