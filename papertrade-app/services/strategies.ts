import apiClient from './api';

export const strategiesAPI = {
    getAll: (params?: any) => apiClient.get('/strategies/master/', { params }),

    get: (idOrCode: string | number) => apiClient.get(`/strategies/master/${idOrCode}/`),

    getScanResults: (id: number) => apiClient.get(`/strategies/master/${id}/scan_results/`),

    // Rule Based (User)
    getRuleBased: () => apiClient.get('/strategies/rule-based/'),
    getRuleBasedById: (id: number) => apiClient.get(`/strategies/rule-based/${id}/`),
    createRuleBased: (data: any) => apiClient.post('/strategies/rule-based/', data),
    updateRuleBased: (id: number, data: any) => apiClient.put(`/strategies/rule-based/${id}/`),
    deleteRuleBased: (id: number) => apiClient.delete(`/strategies/rule-based/${id}/`),

    // Signals
    getSignals: (params: any) => apiClient.get('/strategies/signals/', { params }),
    getPerformance: (params: any) => apiClient.get('/strategies/signals/performance/', { params }),

    // Stock Finder
    findStocks: (data: any) => apiClient.post('/strategies/stock-finder/scan/', data),
    getFinderHistory: () => apiClient.get('/strategies/stock-finder/'),
};
