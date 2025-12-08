import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import Home from '@/app/page';

// Mock useRouter
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
    }),
}));

describe('Home Page', () => {
    const store = configureStore({
        reducer: {
            auth: authReducer,
        },
    });

    it('renders loading text', () => {
        render(
            <Provider store={store}>
                <Home />
            </Provider>
        );

        expect(screen.getByText('PaperTrade')).toBeInTheDocument();
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
});
