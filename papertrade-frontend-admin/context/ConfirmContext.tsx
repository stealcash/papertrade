'use client';

import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X, Check, Info } from 'lucide-react';

interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info' | 'success';
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context;
};

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions>({
        title: '',
        message: ''
    });

    // We store the resolve function of the promise
    const resolveRef = useRef<(value: boolean) => void>(() => { });

    const confirm = (opts: ConfirmOptions): Promise<boolean> => {
        setOptions({
            confirmText: 'Confirm',
            cancelText: 'Cancel',
            type: 'info',
            ...opts
        });
        setIsOpen(true);
        return new Promise((resolve) => {
            resolveRef.current = resolve;
        });
    };

    const handleConfirm = () => {
        setIsOpen(false);
        resolveRef.current(true);
    };

    const handleCancel = () => {
        setIsOpen(false);
        resolveRef.current(false);
    };

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleCancel}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />

                        {/* Dialog */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            transition={{ duration: 0.2 }}
                            className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800"
                        >
                            <div className="p-6">
                                <div className="flex gap-4">
                                    {/* Icon */}
                                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${options.type === 'danger' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' :
                                            options.type === 'warning' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30' :
                                                options.type === 'success' ? 'bg-green-100 text-green-600 dark:bg-green-900/30' :
                                                    'bg-blue-100 text-blue-600 dark:bg-blue-900/30'
                                        }`}>
                                        {options.type === 'danger' ? <AlertTriangle size={24} /> :
                                            options.type === 'warning' ? <AlertTriangle size={24} /> :
                                                options.type === 'success' ? <Check size={24} /> :
                                                    <Info size={24} />}
                                    </div>

                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                            {options.title}
                                        </h3>
                                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                            {options.message}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
                                <button
                                    onClick={handleCancel}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-900 rounded-lg border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all"
                                >
                                    {options.cancelText}
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className={`px-6 py-2 text-sm font-semibold text-white rounded-lg shadow-sm transition-all transform active:scale-95 ${options.type === 'danger' ? 'bg-red-600 hover:bg-red-700 hover:shadow-red-500/25' :
                                            options.type === 'success' ? 'bg-green-600 hover:bg-green-700 hover:shadow-green-500/25' :
                                                'bg-black dark:bg-white dark:text-black hover:bg-gray-800 hover:shadow-xl'
                                        }`}
                                >
                                    {options.confirmText}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </ConfirmContext.Provider>
    );
};
