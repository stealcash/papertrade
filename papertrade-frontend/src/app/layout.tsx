'use client';

import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { loadFromStorage } from '@/store/slices/authSlice';
import AppLayout from '@/components/layout/AppLayout';
import { Toaster } from '@/components/ui/Toast';
import { ThemeProvider } from '@/context/ThemeContext';
import { ConfirmProvider } from '@/context/ConfirmContext';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Load auth state from localStorage on mount
    store.dispatch(loadFromStorage());
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <Provider store={store}>
            <ConfirmProvider>
              <AppLayout>
                {children}
              </AppLayout>
              <Toaster position="bottom-center" />
            </ConfirmProvider>
          </Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}
