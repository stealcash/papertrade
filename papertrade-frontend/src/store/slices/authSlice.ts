import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
    id: number;
    email: string;
    role: string;
    wallet_balance: string;
    is_trial_active?: boolean;
    trial_days_left?: number;
    subscription_active?: boolean;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isInitialized: boolean;
}

const initialState: AuthState = {
    user: null,
    token: null,
    isAuthenticated: false,
    isInitialized: false,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCredentials: (state, action: PayloadAction<{ user: User; token: string }>) => {
            state.user = action.payload.user;
            state.token = action.payload.token;
            state.isAuthenticated = true;
            state.isInitialized = true;

            // Store in localStorage
            if (typeof window !== 'undefined') {
                localStorage.setItem('access_token', action.payload.token);
                localStorage.setItem('user', JSON.stringify(action.payload.user));
            }
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.isInitialized = true;

            // Clear localStorage
            if (typeof window !== 'undefined') {
                localStorage.removeItem('access_token');
                localStorage.removeItem('user');
            }
        },
        loadFromStorage: (state) => {
            if (typeof window !== 'undefined') {
                const token = localStorage.getItem('access_token');
                const userStr = localStorage.getItem('user');

                if (token && userStr && token !== "undefined" && token !== "null") {
                    state.token = token;
                    state.user = JSON.parse(userStr);
                    state.isAuthenticated = true;
                } else {
                    // Purge invalid data
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('user');
                }
            }
            state.isInitialized = true;
        },
    },
});

export const { setCredentials, logout, loadFromStorage } = authSlice.actions;
export default authSlice.reducer;
