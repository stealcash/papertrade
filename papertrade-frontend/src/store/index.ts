import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import stocksReducer from './slices/stocksSlice';
import sectorsReducer from './slices/sectorsSlice';
import optionsReducer from './slices/optionsSlice';
import backtestsReducer from './slices/backtestsSlice';
import myStocksReducer from './slices/myStocksSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        stocks: stocksReducer,
        sectors: sectorsReducer,
        options: optionsReducer,
        backtests: backtestsReducer,
        myStocks: myStocksReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
