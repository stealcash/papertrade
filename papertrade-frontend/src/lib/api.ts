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
        const status = error.response?.status;
        const url = error.config?.url;

        // Token expired (401) or User not found (404 on profile/auth)
        if (status === 401 || (status === 404 && (url?.includes('/auth/profile') || url?.includes('/auth/me')))) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('access_token');
                localStorage.removeItem('user');
                window.location.href = '/login';
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
    getAll: (params?: any) => apiClient.get('/stocks/', { params }),
    getById: (id: number) => apiClient.get(`/stocks/${id}/`),
    getPrices: (params: any) => apiClient.get('/stocks/prices/daily/', { params }),
    get5MinData: (params: any) => apiClient.get('/stocks/prices/5min/', { params }),
    getCategories: () => apiClient.get('/stocks/categories/'),
};

export const watchlistAPI = {
    getAll: (params?: any) => apiClient.get('/watchlist/', { params }),
    add: (stockId: number) => apiClient.post('/watchlist/', { stock: stockId }),
    remove: (id: number) => apiClient.delete(`/watchlist/${id}/`),
    reorder: (items: { id: number, order: number }[]) => apiClient.post('/watchlist/reorder/', { items }),
    bulkUpdate: (add: number[], remove: number[]) => apiClient.post('/watchlist/bulk_update/', { add, remove }),
};



export const sectorsAPI = {
    getAll: (params?: any) => apiClient.get('/sectors/', { params }),
    getById: (id: number) => apiClient.get(`/sectors/${id}/`),
    getPrices: (params: any) => apiClient.get('/sectors/prices/daily/', { params }),
};

export const optionsAPI = {
    getContracts: (params: any) => apiClient.get('/options/contracts/', { params }),
    getCandles5Min: (params: any) => apiClient.get('/options/candles/5min/', { params }),
};

export const backtestAPI = {
    run: (data: any) => apiClient.post('/backtest/run/', data),
    getRuns: (params?: any) => apiClient.get('/backtest/runs/', { params }),
    getRunById: (id: number) => apiClient.get(`/backtest/runs/${id}/`),
    getResults: (id: number, params: any) => apiClient.get(`/backtest/runs/${id}/results/`, { params }),
    exportCSV: (id: number) => apiClient.get(`/backtest/runs/${id}/export_csv/`),
    delete: (id: number) => apiClient.delete(`/backtest/runs/${id}/`),
    deleteBulk: (ids: number[]) => apiClient.post('/backtest/runs/bulk_delete/', { ids }),
};


export const notificationsAPI = {
    getAll: (params?: any) => apiClient.get('/notifications/', { params }),
    markRead: (id: number) => apiClient.post(`/notifications/${id}/mark_read/`),
    markAllRead: () => apiClient.post('/notifications/mark_all_read/'),
};

export const syncAPI = {
    triggerNormal: (data: any) => apiClient.post('/sync/trigger-normal/', data),
    triggerHard: (data: any) => apiClient.post('/sync/trigger-hard/', data),
    getLogs: () => apiClient.get('/sync/logs/'),
    getMarketStatus: () => apiClient.get('/sync/market-status/'),
};

export const paymentsAPI = {
    refillWallet: (amount: number) => apiClient.post('/payments/wallet/refill/', { amount }),
    getRecords: () => apiClient.get('/payments/records/'),
};

export const strategiesAPI = {
    getAll: () => apiClient.get('/strategies/master/'),
    get: (idOrCode: string | number) => apiClient.get(`/strategies/master/${idOrCode}/`),

    // Rule Based (User)
    getRuleBased: () => apiClient.get('/strategies/rule-based/'),
    getRuleBasedById: (id: number) => apiClient.get(`/strategies/rule-based/${id}/`),
    createRuleBased: (data: any) => apiClient.post('/strategies/rule-based/', data),
    updateRuleBased: (id: number, data: any) => apiClient.put(`/strategies/rule-based/${id}/`, data),
    deleteRuleBased: (id: number) => apiClient.delete(`/strategies/rule-based/${id}/`),

    // Signals
    getSignals: (params: any) => apiClient.get('/strategies/signals/', { params }),
    getPerformance: (params: any) => apiClient.get('/strategies/signals/performance/', { params }),
};

export const portfolioAPI = {
    getHoldings: () => apiClient.get('/portfolio/holdings/'),
    getHistory: (params?: any) => apiClient.get('/portfolio/holdings/history/', { params }),
    trade: (data: { stock_id: number, quantity: number, action: 'BUY' | 'SELL' }) => apiClient.post('/portfolio/holdings/trade/', data),
};

export const subscriptionsAPI = {
    getPlans: () => apiClient.get('/subscriptions/plans/'),
    getCurrent: () => apiClient.get('/subscriptions/current/'),
    validateCoupon: (data: any) => apiClient.post('/subscriptions/validate_coupon/', data),
    subscribe: (data: any) => apiClient.post('/subscriptions/subscribe/', data),
};
