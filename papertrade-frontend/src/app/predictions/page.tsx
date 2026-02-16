"use client";

import { useState, useEffect } from "react";
import {
    TrendingUp, TrendingDown, Trash2,
    ArrowUpRight, ArrowDownRight, Calendar, Filter, ChevronDown
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import api from "@/lib/api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface Prediction {
    id: number;
    stock_symbol: string;
    stock_name: string;
    direction: 'BUY' | 'SELL';
    status: string;
    entry_price: string;
    current_price: number | null;
    return_percentage: number;
    return_value: number;
    return_1d: number | null;
    return_7d: number | null;
    description: string;
    created_at: string;
}

interface GroupedPredictions {
    [date: string]: Prediction[];
}

type PresetKey = '7d' | '30d' | 'custom';

export default function PredictionsPage() {
    const { showToast } = useToast();
    const { confirm } = useConfirm();
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Date Filters — default to last 7 days
    const [startDate, setStartDate] = useState<Date | null>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const [endDate, setEndDate] = useState<Date | null>(new Date());
    const [activePreset, setActivePreset] = useState<PresetKey>('7d');

    // Applied dates (what the API actually uses)
    const [appliedStart, setAppliedStart] = useState<Date>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const [appliedEnd, setAppliedEnd] = useState<Date>(new Date());

    // Fetch on mount
    useEffect(() => {
        fetchPredictions();
    }, []);

    const toDateStr = (d: Date) => d.toISOString().split('T')[0];

    const fetchPredictions = async (start?: Date, end?: Date) => {
        const s = start || appliedStart;
        const e = end || appliedEnd;
        try {
            setIsLoading(true);
            const res = await api.get(`/predictions/?start_date=${toDateStr(s)}&end_date=${toDateStr(e)}`);
            setPredictions(res.data.results || res.data);
        } catch (error) {
            console.error("Failed to fetch predictions", error);
            showToast("Failed to load predictions", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleApply = () => {
        if (!startDate || !endDate) {
            showToast("Please select a complete date range", "error");
            return;
        }
        setAppliedStart(startDate);
        setAppliedEnd(endDate);
        fetchPredictions(startDate, endDate);
    };

    const handlePreset = (preset: PresetKey) => {
        const now = new Date();
        let start: Date;
        if (preset === '7d') {
            start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        } else {
            start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        }
        setStartDate(start);
        setEndDate(now);
        setActivePreset(preset);
        setAppliedStart(start);
        setAppliedEnd(now);
        fetchPredictions(start, now);
    };

    const handleDateRangeChange = (update: [Date | null, Date | null]) => {
        const [start, end] = update;
        setStartDate(start);
        setEndDate(end);
        setActivePreset('custom');
    };

    const handleDelete = async (id: number) => {
        const isConfirmed = await confirm({
            title: "Delete Prediction",
            message: "Are you sure you want to delete this prediction? This action cannot be undone.",
            type: 'danger',
            confirmText: "Delete",
            cancelText: "Cancel"
        });

        if (!isConfirmed) return;

        try {
            await api.delete(`/predictions/${id}/`);
            setPredictions(prev => prev.filter(p => p.id !== id));
            showToast("Prediction deleted", "success");
        } catch (error) {
            showToast("Failed to delete", "error");
        }
    };

    const handleDeleteAll = async () => {
        const isConfirmed = await confirm({
            title: "Delete All Visible Predictions",
            message: "Are you sure you want to delete all visible predictions? This will remove them permanently.",
            type: 'danger',
            confirmText: "Delete All",
            cancelText: "Cancel"
        });

        if (!isConfirmed) return;

        try {
            await api.delete(`/predictions/delete_all/?start_date=${toDateStr(appliedStart)}&end_date=${toDateStr(appliedEnd)}`);
            setPredictions([]);
            showToast("Visible predictions deleted", "success");
        } catch (error) {
            showToast("Failed to delete all", "error");
        }
    };

    const handleDeleteGroup = async (groupDate: string, groupPredictions: Prediction[]) => {
        const isConfirmed = await confirm({
            title: `Delete Predictions for ${groupDate}`,
            message: `Are you sure you want to delete all ${groupPredictions.length} predictions for ${groupDate}?`,
            type: 'danger',
            confirmText: "Delete Group",
            cancelText: "Cancel"
        });

        if (!isConfirmed) return;

        const idsToDelete = groupPredictions.map(p => p.id);

        try {
            await api.post('/predictions/delete_batch/', { ids: idsToDelete });
            setPredictions(prev => prev.filter(p => !idsToDelete.includes(p.id)));
            showToast(`Deleted predictions for ${groupDate}`, "success");
        } catch (error) {
            showToast("Failed to delete group", "error");
        }
    };

    // Group predictions by date
    const groupedPredictions: GroupedPredictions = predictions.reduce((groups, prediction) => {
        const date = new Date(prediction.created_at).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(prediction);
        return groups;
    }, {} as GroupedPredictions);

    const getReturnColor = (val: number | null) => {
        if (val === null) return "text-gray-400";
        if (val > 0) return "text-green-600 dark:text-green-400";
        if (val < 0) return "text-red-600 dark:text-red-400";
        return "text-gray-500";
    };

    const renderReturnCell = (val: number | null, label?: string) => {
        if (val === null) return <span className="text-gray-400 text-sm">Pending</span>;
        return (
            <div className={`flex items-center gap-1 font-semibold ${getReturnColor(val)}`}>
                {val > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                {val}%
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="flex justify-center p-12">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        My Market Predictions
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Track performance of your paper trades over time.
                    </p>
                </div>

                {/* Date Filter Bar */}
                <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    {/* Preset Buttons */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => handlePreset('7d')}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${activePreset === '7d'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            Last 7 Days
                        </button>
                        <button
                            onClick={() => handlePreset('30d')}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${activePreset === '30d'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            Last 30 Days
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

                    {/* Date Range Picker */}
                    <div className="relative">
                        <DatePicker
                            selectsRange={true}
                            startDate={startDate}
                            endDate={endDate}
                            onChange={handleDateRangeChange}
                            maxDate={new Date()}
                            placeholderText="Select date range"
                            dateFormat="dd MMM, yyyy"
                            customInput={
                                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 cursor-pointer hover:border-gray-300 dark:hover:border-gray-500 transition-colors group">
                                    <Calendar size={14} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                                        {startDate && endDate
                                            ? `${startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`
                                            : startDate
                                                ? `${startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ...`
                                                : "Select Range"}
                                    </span>
                                    <ChevronDown size={14} className="text-gray-400" />
                                </div>
                            }
                        />
                    </div>

                    {/* Apply Button */}
                    <button
                        onClick={handleApply}
                        disabled={!startDate || !endDate || isLoading}
                        className={`flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm text-xs font-semibold active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100`}
                    >
                        {isLoading ? (
                            <div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                            <Filter size={14} />
                        )}
                        Apply
                    </button>

                    {/* Delete Filtered */}
                    {(predictions.length > 0) && (
                        <div className="ml-1 pl-2 border-l border-gray-200 dark:border-gray-700">
                            <Button variant="danger" size="sm" onClick={handleDeleteAll}>
                                Delete Filtered
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {predictions.length === 0 ? (
                <div className="text-center py-20 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                    <p className="text-lg">No predictions found for this period.</p>
                    <p className="text-sm mt-1">Try adjusting the date filters or add new predictions.</p>
                </div>
            ) : (
                Object.entries(groupedPredictions).map(([date, preds]) => (
                    <div key={date} className="space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-2">
                            <h2 className="text-lg font-bold flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                <Calendar size={20} className="text-blue-500" />
                                {date}
                            </h2>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-400 hover:text-red-500"
                                onClick={() => handleDeleteGroup(date, preds)}
                            >
                                <Trash2 size={16} className="mr-2" />
                                Delete Group
                            </Button>
                        </div>

                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-sm">
                                        <tr>
                                            <th className="px-6 py-4 font-medium">Stock</th>
                                            <th className="px-6 py-4 font-medium">Direction</th>
                                            <th className="px-6 py-4 font-medium">Entry Price</th>
                                            <th className="px-6 py-4 font-medium">Current Price</th>
                                            <th className="px-6 py-4 font-medium">Next Trading Day Return</th>
                                            <th className="px-6 py-4 font-medium">Next 7 Day Return</th>
                                            <th className="px-6 py-4 font-medium">All-Time Return</th>
                                            <th className="px-6 py-4 font-medium text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                        {preds.map(pred => (
                                            <tr key={pred.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition">
                                                {/* Stock Info */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold">{pred.stock_symbol}</span>
                                                        {pred.description && (
                                                            <div className="group relative">
                                                                <button className="text-gray-400 hover:text-blue-500 cursor-help">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                                                                </button>
                                                                <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                                                    <p className="font-semibold mb-1 text-gray-300">My Reasoning:</p>
                                                                    {pred.description}
                                                                    <div className="absolute left-2 top-full w-0 h-0 border-l-4 border-r-4 border-l-transparent border-r-transparent border-t-4 border-t-gray-900"></div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Direction */}
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${pred.direction === 'BUY'
                                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                        }`}>
                                                        {pred.direction}
                                                    </span>
                                                </td>

                                                {/* Prices */}
                                                <td className="px-6 py-4 font-mono text-sm text-gray-600 dark:text-gray-300">
                                                    {Number(pred.entry_price).toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-sm text-gray-600 dark:text-gray-300">
                                                    {pred.current_price ? Number(pred.current_price).toFixed(2) : '-'}
                                                </td>

                                                {/* Returns */}
                                                <td className="px-6 py-4">{renderReturnCell(pred.return_1d)}</td>
                                                <td className="px-6 py-4">{renderReturnCell(pred.return_7d)}</td>
                                                <td className="px-6 py-4">{renderReturnCell(pred.return_percentage)}</td>

                                                {/* Actions */}
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleDelete(pred.id)}
                                                        className="text-gray-400 hover:text-red-500 transition-colors p-2"
                                                        title="Delete Prediction"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
