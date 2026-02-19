import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { strategiesAPI } from '@/services/strategies';
import { backtestAPI } from '@/services/backtest';

interface BacktestRun {
    id: number;
    strategy_name: string;
    stock_symbol: string;
    start_date: string;
    end_date: string;
    win_rate: number;
    total_trades: number;
    profit_loss: number;
    created_at: string;
}

export default function BacktestScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const insets = useSafeAreaInsets();

    const [backtests, setBacktests] = useState<BacktestRun[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchBacktests = async (p = 1) => {
        try {
            const response = await backtestAPI.getRuns({ page: p });
            const data = response.data?.data || response.data || {};

            if (Array.isArray(data)) {
                setBacktests(data);
            } else {
                setBacktests(data.results || []);
                setTotalPages(data.pagination?.total_pages || 1);
            }
            setPage(p);
        } catch (error) {
            console.error('Failed to fetch backtests', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchBacktests();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchBacktests(1);
    };

    const handleDelete = async (id: number) => {
        Alert.alert(
            "Delete Backtest",
            "Are you sure you want to delete this backtest run?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await backtestAPI.delete(id);
                            fetchBacktests(page);
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete backtest");
                        }
                    }
                }
            ]
        );
    };

    const renderBacktestItem = ({ item }: { item: BacktestRun }) => {
        const winRate = typeof item.win_rate === 'number' ? item.win_rate : parseFloat(item.win_rate as any) || 0;
        const profitLoss = typeof item.profit_loss === 'number' ? item.profit_loss : parseFloat(item.profit_loss as any) || 0;
        const isProfitable = profitLoss >= 0;

        return (
            <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#fff', borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.strategyName, { color: colors.text }]}>{item.strategy_name || 'Strategy'}</Text>
                        <Text style={[styles.stockSymbol, { color: colors.tabIconDefault }]}>{item.stock_symbol || 'N/A'}</Text>
                    </View>
                    <View style={styles.headerActions}>
                        <View style={[styles.winRateBadge, { backgroundColor: winRate >= 50 ? '#dcfce7' : '#fee2e2' }]}>
                            <Text style={[styles.winRateText, { color: winRate >= 50 ? '#15803d' : '#b91c1c' }]}>
                                {winRate.toFixed(1)}% Win Rate
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                            <FontAwesome name="trash" size={16} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statCol}>
                        <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>P&L</Text>
                        <Text style={[styles.statValue, { color: isProfitable ? '#10b981' : '#ef4444' }]}>
                            {isProfitable ? '+' : ''}₹{profitLoss.toFixed(2)}
                        </Text>
                    </View>
                    <View style={styles.statCol}>
                        <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>Trades</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>{item.total_trades || 0}</Text>
                    </View>
                    <View style={styles.statCol}>
                        <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>Period</Text>
                        <Text style={[styles.statValue, { color: colors.text, fontSize: 10 }]}>
                            {item.start_date ? new Date(item.start_date).toLocaleDateString() : 'N/A'} - {item.end_date ? new Date(item.end_date).toLocaleDateString() : 'N/A'}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.footer, { borderTopColor: colors.border }]}
                    onPress={() => router.push(`/backtest/${item.id}`)}
                >
                    <Text style={[styles.createdAt, { color: colors.tabIconDefault }]}>
                        Ran on {item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A'}
                    </Text>
                    <View style={styles.viewAction}>
                        <Text style={[styles.viewText, { color: '#3b82f6' }]}>View</Text>
                        <FontAwesome name="chevron-right" size={12} color="#3b82f6" />
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;
        return (
            <View style={styles.pagination}>
                <TouchableOpacity
                    disabled={page <= 1}
                    onPress={() => fetchBacktests(page - 1)}
                    style={[styles.pageBtn, page <= 1 && styles.disabledBtn]}
                >
                    <FontAwesome name="chevron-left" size={14} color={page <= 1 ? '#94a3b8' : '#1e293b'} />
                    <Text style={[styles.pageBtnText, { color: page <= 1 ? '#94a3b8' : '#1e293b' }]}>Prev</Text>
                </TouchableOpacity>
                <Text style={styles.pageInfo}>Page {page} of {totalPages}</Text>
                <TouchableOpacity
                    disabled={page >= totalPages}
                    onPress={() => fetchBacktests(page + 1)}
                    style={[styles.pageBtn, page >= totalPages && styles.disabledBtn]}
                >
                    <Text style={[styles.pageBtnText, { color: page >= totalPages ? '#94a3b8' : '#1e293b' }]}>Next</Text>
                    <FontAwesome name="chevron-right" size={14} color={page >= totalPages ? '#94a3b8' : '#1e293b'} />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Custom Header with Actions */}
            <View style={styles.headerRow}>
                <Text style={[styles.screenTitle, { color: colors.text }]}>Backtest History</Text>
                <View style={styles.headerBtns}>
                    <TouchableOpacity onPress={() => router.push('/strategies')} style={styles.iconBtn}>
                        <FontAwesome name="cog" size={20} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push('/backtest/create')} style={[styles.newBtn, { backgroundColor: colors.tint }]}>
                        <FontAwesome name="plus" size={14} color="#fff" />
                        <Text style={styles.newBtnText}>New</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                </View>
            ) : (
                <>
                    <FlatList
                        data={backtests}
                        renderItem={renderBacktestItem}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.list}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <FontAwesome name="history" size={48} color={colors.tabIconDefault} />
                                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Backtests Found</Text>
                                <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
                                    You haven't run any backtests yet. Start a backtest from the web dashboard to see results here.
                                </Text>
                            </View>
                        }
                    />
                    {renderPagination()}
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
    screenTitle: { fontSize: 20, fontWeight: 'bold' },
    headerBtns: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBtn: { padding: 8 },
    newBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, gap: 4 },
    newBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    list: { padding: 16 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    strategyName: { fontSize: 16, fontWeight: 'bold' },
    stockSymbol: { fontSize: 12, marginTop: 2 },
    winRateBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    winRateText: { fontSize: 10, fontWeight: 'bold' },

    statsRow: { flexDirection: 'row', marginBottom: 16 },
    statCol: { flex: 1 },
    statLabel: { fontSize: 10, textTransform: 'uppercase', marginBottom: 4 },
    statValue: { fontSize: 14, fontWeight: 'bold' },

    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
    },
    createdAt: { fontSize: 10 },

    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 16 },
    emptyText: { fontSize: 14, textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },

    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    deleteBtn: { padding: 4 },
    viewAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    viewText: { fontSize: 12, fontWeight: 'bold' },

    pagination: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    pageBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8 },
    disabledBtn: { opacity: 0.5 },
    pageBtnText: { fontSize: 14, fontWeight: 'bold' },
    pageInfo: { fontSize: 14, color: '#64748b' },
});
