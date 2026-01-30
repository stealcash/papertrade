import React, { useEffect, useState, useCallback } from 'react';
import { Image, StyleSheet, View, Text, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import apiClient from '@/services/api';
import { notificationsApi, Notification } from '@/services/notifications';
import { portfolioApi } from '@/services/portfolio';

export default function HomeScreen() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    wallet: 0,
    invested: 0,
    currentValue: 0,
    totalPnl: 0,
    holdingsCount: 0
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. User Profile (Stats)
      const profileRes = await apiClient.get('auth/profile');
      const userData = profileRes.data.data;
      setUser(userData);

      // 2. Portfolio Summary for Invested/Current
      const portfolioRes = await portfolioApi.getHoldings();
      // Handle response structure carefully
      const data = portfolioRes.data || {};
      // API might return { status: 'success', data: { holdings: [], summary: {} } }
      // OR direct data if interceptor unwraps it.
      // Assuming standard structure if our previous code worked.
      // Let's assume response.data IS the payload.

      const holdings = data.holdings || [];
      const summary = data.summary || {};

      const currentVal = holdings.reduce((acc: number, curr: any) => acc + (Number(curr.current_value) || 0), 0);
      const investedVal = Number(summary.total_invested) || 0;

      setStats({
        wallet: Number(userData.wallet_balance) || 0,
        invested: investedVal,
        currentValue: currentVal,
        totalPnl: currentVal - investedVal,
        holdingsCount: holdings.length
      });

      // 3. Notifications
      const notifRes = await notificationsApi.getRecent(5);
      // notifRes.data is the array of notifications
      setNotifications(notifRes.data || []);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const StatCard = ({ label, value, color }: any) => (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={[styles.cardValue, color && { color }]}>{value}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.username}>{user?.name || 'Trader'}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard label="Wallet Balance" value={`₹${stats.wallet.toLocaleString()}`} />
          <StatCard label="Total Invested" value={`₹${stats.invested.toLocaleString()}`} />
          <StatCard
            label="Current Value"
            value={`₹${stats.currentValue.toLocaleString()}`}
            color={stats.currentValue >= stats.invested ? '#28a745' : '#dc3545'}
          />
          <StatCard label="Holdings" value={stats.holdingsCount.toString()} />
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FontAwesome name="bell" size={16} color="#333" />
            <Text style={styles.sectionTitle}>Recent Notifications</Text>
          </View>

          {notifications.length === 0 ? (
            <Text style={styles.emptyText}>No notifications</Text>
          ) : (
            notifications.map(n => (
              <View key={n.id} style={styles.notifItem}>
                <View style={styles.notifIcon}>
                  <FontAwesome name="info" size={10} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifTitle}>{n.title}</Text>
                  <Text style={styles.notifMessage}>{n.message}</Text>
                  <Text style={styles.notifDate}>{new Date(n.created_at).toLocaleDateString()}</Text>
                </View>
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  greeting: { fontSize: 14, color: '#666' },
  username: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  card: {
    width: '45%', // Two cols
    backgroundColor: '#fff',
    padding: 15,
    margin: '2.5%',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    elevation: 2,
  },
  cardLabel: { fontSize: 12, color: '#888', marginBottom: 5 },
  cardValue: { fontSize: 18, fontWeight: 'bold', color: '#333' },

  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },

  notifItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    alignItems: 'flex-start',
  },
  notifIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  notifTitle: { fontSize: 14, fontWeight: '600', color: '#333' },
  notifMessage: { fontSize: 12, color: '#666', marginTop: 2, marginBottom: 4 },
  notifDate: { fontSize: 10, color: '#999' },

  emptyText: { textAlign: 'center', color: '#999', marginTop: 20 },
});
