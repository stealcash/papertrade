import React, { useEffect, useState, useCallback } from 'react';
import { Image, StyleSheet, View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { authAPI } from '@/services/auth';
import { notificationsAPI, Notification } from '@/services/notifications';
import { portfolioAPI } from '@/services/portfolio';

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    wallet: 0,
    invested: 0,
    currentValue: 0,
    totalPnl: 0,
    holdingsCount: 0
  });
  const [holdings, setHoldings] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    let userData: any = null;
    try {
      console.log('Fetching Profile...');
      try {
        const profileRes = await authAPI.profile();
        userData = profileRes.data?.data || profileRes.data;
        setUser(userData);
        console.log('Profile fetched successfully');
      } catch (e) {
        console.error('Error fetching profile:', e);
        throw e;
      }

      console.log('Fetching Notifications...');
      try {
        const notifRes = await notificationsAPI.getAll({ limit: 5 });
        const notifData = notifRes.data?.data || notifRes.data || [];
        setNotifications(Array.isArray(notifData) ? notifData : []);
        console.log('Notifications fetched successfully');
      } catch (e) {
        console.error('Error fetching notifications:', e);
        throw e; // fail gracefully? or rethrow?
      }

      console.log('Fetching Holdings...');
      try {
        const holdingsRes = await portfolioAPI.getHoldings();
        const holdingsData = holdingsRes.data?.data?.holdings || holdingsRes.data?.holdings || [];
        const summaryData = holdingsRes.data?.data?.summary || holdingsRes.data?.summary || {};

        setHoldings(Array.isArray(holdingsData) ? holdingsData.slice(0, 5) : []); // Show top 5 on dashboard

        const currentVal = Array.isArray(holdingsData)
          ? holdingsData.reduce((acc: number, curr: any) => acc + (Number(curr.current_value) || 0), 0)
          : 0;
        const investedVal = Number(summaryData.total_invested) || 0;

        setStats({
          wallet: Number(userData?.wallet_balance) || 0,
          invested: investedVal,
          currentValue: currentVal,
          totalPnl: currentVal - investedVal,
          holdingsCount: Array.isArray(holdingsData) ? holdingsData.length : 0
        });
        console.log('Holdings fetched successfully');

      } catch (e: any) {
        console.error('Error fetching holdings (graceful degradation):', e.message);
        // Do not throw, just show empty holdings
        setHoldings([]);
        // Keep existing stats or set to defaults? For now defaults, or partial update from profile
        setStats(prev => ({
          ...prev,
          wallet: Number(userData?.wallet_balance) || prev.wallet, // Ensure wallet is at least updated
        }));
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}
    >
      {!user && !loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Please login to view dashboard</Text>
        </View>
      ) : (
        <>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.username}>{user?.first_name || user?.email?.split('@')[0] || 'Trader'}!</Text>
            </View>
            <View style={styles.balanceContainer}>
              <Text style={styles.balanceLabel}>Wallet</Text>
              <Text style={styles.balance}>₹{stats.wallet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
              <Text style={styles.disclaimer}>This is not real money. It is only available for papertrade.</Text>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: '#3b82f6' }]}>
              <FontAwesome name="arrow-up" size={20} color="#fff" />
              <Text style={styles.statValue}>₹{stats.invested.toLocaleString('en-IN')}</Text>
              <Text style={styles.statLabel}>Invested</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#10b981' }]}>
              <FontAwesome name="line-chart" size={20} color="#fff" />
              <Text style={styles.statValue}>₹{stats.currentValue.toLocaleString('en-IN')}</Text>
              <Text style={styles.statLabel}>Current Value</Text>
            </View>
          </View>

          {/* Holdings Section */}
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.sectionTitle}>Your Holdings</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/portfolio')}>
                <Text style={{ color: '#3b82f6', fontWeight: '600' }}>View All</Text>
              </TouchableOpacity>
            </View>

            {holdings.length === 0 ? (
              <Text style={styles.emptyText}>No stocks in your portfolio yet.</Text>
            ) : (
              holdings.map((h: any) => (
                <View key={h.id} style={styles.holdingItem}>
                  <View style={styles.holdingLeft}>
                    <Text style={styles.holdingSymbol}>{h.stock_details.symbol}</Text>
                    <Text style={styles.holdingQty}>{h.quantity} shares</Text>
                  </View>
                  <View style={styles.holdingRight}>
                    <Text style={styles.holdingValue}>₹{Number(h.current_value).toLocaleString('en-IN')}</Text>
                    <Text style={[styles.holdingPnl, { color: Number(h.pnl) >= 0 ? '#16a34a' : '#dc2626' }]}>
                      {Number(h.pnl) >= 0 ? '+' : ''}₹{Number(h.pnl).toFixed(2)} ({Number(h.pnl_percentage).toFixed(2)}%)
                    </Text>
                  </View>
                  {/* Optional: Add Exit button here if space permits, or make row tappable */}
                  <TouchableOpacity
                    style={{ marginLeft: 10, padding: 6, backgroundColor: '#fee2e2', borderRadius: 6 }}
                    onPress={() => router.push('/(tabs)/portfolio')} // Direct to portfolio for full actions or implementing modal here is complex
                  >
                    <Text style={{ color: '#b91c1c', fontSize: 10, fontWeight: 'bold' }}>Exit</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {/* P&L Card */}
          <View style={[styles.pnlCard, { backgroundColor: stats.totalPnl >= 0 ? '#dcfce7' : '#fee2e2' }]}>
            <View style={styles.pnlHeader}>
              <Text style={[styles.pnlTitle, { color: stats.totalPnl >= 0 ? '#15803d' : '#b91c1c' }]}>Total P&L</Text>
              <FontAwesome name={stats.totalPnl >= 0 ? "arrow-up" : "arrow-down"} size={16} color={stats.totalPnl >= 0 ? '#15803d' : '#b91c1c'} />
            </View>
            <View style={styles.pnlContent}>
              <View>
                <Text style={[styles.pnlValue, { color: stats.totalPnl >= 0 ? '#15803d' : '#b91c1c' }]}>
                  {stats.totalPnl >= 0 ? '+' : ''}₹{stats.totalPnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
                <Text style={[styles.pnlSubtext, { color: stats.totalPnl >= 0 ? '#16a34a' : '#dc2626' }]}>
                  {stats.holdingsCount} Active Holdings
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.historyAction, { backgroundColor: stats.totalPnl >= 0 ? '#10b98120' : '#ef444420' }]}
                onPress={() => router.push('/trade-history')}
              >
                <FontAwesome name="history" size={14} color={stats.totalPnl >= 0 ? '#15803d' : '#b91c1c'} />
                <Text style={[styles.historyActionText, { color: stats.totalPnl >= 0 ? '#15803d' : '#b91c1c' }]}>History</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Notifications */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Notifications</Text>
            {notifications.length === 0 ? (
              <Text style={styles.emptyText}>No new notifications</Text>
            ) : (
              notifications.map((notification: any) => (
                <View key={notification.id} style={styles.notificationItem}>
                  <View style={[
                    styles.notificationIcon,
                    {
                      backgroundColor: notification.type === 'success' ? '#dcfce7' :
                        notification.type === 'error' ? '#fee2e2' :
                          notification.type === 'warning' ? '#fef3c7' : '#dbeafe'
                    }
                  ]}>
                    <FontAwesome
                      name={
                        notification.type === 'success' ? 'check-circle' :
                          notification.type === 'error' ? 'exclamation-circle' :
                            notification.type === 'warning' ? 'exclamation-triangle' : 'info-circle'
                      }
                      size={16}
                      color={
                        notification.type === 'success' ? '#15803d' :
                          notification.type === 'error' ? '#b91c1c' :
                            notification.type === 'warning' ? '#a16207' : '#1e40af'
                      }
                    />
                  </View>
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                    <Text style={styles.notificationMessage}>{notification.message}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    padding: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    backgroundColor: '#fff',
    paddingTop: 40,
  },
  greeting: {
    fontSize: 14,
    color: '#6b7280',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 4,
  },
  balanceContainer: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  balance: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
    marginTop: 2,
  },
  disclaimer: {
    fontSize: 8,
    color: '#9ba3af',
    marginTop: 4,
    fontStyle: 'italic',
    textAlign: 'right',
    maxWidth: 150,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    marginTop: 4,
    opacity: 0.9,
  },
  pnlCard: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  pnlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pnlTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  pnlValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 8,
  },
  pnlSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  pnlContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  historyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  historyActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  notificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  notificationMessage: {
    fontSize: 13,
    color: '#6b7280',
  },
  holdingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  holdingLeft: {
    flexDirection: 'column',
  },
  holdingSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  holdingQty: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  holdingRight: {
    alignItems: 'flex-end',
  },
  holdingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  holdingPnl: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
});
