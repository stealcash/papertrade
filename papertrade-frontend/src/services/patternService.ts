import api from '@/lib/api';

export interface PatternMatch {
    date: string;
    start_date: string;
    pattern_data: number[];
    projection_data: {
        day: number;
        change_pct: number;
        close: number;
    }[];
}

export interface PatternFinderResult {
    symbol: string;
    target_pattern: {
        date: string;
        change_pct: number;
        close: number;
    }[];
    matches: PatternMatch[];
    count: number;
    avg_3d_return: number;
}

export const patternService = {
    find: async (symbol: string, tolerance: number) => {
        const response = await api.post<PatternFinderResult>('/patterns/find/', {
            symbol,
            tolerance
        });
        return response.data;
    }
};
