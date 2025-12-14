import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { stocksAPI } from '@/lib/api';

interface Stock {
    id: number;
    symbol: string;
    name: string;
    // Add other properties if fetchStockById returns more
}

interface StocksState {
    list: Stock[]; // Renamed from 'stocks'
    selectedStock: Stock | null; // Replaced 'selectedStocks' with a single selected stock
    loading: boolean;
    error: string | null; // Added for error handling
    categories: string[]; // Added for stock categories
    stock5MinData: any; // Added for 5-minute data, type can be more specific
}

const initialState: StocksState = {
    list: [],
    selectedStock: null,
    loading: false,
    error: null,
    categories: [],
    stock5MinData: null,
};

// Async Actions
export const fetchStocks = createAsyncThunk(
    'stocks/fetchAll',
    async (params: any = {}, { rejectWithValue }) => {
        try {
            const response = await stocksAPI.getAll(params);
            return response.data.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch stocks');
        }
    }
);

export const fetchStockById = createAsyncThunk(
    'stocks/fetchById',
    async (id: number, { rejectWithValue }) => {
        try {
            const response = await stocksAPI.getById(id);
            return response.data.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch stock');
        }
    }
);

export const fetchStockCategories = createAsyncThunk(
    'stocks/fetchCategories',
    async (_, { rejectWithValue }) => {
        try {
            const response = await stocksAPI.getCategories();
            return response.data.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch categories');
        }
    }
);

export const fetchStock5Min = createAsyncThunk(
    'stocks/fetch5Min',
    async (params: any, { rejectWithValue }) => {
        try {
            const response = await stocksAPI.get5MinData(params);
            return response.data.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch 5min data');
        }
    }
);

const stocksSlice = createSlice({
    name: 'stocks',
    initialState,
    reducers: {
        clearSelectedStock: (state) => {
            state.selectedStock = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch All Stocks
            .addCase(fetchStocks.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchStocks.fulfilled, (state, action) => {
                state.loading = false;
                state.list = action.payload;
            })
            .addCase(fetchStocks.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Fetch Stock By ID
            .addCase(fetchStockById.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchStockById.fulfilled, (state, action) => {
                state.loading = false;
                state.selectedStock = action.payload;
            })
            .addCase(fetchStockById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Fetch Stock Categories
            .addCase(fetchStockCategories.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchStockCategories.fulfilled, (state, action) => {
                state.loading = false;
                state.categories = action.payload;
            })
            .addCase(fetchStockCategories.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Fetch Stock 5 Min Data
            .addCase(fetchStock5Min.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchStock5Min.fulfilled, (state, action) => {
                state.loading = false;
                state.stock5MinData = action.payload;
            })
            .addCase(fetchStock5Min.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export const { clearSelectedStock } = stocksSlice.actions;
export default stocksSlice.reducer;
