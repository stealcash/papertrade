import axios from 'axios';

const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('admin_token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const url = error.config?.url;

        if (status === 401 || (status === 404 && (url?.includes('/auth/profile/') || url?.includes('/auth/me/')))) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('admin_token');
                localStorage.removeItem('admin_user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export const authAPI = {
    login: (credentials: any) => apiClient.post('/admin-panel/auth/login/', credentials),
    profile: () => apiClient.get('/admin-panel/auth/profile/'),
};

export const strategiesAPI = {
    getAllMasters: () => apiClient.get('/strategies/master/'),
    createMaster: (data: any) => apiClient.post('/strategies/master/', data),
    updateMaster: (code: string, data: any) => apiClient.patch(`/strategies/master/${code}/`, data),
    deleteMaster: (code: string) => apiClient.delete(`/strategies/master/${code}/`),
    sync: (data: any) => apiClient.post('/strategies/sync/', data),

    // User/Rule Based
    createRuleBased: (data: any) => apiClient.post('/strategies/rule-based/', data),
    updateRuleBased: (id: number, data: any) => apiClient.put(`/strategies/rule-based/${id}/`, data),
};

export const plansAPI = {
    getAll: () => apiClient.get('/subscriptions/admin/plans/'),
    getById: (id: number) => apiClient.get(`/subscriptions/admin/plans/${id}/`),
    create: (data: any) => apiClient.post('/subscriptions/admin/plans/', data),
    update: (id: number, data: any) => apiClient.put(`/subscriptions/admin/plans/${id}/`, data),
    delete: (id: number) => apiClient.delete(`/subscriptions/admin/plans/${id}/`),
};

export const couponsAPI = {
    getAll: () => apiClient.get('/subscriptions/admin/coupons/'),
    create: (data: any) => apiClient.post('/subscriptions/admin/coupons/', data),
    delete: (id: number) => apiClient.delete(`/subscriptions/admin/coupons/${id}/`),
};

export const featuresAPI = {
    getAll: () => apiClient.get('/subscriptions/admin/features/'),
};

export default apiClient;
