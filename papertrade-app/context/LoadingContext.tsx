import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface LoadingContextType {
    startLoading: () => void;
    stopLoading: () => void;
    isLoading: boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [requestCount, setRequestCount] = useState(0);
    const countRef = useRef(0);

    const startLoading = useCallback(() => {
        countRef.current += 1;
        setRequestCount(countRef.current);
    }, []);

    const stopLoading = useCallback(() => {
        countRef.current = Math.max(0, countRef.current - 1);
        setRequestCount(countRef.current);
    }, []);

    const isLoading = requestCount > 0;

    return (
        <LoadingContext.Provider value={{ startLoading, stopLoading, isLoading }}>
            {children}
        </LoadingContext.Provider>
    );
};

export const useLoading = () => {
    const context = useContext(LoadingContext);
    if (!context) {
        throw new Error('useLoading must be used within a LoadingProvider');
    }
    return context;
};
