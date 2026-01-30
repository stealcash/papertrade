import apiClient from './api';

export interface WatchlistItem {
    id: number; // UserStock ID
    stock_details: {
        id: number;
        symbol: string;
        name: string;
        last_price: number;
        change_percent: number;
    };
    order: number;
}

export const watchlistApi = {
    getWatchlist: async () => {
        // API returns paginated response
        const response = await apiClient.get('watchlist');
        return response.data;
    },

    searchStocks: async (query: string) => {
        const response = await apiClient.get(`stocks?search=${query}`);
        return response.data;
    },

    addToWatchlist: async (stockId: number) => {
        // Bulk update API: { add: [id] }
        const response = await apiClient.post('watchlist/bulk_update', {
            add: [stockId]
        });
        return response.data;
    },

    removeFromWatchlist: async (stockId: number) => {
        // Bulk update API: { remove: [id] }
        // NOTE: Remove expects Stock ID based on view logic ("UserStock.objects.filter(..., stock_id__in=remove_ids)")
        const response = await apiClient.post('watchlist/bulk_update', {
            remove: [stockId]
        });
        return response.data;
    }
};
