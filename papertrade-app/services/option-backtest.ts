
import apiClient from './api';

export interface OptionBacktestRun {
    id: number;
    strategy_name: string;
    run_id: string;
    underlying_symbol: string;
    start_date: string;
    end_date: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    win_rate: string;
    total_trades: number;
    results_summary_json: any;
    created_at: string;
    // New fields
    snapshot_name?: string;
    snapshot_config?: any;
    lot_size?: number;
    win_count?: number;
    loss_count?: number;
}

export const optionBacktestAPI = {
    getAll: (params?: { page?: number; page_size?: number }) =>
        apiClient.get('/backtest/option-backtest/', { params }),

    get: (id: number | string) =>
        apiClient.get(`/backtest/option-backtest/${id}/`),

    run: (data: {
        strategy_id: number;
        underlying_symbol: string;
        lot_size: number;
        start_date: string;
        end_date: string;
    }) => apiClient.post('/backtest/option-backtest/run/', data),

    delete: (id: number | string) =>
        apiClient.delete(`/backtest/option-backtest/${id}/`),

    resync: (id: number | string) =>
        apiClient.post(`/backtest/option-backtest/${id}/resync/`),

    getResults: (id: number | string, params?: { page?: number; page_size?: number }) =>
        apiClient.get(`/backtest/option-backtest/${id}/results/`, { params }),
};
