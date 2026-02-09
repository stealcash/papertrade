import apiClient from './api';

export interface Prediction {
    id: number;
    stock: number;
    stock_details: {
        symbol: string;
        name: string;
        last_price: number;
    };
    direction: 'BUY' | 'SELL';
    description: string;
    created_at: string;
    status: 'pending' | 'success' | 'failed';
}

export const predictionsAPI = {
    getAll: (params?: any) => apiClient.get('/predictions/', { params }),
    getById: (id: number) => apiClient.get(`/predictions/${id}/`),
    create: (data: { stock: number; direction: 'BUY' | 'SELL'; description: string }) =>
        apiClient.post('/predictions/', data),
    delete: (id: number) => apiClient.delete(`/predictions/${id}/`),
    deleteBatch: (ids: number[]) => apiClient.post('/predictions/delete_batch/', { ids }),
    deleteAll: (params: any) => apiClient.delete('/predictions/delete_all/', { params }),
};
