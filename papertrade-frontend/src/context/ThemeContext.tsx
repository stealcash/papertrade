'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>('light');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Check localStorage or system preference on mount
        const savedTheme = localStorage.getItem('theme') as Theme;
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.classList.toggle('dark', savedTheme === 'dark');
        }
        setMounted(true);
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        console.log('ThemeContext: toggling to', newTheme);
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
    };

    // Prevent flash of incorrect theme
    // NOTE: We must still provide the context even if not mounted, 
    // otherwise components using useTheme will crash during hydration.
    // If we strictly need to hide content, we should return null or a loader, 
    // but not unwrapped children.

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {/* Using a key to force re-render if needed, or just let it be. 
                If we want to avoid hydration mismatch on the theme class, 
                that logic is in useEffect which is fine. 
                We just deliver the provider with default 'light' state initially. 
            */}
            {mounted ? children : <div style={{ visibility: 'hidden' }}>{children}</div>}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
