'use client';

import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { strategiesAPI } from '@/lib/api';

interface SignalHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    stockSymbol: string;
    stockId: number;
    strategyCode: string;
}

export default function SignalHistoryModal({ isOpen, onClose, stockSymbol, stockId, strategyCode }: SignalHistoryModalProps) {
    const [signals, setSignals] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && stockId && strategyCode) {
            loadSignals();
        }
    }, [isOpen, stockId, strategyCode]);

    async function loadSignals() {
        setLoading(true);
        try {
            const res = await strategiesAPI.getSignals({
                strategy: strategyCode,
                stock: stockId
            });
            setSignals(res.data.data?.results || res.data?.results || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg">Signal History: {stockSymbol}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-semibold">
                                <tr>
                                    <th className="px-4 py-2">Date</th>
                                    <th className="px-4 py-2">Direction</th>
                                    <th className="px-4 py-2 text-right">Entry</th>
                                    <th className="px-4 py-2 text-right">Exit</th>
                                    <th className="px-4 py-2 text-center">Result</th>
                                    <th className="px-4 py-2 text-right">PnL</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {signals.map((sig, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">{sig.date}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${sig.signal_direction === 'UP' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                {sig.signal_direction}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-600">{sig.entry_price || '-'}</td>
                                        <td className="px-4 py-3 text-right font-medium">{sig.exit_price || '-'}</td>
                                        <td className="px-4 py-3 text-center">
                                            {sig.status === 'WIN' && <span className="text-green-600 font-bold">WIN</span>}
                                            {sig.status === 'LOSS' && <span className="text-red-600 font-bold">LOSS</span>}
                                            {sig.status === 'PENDING' && <span className="text-gray-400 text-xs">PENDING</span>}
                                        </td>
                                        <td className={`px-4 py-3 text-right font-mono ${Number(sig.pnl) > 0 ? 'text-green-600' : Number(sig.pnl) < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                            {sig.pnl ? sig.pnl : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
