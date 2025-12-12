import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Stock {
    id: number;
    symbol: string;
    name: string;
}

interface StocksState {
    stocks: Stock[];
    selectedStocks: number[];
    loading: boolean;
}

const initialState: StocksState = {
    stocks: [],
    selectedStocks: [],
    loading: false,
};

const stocksSlice = createSlice({
    name: 'stocks',
    initialState,
    reducers: {
        setStocks: (state, action: PayloadAction<Stock[]>) => {
            state.stocks = action.payload;
        },
        toggleStockSelection: (state, action: PayloadAction<number>) => {
            const index = state.selectedStocks.indexOf(action.payload);
            if (index > -1) {
                state.selectedStocks.splice(index, 1);
            } else {
                state.selectedStocks.push(action.payload);
            }
        },
        clearSelection: (state) => {
            state.selectedStocks = [];
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.loading = action.payload;
        },
    },
});

export const { setStocks, toggleStockSelection, clearSelection, setLoading } = stocksSlice.actions;
export default stocksSlice.reducer;
