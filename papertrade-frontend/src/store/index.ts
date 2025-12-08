import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import stocksReducer from './slices/stocksSlice';
import backtestsReducer from './slices/backtestsSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        stocks: stocksReducer,
        backtests: backtestsReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
