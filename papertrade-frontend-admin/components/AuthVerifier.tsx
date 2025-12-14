'use client';

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { authAPI } from '@/lib/api';
import { logout } from '@/store/slices/authSlice';

export default function AuthVerifier({ children }: { children: React.ReactNode }) {
    const dispatch = useDispatch();
    const { isAuthenticated } = useSelector((state: any) => state.auth);

    useEffect(() => {
        const verifySession = async () => {
            if (!isAuthenticated) return;

            try {
                // Try to fetch profile. If it fails with 401, the interceptor will handle logout.
                await authAPI.profile();
            } catch (error) {
                // If checking profile fails (401, 404, or network error), 
                // we should consider the session invalid/suspect and logout to be safe.
                console.warn('Session verification failed, logging out...', error);
                dispatch(logout());
                window.location.href = '/login';
            }
        };

        verifySession();
    }, [isAuthenticated]);

    return <>{children}</>;
}
