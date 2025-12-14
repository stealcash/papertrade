import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { sectorsAPI } from '@/lib/api';

interface SectorState {
    list: any[];
    selectedSector: any | null;
    loading: boolean;
    error: string | null;
}

const initialState: SectorState = {
    list: [],
    selectedSector: null,
    loading: false,
    error: null,
};

export const fetchSectors = createAsyncThunk(
    'sectors/fetchAll',
    async (_, { rejectWithValue }) => {
        try {
            const response = await sectorsAPI.getAll();
            return response.data.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch sectors');
        }
    }
);

export const fetchSectorById = createAsyncThunk(
    'sectors/fetchById',
    async (id: number, { rejectWithValue }) => {
        try {
            const response = await sectorsAPI.getById(id);
            return response.data.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch sector');
        }
    }
);

const sectorsSlice = createSlice({
    name: 'sectors',
    initialState,
    reducers: {
        clearSelectedSector: (state) => {
            state.selectedSector = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch All
            .addCase(fetchSectors.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchSectors.fulfilled, (state, action) => {
                state.loading = false;
                state.list = action.payload;
            })
            .addCase(fetchSectors.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Fetch By ID
            .addCase(fetchSectorById.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchSectorById.fulfilled, (state, action) => {
                state.loading = false;
                state.selectedSector = action.payload;
            })
            .addCase(fetchSectorById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export const { clearSelectedSector } = sectorsSlice.actions;
export default sectorsSlice.reducer;
