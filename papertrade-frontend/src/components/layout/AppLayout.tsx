'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { authAPI } from '@/lib/api';
import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import TopHeader from '@/components/layout/TopHeader';

export default function AppLayout({ children }: { children: React.ReactNode }) {

    const pathname = usePathname();
    const router = useRouter();
    const dispatch = useDispatch();
    const { isAuthenticated, token, isInitialized } = useSelector((state: any) => state.auth);

    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

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
        <div className="h-screen w-full bg-gray-50 dark:bg-gray-950 flex flex-col overflow-hidden">
            {/* Fixed Top Header */}
            <TopHeader
                handleMobileToggle={() => setIsMobileOpen(!isMobileOpen)}
                handleDesktopToggle={() => setIsCollapsed(!isCollapsed)}
                isCollapsed={isCollapsed}
            />

            <div className="flex flex-1 overflow-hidden pt-16">
                {/* Fixed/Responsive Sidebar */}
                <Sidebar
                    isMobileOpen={isMobileOpen}
                    isCollapsed={isCollapsed}
                    setIsMobileOpen={setIsMobileOpen}
                />

                {/* Main Scrolling Content */}
                <main className="flex-1 overflow-y-auto w-full transition-all duration-300">
                    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
