import apiClient from './api';

export interface PatternMatch {
    date: string;       // End date of the found pattern
    start_date: string;
    pattern_data: number[]; // % changes
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

export const patternAPI = {
    find: (symbol: string, tolerance: number) =>
        apiClient.post('/patterns/find/', { symbol, tolerance }),
};
