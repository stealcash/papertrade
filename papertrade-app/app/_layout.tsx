import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { LoadingProvider, useLoading } from '../context/LoadingContext';
import { registerLoadingHandlers, registerLogoutHandler } from '@/services/api';
import { GlobalLoader } from '@/components/GlobalLoader';

function RootLayoutNav() {
  const { isAuthenticated, signOut } = useAuth();
  const { startLoading, stopLoading } = useLoading();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Register API handlers
    registerLoadingHandlers({
      start: startLoading,
      stop: stopLoading
    });
    registerLogoutHandler(signOut);
  }, [startLoading, stopLoading, signOut]);

  useEffect(() => {
    if (isAuthenticated === null) return;

    // Check if the current route is a public route (Landing, Login, Signup)
    // segments[0] undefined means '/' (index)
    const isPublicRoute = !segments[0] || segments[0] === 'login' || segments[0] === 'signup';

    if (!isAuthenticated && !isPublicRoute) {
      // If not logged in and trying to access private route, go to Welcome (index)
      // or Login. Let's send to index as requested.
      router.replace('/');
    } else if (isAuthenticated && isPublicRoute) {
      // If logged in and on a public page, go to Dashboard
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments]);

  if (isAuthenticated === null) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="wallet" options={{ headerShown: true, title: 'Wallet' }} />
      <Stack.Screen name="strategies/[id]" options={{ headerShown: true, title: 'Strategy Details' }} />
      <Stack.Screen name="strategies/trades" options={{ headerShown: true, title: 'Trade History' }} />
      <Stack.Screen name="strategies/edit" options={{ headerShown: true, title: 'Edit Strategy' }} />
      <Stack.Screen name="notifications" options={{ headerShown: true, title: 'Notifications' }} />
      <Stack.Screen name="scanner" options={{ headerShown: true, title: 'Scanner' }} />
      <Stack.Screen name="stock-finder" options={{ headerShown: true, title: 'Stock Finder' }} />
      <Stack.Screen name="predictions" options={{ headerShown: true, title: 'My Predictions' }} />
      <Stack.Screen name="stocks" options={{ headerShown: true, title: 'Stocks' }} />
      <Stack.Screen name="stock-history" options={{ headerShown: true, title: 'History' }} />
      <Stack.Screen name="market-analysis" options={{ headerShown: true, title: 'Market Analysis' }} />
      <Stack.Screen name="backtest" options={{ headerShown: true, title: 'Backtest' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <LoadingProvider>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <GlobalLoader />
          <RootLayoutNav />
          <StatusBar style="auto" />
        </ThemeProvider>
      </AuthProvider>
    </LoadingProvider>
  );
}
