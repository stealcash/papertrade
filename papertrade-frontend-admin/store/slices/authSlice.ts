import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
    id: number;
    email: string;
    role: string;
    can_manage_stocks?: boolean;
    can_manage_config?: boolean;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
}

const initialState: AuthState = {
    user: null,
    token: null,
    isAuthenticated: false,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCredentials: (state, action: PayloadAction<{ user: User; token: string }>) => {
            state.user = action.payload.user;
            state.token = action.payload.token;
            state.isAuthenticated = true;

            if (typeof window !== 'undefined') {
                localStorage.setItem('admin_token', action.payload.token);
                localStorage.setItem('admin_user', JSON.stringify(action.payload.user));
            }
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;

            if (typeof window !== 'undefined') {
                localStorage.removeItem('admin_token');
                localStorage.removeItem('admin_user');
            }
        },
        loadFromStorage: (state) => {
            if (typeof window !== 'undefined') {
                const token = localStorage.getItem('admin_token');
                const userStr = localStorage.getItem('admin_user');

                if (token && userStr) {
                    state.token = token;
                    state.user = JSON.parse(userStr);
                    state.isAuthenticated = true;
                }
            }
        },
    },
});

export const { setCredentials, logout, loadFromStorage } = authSlice.actions;
export default authSlice.reducer;
