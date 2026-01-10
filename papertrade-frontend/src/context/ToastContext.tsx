"use client";

import React, { createContext, useContext } from 'react';
import toast, { Toaster } from 'react-hot-toast';

interface ToastContextType {
    showToast: (message: string, type?: 'success' | 'error' | 'loading' | 'custom') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const showToast = (message: string, type: 'success' | 'error' | 'loading' | 'custom' = 'success') => {
        switch (type) {
            case 'success':
                toast.success(message);
                break;
            case 'error':
                toast.error(message);
                break;
            case 'loading':
                toast.loading(message);
                break;
            default:
                toast(message);
        }
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <Toaster position="top-right" />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
