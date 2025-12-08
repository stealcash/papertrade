import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api/v1';

// Create axios instance
const apiClient = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add JWT token
apiClient.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('access_token');
            if (token && token !== "undefined" && token !== "null") {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            if (typeof window !== 'undefined') {
                // localStorage.removeItem('access_token'); // Disabled to keep session alive despite 401
                // localStorage.removeItem('user');
                // window.location.href = '/login'; // Disabled to prevent aggressive bounces
                console.warn("API 401: Token invalid, but preventing auto-redirect loop.");
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;

// API endpoints
export const authAPI = {
    signup: (data: any) => apiClient.post('/auth/signup', data),
    login: (data: any) => apiClient.post('/auth/login', data),
    profile: () => apiClient.get('/auth/profile'),
    updateProfile: (data: any) => apiClient.put('/auth/profile/update', data),
};

export const stocksAPI = {
    getAll: (params?: any) => apiClient.get('/stocks', { params }),
    getById: (id: number) => apiClient.get(`/stocks/${id}`),
    getPrices: (params: any) => apiClient.get('/stocks/prices/daily', { params }),
};

export const backtestAPI = {
    run: (data: any) => apiClient.post('/backtest/run', data),
    getRuns: () => apiClient.get('/backtest/runs'),
    getRunById: (id: number) => apiClient.get(`/backtest/runs/${id}`),
    exportCSV: (id: number) => apiClient.get(`/backtest/runs/${id}/export_csv`),
};

export const strategiesAPI = {
    getPredefined: () => apiClient.get('/strategies/predefined'),
    getRuleBased: () => apiClient.get('/strategies/rule-based'),
    createRuleBased: (data: any) => apiClient.post('/strategies/rule-based', data),
    getCommunity: () => apiClient.get('/strategies/rule-based/community'),
};

export const notificationsAPI = {
    getAll: (params?: any) => apiClient.get('/notifications', { params }),
    markRead: (id: number) => apiClient.post(`/notifications/${id}/mark_read`),
    markAllRead: () => apiClient.post('/notifications/mark_all_read'),
};

export const syncAPI = {
    trigger: (data: any) => apiClient.post('/sync/trigger', data),
    getLogs: () => apiClient.get('/sync/logs'),
};

export const paymentsAPI = {
    refillWallet: (amount: number) => apiClient.post('/payments/wallet/refill', { amount }),
    getRecords: () => apiClient.get('/payments/records'),
};
