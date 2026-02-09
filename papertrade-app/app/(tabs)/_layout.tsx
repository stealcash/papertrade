import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
          },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <FontAwesome size={24} name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <FontAwesome size={24} name="user" color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <FontAwesome size={24} name="th-large" color={color} />,
        }}
      />

      {/* Hidden from tab bar but accessible via router */}
      <Tabs.Screen
        name="strategies"
        options={{
          href: null,
          title: 'Strategies',
        }}
      />
      <Tabs.Screen
        name="options"
        options={{
          href: null,
          title: 'Options',
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          href: null,
          title: 'Portfolio',
        }}
      />
      <Tabs.Screen
        name="watchlist"
        options={{
          href: null,
          title: 'Watchlist',
        }}
      />
    </Tabs>
  );
}
