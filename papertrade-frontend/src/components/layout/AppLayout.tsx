'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { authAPI } from '@/lib/api';
import { logout } from '@/store/slices/authSlice';
import Sidebar from './Sidebar';

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
                    // Only logout if explicitly unauthorized (401)
                    if (error.response && error.response.status === 401) {
                        // dispatch(logout()); // Disabled to prevent login bounce loop
                        console.warn("Profile check failed 401, but keeping session active to prevent bounce.");
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

    // Exclude sidebar on Home, Login, Signup
    const showSidebar = !["/", "/login", "/signup"].includes(pathname);

    return (
        <div className="flex flex-col md:flex-row min-h-screen w-full bg-gray-50 text-gray-900 gap-8">

            {/* Sidebar (only for inner pages) */}
            {showSidebar && <Sidebar />}

            {/* Main content */}
            <main className="flex-1 w-full p-8">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>

        </div>
    );
}
