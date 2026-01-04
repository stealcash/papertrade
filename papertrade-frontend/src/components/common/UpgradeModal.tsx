'use client';

import Link from 'next/link';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    message: string;
}

export default function UpgradeModal({ isOpen, onClose, message }: UpgradeModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full p-6 text-center space-y-4 animate-in fade-in zoom-in duration-200 border dark:border-gray-700">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-2xl">⚡</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Upgrade Required</h3>
                <p className="text-gray-600 dark:text-gray-400">{message || "Your current plan limits this feature."}</p>

                <div className="pt-4 flex flex-col gap-2">
                    <Link href="/subscription" className="w-full py-2.5 bg-black hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 text-white rounded-lg font-medium transition flex justify-center">
                        View Plans
                    </Link>
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
