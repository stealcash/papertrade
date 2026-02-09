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

export const watchlistAPI = {
    getAll: (params?: any) => apiClient.get('/watchlist/', { params }),
    add: (stockId: number) => apiClient.post('/watchlist/', { stock: stockId }),
    remove: (id: number) => apiClient.delete(`/watchlist/${id}/`),
    reorder: (items: { id: number, order: number }[]) => apiClient.post('/watchlist/reorder/', { items }),
    bulkUpdate: (add: number[], remove: number[]) => apiClient.post('/watchlist/bulk_update/', { add, remove }),
};

// Legacy alias for compatibility
export const watchlistApi = {
    getWatchlist: () => watchlistAPI.getAll(),
    searchStocks: (query: string) => apiClient.get('/stocks/', { params: { search: query } }),
    addToWatchlist: (stockId: number) => watchlistAPI.bulkUpdate([stockId], []),
    removeFromWatchlist: (stockId: number) => watchlistAPI.bulkUpdate([], [stockId]),
};
