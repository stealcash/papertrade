import apiClient from './api';

export interface WalletTransaction {
    id: number;
    transaction_type: 'CREDIT' | 'DEBIT';
    amount: string;
    balance_after: string;
    description: string;
    created_at: string;
}

export const paymentsAPI = {
    refillWallet: (amount: number) => apiClient.post('/payments/wallet/refill/', { amount }),
    getRecords: () => apiClient.get('/payments/records/'),
};

// Legacy alias
export const walletApi = {
    getHistory: () => paymentsAPI.getRecords(),
    refill: (amount: number) => paymentsAPI.refillWallet(amount),
};
