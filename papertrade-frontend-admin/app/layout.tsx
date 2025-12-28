'use client';

import { useEffect, useState } from 'react';
import { Provider, useSelector } from 'react-redux';
import { usePathname } from 'next/navigation';
import { store, RootState } from '@/store';
import { loadFromStorage } from '@/store/slices/authSlice';
import './globals.css';

import AuthVerifier from '@/components/AuthVerifier';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';

import { ThemeProvider } from '@/context/ThemeContext';
import { ConfirmProvider } from '@/context/ConfirmContext';
import { Toaster } from 'react-hot-toast';


function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Hide sidebar on login page, landing page, or if not authenticated
  const isPublicPage = pathname === '/login' || pathname === '/';
  const showSidebar = isAuthenticated && !isPublicPage;

  return (
    <>
      {showSidebar ? (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-16">
          <TopHeader
            handleMobileToggle={() => setIsMobileOpen(!isMobileOpen)}
            handleDesktopCollapse={() => setIsCollapsed(!isCollapsed)}
            isCollapsed={isCollapsed}
          />

          <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
            <Sidebar
              isMobileOpen={isMobileOpen}
              setIsMobileOpen={setIsMobileOpen}
              isCollapsed={isCollapsed}
              toggleCollapse={() => setIsCollapsed(!isCollapsed)}
            />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300">
              <main className="flex-1 overflow-y-auto">
                {children}
              </main>
            </div>
          </div>
        </div>
      ) : (
        children
      )}
    </>
  );
}
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    store.dispatch(loadFromStorage());
  }, []);

  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 dark:bg-gray-950" suppressHydrationWarning>
        <Provider store={store}>
          <ThemeProvider>
            <ConfirmProvider>
              <AuthVerifier>
                <LayoutContent>{children}</LayoutContent>
                <Toaster position="bottom-center" />
              </AuthVerifier>
            </ConfirmProvider>
          </ThemeProvider>
        </Provider>
      </body>
    </html>
  );
}
