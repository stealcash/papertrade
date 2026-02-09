import apiClient from './api';

export const backtestAPI = {
    run: (data: any) => apiClient.post('/backtest/run/', data),
    getRuns: (params?: any) => apiClient.get('/backtest/runs/', { params }),
    getRunById: (id: number) => apiClient.get(`/backtest/runs/${id}/`),
    getResults: (id: number, params: any) => apiClient.get(`/backtest/runs/${id}/results/`, { params }),
    exportCSV: (id: number) => apiClient.get(`/backtest/runs/${id}/export_csv/`),
    delete: (id: number) => apiClient.delete(`/backtest/runs/${id}/`),
    deleteBulk: (ids: number[]) => apiClient.post('/backtest/runs/bulk_delete/', { ids }),
};
