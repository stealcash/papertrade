import apiClient from './api';

export interface Notification {
    id: number;
    title: string;
    message: string;
    created_at: string;
    is_read: boolean;
}

export const notificationsApi = {
    getRecent: async (limit = 5) => {
        // Assuming backend endpoint exists from web: notificationsAPI.getAll
        const response = await apiClient.get(`notifications?limit=${limit}`);
        return response.data;
    }
};
