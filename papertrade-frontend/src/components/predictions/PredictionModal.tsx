import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, X, MonitorPlay } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import api from "@/lib/api";
import { useToast } from "@/context/ToastContext";

interface PredictionModalProps {
    stock: any;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function PredictionModal({ stock, isOpen, onClose, onSuccess }: PredictionModalProps) {
    const { showToast } = useToast();
    const [direction, setDirection] = useState<'BUY' | 'SELL'>('BUY');
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset state when modal opens/closes or stock changes
    useEffect(() => {
        if (isOpen) {
            setDirection('BUY');
            setDescription("");
        }
    }, [isOpen, stock]);

    if (!isOpen || !stock) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            await api.post('/predictions/', {
                stock: stock.id,
                direction,
                description
            });

            showToast(`Prediction added for ${stock.symbol}`, "success");
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to create prediction", error);
            showToast("Failed to create prediction", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-800 transform transition-all scale-100"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <MonitorPlay size={20} className="text-blue-500" />
                            New Prediction
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            For {stock.symbol} ({stock.name})
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">

                    {/* Direction Toggle */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Direction</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setDirection('BUY')}
                                className={`py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 border-2 ${direction === 'BUY'
                                        ? "bg-green-50 dark:bg-green-900/20 border-green-500 text-green-600 dark:text-green-400"
                                        : "bg-white dark:bg-gray-800 border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-400"
                                    }`}
                            >
                                <TrendingUp size={18} /> BUY
                            </button>
                            <button
                                type="button"
                                onClick={() => setDirection('SELL')}
                                className={`py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 border-2 ${direction === 'SELL'
                                        ? "bg-red-50 dark:bg-red-900/20 border-red-500 text-red-600 dark:text-red-400"
                                        : "bg-white dark:bg-gray-800 border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-400"
                                    }`}
                            >
                                <TrendingDown size={18} /> SELL
                            </button>
                        </div>
                    </div>

                    {/* Reasoning */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Why this decision?</label>
                        <textarea
                            className="w-full min-h-[100px] p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border-0 focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                            placeholder="e.g. Breakout anticipated, strong volume support..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-2 flex gap-3">
                        <Button variant="ghost" className="flex-1" onClick={onClose} type="button">
                            Cancel
                        </Button>
                        <Button
                            className={`flex-1 ${direction === 'BUY' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                            type="submit"
                            isLoading={isSubmitting}
                        >
                            Confirm {direction}
                        </Button>
                    </div>

                </form>
            </div>
        </div>
    );
}
