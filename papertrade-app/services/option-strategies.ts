import apiClient from './api';

export const optionStrategiesAPI = {
    getAll: (params?: any) => apiClient.get('/strategies/option-strategies/', { params }),
    get: (id: number | string) => apiClient.get(`/strategies/option-strategies/${id}/`),
    create: (data: any) => apiClient.post('/strategies/option-strategies/', data),
    update: (id: number | string, data: any) => apiClient.put(`/strategies/option-strategies/${id}/`, data),
    delete: (id: number | string) => apiClient.delete(`/strategies/option-strategies/${id}/`),
    deleteBulk: (ids: number[]) => apiClient.post('/strategies/option-strategies/bulk_delete/', { ids }),
};
