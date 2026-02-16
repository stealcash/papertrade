import axios from 'axios';
import { Platform } from 'react-native';

// TODO: Change this to your computer's IP address if running on a physical device.
// Your current local IP: 'http://192.168.0.102:8000'
const DEV_API_URL = Platform.select({
    ios: 'http://192.168.0.117:8000',
    android: 'http://192.168.0.117:8000',
});

const apiClient = axios.create({
    baseURL: `${DEV_API_URL}/api/v1`,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

import * as SecureStore from 'expo-secure-store';

// Global Loading State integration via a variable that can be set from the Provider
// Since we can't use hooks directly in the axios instance, we'll use a singleton/emitter pattern
// or just export a way to set the internal emitter.

let loadingHandlers: { start: () => void, stop: () => void } | null = null;
let logoutHandler: (() => void) | null = null;

export const registerLoadingHandlers = (handlers: { start: () => void, stop: () => void }) => {
    loadingHandlers = handlers;
};

export const registerLogoutHandler = (handler: () => void) => {
    logoutHandler = handler;
};

apiClient.interceptors.request.use(async (config) => {
    loadingHandlers?.start();
    try {
        const token = await SecureStore.getItemAsync('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch (error) {
        console.error('Error fetching token', error);
    }
    return config;
}, (error) => {
    loadingHandlers?.stop();
    return Promise.reject(error);
});

apiClient.interceptors.response.use(
    (response) => {
        loadingHandlers?.stop();
        return response;
    },
    async (error) => {
        loadingHandlers?.stop();
        const status = error.response?.status;
        const url = error.config?.url;

        // Token expired (401), Forbidden (403), or User not found (404 on profile/auth)
        // If 403 happens on auth/profile, it means the token is invalid/deleted but request went through
        const isAuthError = status === 401 || status === 403 || (status === 404 && (url?.includes('/auth/profile') || url?.includes('/auth/me')));

        if (isAuthError) {
            try {
                await SecureStore.deleteItemAsync('authToken');
                await SecureStore.deleteItemAsync('userData');
                if (logoutHandler) {
                    logoutHandler();
                }
            } catch (clearError) {
                console.error('Error clearing session', clearError);
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;
