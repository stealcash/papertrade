import apiClient from './api';

export const syncAPI = {
    triggerNormal: (data: any) => apiClient.post('/sync/trigger-normal/', data),
    triggerHard: (data: any) => apiClient.post('/sync/trigger-hard/', data),
    getLogs: () => apiClient.get('/sync/logs/'),
    getMarketStatus: () => apiClient.get('/sync/market-status/'),
};
