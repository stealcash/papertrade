import apiClient from './api';

export const sectorsAPI = {
    getAll: (params?: any) => apiClient.get('/sectors/', { params }),
    getById: (id: number) => apiClient.get(`/sectors/${id}/`),
    getPrices: (params: any) => apiClient.get('/sectors/prices/daily/', { params }),
};
