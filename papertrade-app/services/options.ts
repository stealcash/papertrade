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

export const optionsApi = {
    getInstruments: async () => {
        // Returns list of instruments (e.g., NIFTY, BANKNIFTY)
        const response = await apiClient.get('options/instruments');
        return response.data;
    },

    getYears: async (symbol: string) => {
        const response = await apiClient.get('options/years', { params: { symbol } });
        return response.data;
    },

    getExpiries: async (symbol: string, year: string) => {
        const response = await apiClient.get('options/expiries', { params: { symbol, year } });
        return response.data;
    },

    getAvailableDates: async (symbol: string, expiry: string) => {
        // For selecting historic date
        const response = await apiClient.get('options/dates', { params: { symbol, expiry } });
        return response.data;
    },

    getOptionChain: async (params: OptionChainParams) => {
        const response = await apiClient.get('options/chain', { params });
        return response.data;
    },
};
