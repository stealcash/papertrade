'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { authAPI } from '@/lib/api';
import Header from '@/components/common/Header';
import Navigation from '@/components/common/Navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {

    const pathname = usePathname();
    const router = useRouter();
    const dispatch = useDispatch();
    const { isAuthenticated, token, isInitialized } = useSelector((state: any) => state.auth);

    // Verify token validity when authenticated
    useEffect(() => {
        if (isAuthenticated && token) {
            authAPI.profile()
                .catch((error) => {
                    console.error("Token Validation Failed:", error);
                    if (error.response && error.response.status === 401) {
                        // Session handled by api.ts interceptor
                        console.warn("Profile check failed 401");
                    }
                });
        }
    }, [isAuthenticated, token, dispatch]);

    // Route Protection
    useEffect(() => {
        if (!isInitialized) return;

        const publicRoutes = ["/", "/login", "/signup"];
        const isPublic = publicRoutes.includes(pathname);

        if (!isAuthenticated && !isPublic) {
            router.push("/login");
        } else if (isAuthenticated && ["/login", "/signup"].includes(pathname)) {
            router.push("/dashboard");
        }
    }, [isInitialized, isAuthenticated, pathname, router]);

    // Show loading spinner until auth is initialized
    if (!isInitialized) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    // Exclude header/nav on Home, Login, Signup
    const showNav = !["/", "/login", "/signup"].includes(pathname);

    if (!showNav) {
        return <div className="min-h-screen bg-gray-50">{children}</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900">
            <Header />
            <Navigation />
            <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                {children}
            </main>
        </div>
    );
}
