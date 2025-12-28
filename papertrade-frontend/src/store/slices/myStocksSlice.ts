import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { watchlistAPI } from '@/lib/api';

export interface MyStock {
  id: number;
  symbol: string;
  name: string;
  last_price?: number;
  last_sync_at?: string;
  user_stock_id?: number; // ID from UserStock model
}

interface MyStocksState {
  stocks: MyStock[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

const initialState: MyStocksState = {
  stocks: [],
  loading: false,
  error: null,
  totalCount: 0,
  totalPages: 1,
  currentPage: 1,
  pageSize: 10,
};

// Async Actions
export const fetchMyStocks = createAsyncThunk(
  'myStocks/fetch',
  async (params: { page?: number, page_size?: number } | undefined, { rejectWithValue }) => {
    try {
      const response = await watchlistAPI.getAll(params);

      // Handle both paginated and non-paginated responses for backward compatibility
      // New format: { data: { stocks: [], pagination: {} } } (via get_success_response)

      const responseData = response.data?.data || response.data;

      let rawData = [];
      let meta = { total_count: 0, total_pages: 1, current_page: 1, page_size: 10 };

      if (responseData.stocks) {
        // New specific structure
        rawData = responseData.stocks;
        if (responseData.pagination) meta = responseData.pagination;
      } else if (Array.isArray(responseData)) {
        // Old plain array
        rawData = responseData;
        meta.total_count = rawData.length;
      } else if (responseData.results) {
        // DRF standard pagination
        rawData = responseData.results;
        meta.total_count = responseData.count;
      }

      const stocks = rawData.map((item: any) => ({
        id: item.stock_details.id, // This is the Stock ID
        symbol: item.stock_details.symbol,
        name: item.stock_details.name,
        last_price: item.stock_details.last_price,
        last_sync_at: item.stock_details.last_sync_at,
        user_stock_id: item.id, // This is the UserStock ID (for deletion)
        order: item.order
      }));

      return { stocks, meta };

    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch watchlist');
    }
  }
);

export const addStockToWatchlist = createAsyncThunk(
  'myStocks/add',
  async (stock: MyStock, { rejectWithValue }) => {
    try {
      const response = await watchlistAPI.add(stock.id);
      const item = response.data; // Ideally wrap in standard response manually or response.data.data

      // If backend uses get_success_response for add:
      const data = item.data || item;

      return {
        id: data.stock_details.id,
        symbol: data.stock_details.symbol,
        name: data.stock_details.name,
        last_price: data.stock_details.last_price,
        last_sync_at: data.stock_details.last_sync_at,
        user_stock_id: data.id
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add stock');
    }
  }
);

export const removeStockFromWatchlist = createAsyncThunk(
  'myStocks/remove',
  async (params: { id: number, userStockId?: number }, { getState, rejectWithValue }) => {
    try {
      // If we don't have userStockId, we might need to find it from state or api
      // Assuming we have it in state
      let userStockId = params.userStockId;
      if (!userStockId) {
        const state: any = getState();
        const stock = state.myStocks.stocks.find((s: MyStock) => s.id === params.id);
        if (stock) userStockId = stock.user_stock_id;
      }

      if (!userStockId) {
        return rejectWithValue('Stock not found in watchlist');
      }

      await watchlistAPI.remove(userStockId);
      return params.id; // Return Stock ID to remove from list
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to remove stock');
    }
  }
);

export const reorderWatchlist = createAsyncThunk(
  'myStocks/reorder',
  async (stocks: MyStock[], { rejectWithValue }) => {
    try {
      // Prepare payload: list of {id: user_stock_id, order: index}
      const items = stocks.map((s, index) => ({
        id: s.user_stock_id!,
        order: index
      })).filter(i => i.id !== undefined);

      await watchlistAPI.reorder(items);
      return stocks;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reorder');
    }
  }
);


const myStocksSlice = createSlice({
  name: 'myStocks',
  initialState,
  reducers: {
    // Optimistic updates could be added here if needed
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchMyStocks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyStocks.fulfilled, (state, action) => {
        state.loading = false;
        state.stocks = action.payload.stocks;
        state.totalCount = action.payload.meta.total_count;
        state.totalPages = action.payload.meta.total_pages;
        state.currentPage = action.payload.meta.current_page;
        state.pageSize = action.payload.meta.page_size;
      })
      .addCase(fetchMyStocks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Add
      .addCase(addStockToWatchlist.fulfilled, (state, action) => {
        state.stocks.push(action.payload);
      })
      // Remove
      .addCase(removeStockFromWatchlist.fulfilled, (state, action) => {
        state.stocks = state.stocks.filter(s => s.id !== action.payload);
      })
      // Reorder
      .addCase(reorderWatchlist.fulfilled, (state, action) => {
        state.stocks = action.payload;
      });
  }
});

export default myStocksSlice.reducer;
