import apiClient from './api';

export interface Notification {
    id: number;
    title: string;
    message: string;
    created_at: string;
    is_read: boolean;
    type: 'info' | 'success' | 'warning' | 'error';
}

export const notificationsAPI = {
    getAll: (params?: any) => apiClient.get('/notifications/', { params }),
    markRead: (id: number) => apiClient.post(`/notifications/${id}/mark_read/`),
    markAllRead: () => apiClient.post('/notifications/mark_all_read/'),
};

// Keep legacy for compatibility during transition
export const notificationsApi = notificationsAPI;
