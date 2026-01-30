import apiClient from './api';

export interface WalletTransaction {
    id: number;
    transaction_type: 'CREDIT' | 'DEBIT';
    amount: string;
    balance_after: string;
    description: string;
    created_at: string;
}

export const walletApi = {
    getHistory: async () => {
        const response = await apiClient.get('payments/records');
        return response.data;
    },

    refill: async (amount: number) => {
        const response = await apiClient.post('payments/wallet/refill', { amount });
        return response.data;
    }
};
