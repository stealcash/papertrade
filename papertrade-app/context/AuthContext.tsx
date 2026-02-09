import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

interface AuthContextType {
    isAuthenticated: boolean | null;
    user: any | null;
    signIn: (token: string, userData: any) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: null,
    user: null,
    signIn: async () => { },
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [user, setUser] = useState<any | null>(null);

    useEffect(() => {
        const loadAuthStatus = async () => {
            try {
                const token = await SecureStore.getItemAsync('authToken');
                const userData = await SecureStore.getItemAsync('userData');

                setIsAuthenticated(!!token);
                if (userData) {
                    setUser(JSON.parse(userData));
                }
            } catch (error) {
                console.error('Failed to load auth status', error);
                setIsAuthenticated(false);
            }
        };

        loadAuthStatus();
    }, []);

    const signIn = async (token: string, userData: any) => {
        try {
            await SecureStore.setItemAsync('authToken', token);
            await SecureStore.setItemAsync('userData', JSON.stringify(userData));
            setUser(userData);
            setIsAuthenticated(true);
        } catch (error) {
            console.error('Failed to sign in', error);
        }
    };

    const signOut = async () => {
        try {
            await SecureStore.deleteItemAsync('authToken');
            await SecureStore.deleteItemAsync('userData');
            setUser(null);
            setIsAuthenticated(false);
        } catch (error) {
            console.error('Failed to sign out', error);
        }
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};
