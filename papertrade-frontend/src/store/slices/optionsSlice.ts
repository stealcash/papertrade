import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { optionsAPI } from '@/lib/api';

interface OptionsState {
    contracts: any[];
    selectedContract: any | null;
    candles: any[];
    loading: boolean;
    error: string | null;
}

const initialState: OptionsState = {
    contracts: [],
    selectedContract: null,
    candles: [],
    loading: false,
    error: null,
};

// Fetch Option Chain (Contracts)
export const fetchOptionContracts = createAsyncThunk(
    'options/fetchContracts',
    async (params: any, { rejectWithValue }) => {
        try {
            const response = await optionsAPI.getContracts(params);
            return response.data.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch option contracts');
        }
    }
);

// Fetch 5-min Candles for a contract
export const fetchOptionCandles = createAsyncThunk(
    'options/fetchCandles',
    async (params: any, { rejectWithValue }) => {
        try {
            const response = await optionsAPI.getCandles5Min(params);
            return response.data.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch option candles');
        }
    }
);

const optionsSlice = createSlice({
    name: 'options',
    initialState,
    reducers: {
        selectContract: (state, action: PayloadAction<any>) => {
            state.selectedContract = action.payload;
        },
        clearOptionData: (state) => {
            state.contracts = [];
            state.candles = [];
            state.selectedContract = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Contracts
            .addCase(fetchOptionContracts.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchOptionContracts.fulfilled, (state, action) => {
                state.loading = false;
                state.contracts = action.payload;
            })
            .addCase(fetchOptionContracts.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Candles
            .addCase(fetchOptionCandles.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchOptionCandles.fulfilled, (state, action) => {
                state.loading = false;
                state.candles = action.payload.candles || [];
            })
            .addCase(fetchOptionCandles.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export const { selectContract, clearOptionData } = optionsSlice.actions;
export default optionsSlice.reducer;
