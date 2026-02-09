import apiClient from './api';

export interface PortfolioItem {
    id: number;
    stock: number;
    stock_details: {
        id: number;
        symbol: string;
        name: string;
        is_option_enable: boolean;
    };
    quantity: number;
    average_buy_price: string; // Decimal string
    invested_value: number;
    current_value: number;
    pnl: number;
    pnl_percentage: number;
    updated_at: string;
}

export interface PortfolioSummary {
    total_invested: number;
    total_current: number;
    total_pnl: number;
    total_pnl_percentage: number;
}

export interface PortfolioResponse {
    holdings: PortfolioItem[];
    summary: {
        total_invested: number;
    };
}

export const portfolioAPI = {
    getHoldings: () => apiClient.get('/portfolio/holdings/'),
    getHistory: (params?: any) => apiClient.get('/portfolio/holdings/history/', { params }),
    trade: (data: { stock_id: number, quantity: number, action: 'BUY' | 'SELL' }) => apiClient.post('/portfolio/holdings/trade/', data),
};

// Legacy alias
export const portfolioApi = portfolioAPI;
