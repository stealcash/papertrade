import apiClient from './api';

export interface Instrument {
    symbol: string;
    name: string;
    option_symbol: string;
    is_index: boolean;
}

export interface OptionChainParams {
    symbol: string;
    expiry: string;
    type?: 'CE' | 'PE' | 'BOTH';
    date?: string; // Optional: Fetch historic data
}

export const optionsAPI = {
    getContracts: (params: any) => apiClient.get('/options/contracts/', { params }),
    getCandles5Min: (params: any) => apiClient.get('/options/candles/5min/', { params }),

    // Mobile specific helpers (keeping for UI compat)
    getInstruments: async () => apiClient.get('/options/instruments/'),
    getYears: async (symbol: string) => apiClient.get('/options/years/', { params: { symbol } }),
    getExpiries: async (symbol: string, year: string) => apiClient.get('/options/expiries/', { params: { symbol, year } }),
    getAvailableDates: async (symbol: string, expiry: string) => apiClient.get('/options/dates/', { params: { symbol, expiry } }),
    getOptionChain: async (params: OptionChainParams) => apiClient.get('/options/chain/', { params }),
};

// Legacy alias
export const optionsApi = optionsAPI;
