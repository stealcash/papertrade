import { Middleware } from '@reduxjs/toolkit';

export const localStorageMiddleware: Middleware = store => next => action => {
    const result = next(action);

    if (
        (action as any).type?.startsWith('myStocks/')
    ) {
        const state = store.getState();
        if (typeof window !== 'undefined') {
            localStorage.setItem('myStocks', JSON.stringify(state.myStocks.stocks));
        }
    }

    return result;
};
