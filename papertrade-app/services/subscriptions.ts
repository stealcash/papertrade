import apiClient from './api';

export const subscriptionsAPI = {
    getPlans: () => apiClient.get('/subscriptions/plans/'),
    getCurrent: () => apiClient.get('/subscriptions/current/'),
    validateCoupon: (data: any) => apiClient.post('/subscriptions/validate_coupon/', data),
    subscribe: (data: any) => apiClient.post('/subscriptions/subscribe/', data),
};
