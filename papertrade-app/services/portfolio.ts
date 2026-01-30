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

export const portfolioApi = {
    getHoldings: async () => {
        const response = await apiClient.get('portfolio/holdings');
        return response.data;
    },

    trade: async (payload: { stock_id: number; quantity: number; action: 'BUY' | 'SELL' }) => {
        const response = await apiClient.post('portfolio/holdings/trade', payload);
        return response.data;
    }
};
