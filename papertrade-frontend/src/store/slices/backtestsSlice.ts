import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface BacktestRun {
    id: number;
    run_id: string;
    status: string;
    total_pnl: string;
    pnl_percentage: string;
}

interface BacktestsState {
    runs: BacktestRun[];
    currentRun: BacktestRun | null;
    loading: boolean;
}

const initialState: BacktestsState = {
    runs: [],
    currentRun: null,
    loading: false,
};

const backtestsSlice = createSlice({
    name: 'backtests',
    initialState,
    reducers: {
        setRuns: (state, action: PayloadAction<BacktestRun[]>) => {
            state.runs = action.payload;
        },
        setCurrentRun: (state, action: PayloadAction<BacktestRun>) => {
            state.currentRun = action.payload;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.loading = action.payload;
        },
    },
});

export const { setRuns, setCurrentRun, setLoading } = backtestsSlice.actions;
export default backtestsSlice.reducer;
