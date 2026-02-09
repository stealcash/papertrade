import apiClient from './api';

export const stocksAPI = {
    getAll: (params?: any) => apiClient.get('/stocks/', { params }),
    getById: (id: number) => apiClient.get(`/stocks/${id}/`),
    getPrices: (params: any) => apiClient.get('/stocks/prices/daily/', { params }),
    get5MinData: (params: any) => apiClient.get('/stocks/prices/5min/', { params }),
    getCategories: () => apiClient.get('/stocks/categories/'),
};
