'use client';

import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { loadFromStorage } from '@/store/slices/authSlice';
import './globals.css';

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
      <body className="antialiased bg-white" suppressHydrationWarning>
        <Provider store={store}>
          {children}
        </Provider>
      </body>
    </html>
  );
}
