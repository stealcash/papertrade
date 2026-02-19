
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity, FlatList, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { optionBacktestAPI, OptionBacktestRun } from '@/services/option-backtest';

export default function BacktestDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [run, setRun] = useState<OptionBacktestRun | null>(null);
    const [trades, setTrades] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingTrades, setLoadingTrades] = useState(false);
    const [resyncing, setResyncing] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    useEffect(() => {
        if (id) {
            loadInitialData();
        }
    }, [id]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const response = await optionBacktestAPI.get(id as string);
            const data = response.data?.data || response.data;
            setRun(data);

            // Load first page of trades
            await fetchTrades(1, true);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to fetch backtest details');
        } finally {
            setLoading(false);
        }
    };

    const fetchTrades = async (pageNum: number, isInitial: boolean = false) => {
        try {
            if (!isInitial) setLoadingTrades(true);

            const res = await optionBacktestAPI.getResults(id as string, { page: pageNum, page_size: 10 });
            const newTrades = res.data?.data?.results || [];
            const pagination = res.data?.data?.pagination;

            if (isInitial) {
                setTrades(newTrades);
            } else {
                setTrades(prev => [...prev, ...newTrades]);
            }

            if (pagination) {
                setHasMore(pagination.current_page < pagination.total_pages);
                setPage(pageNum);
            }
        } catch (err) {
            console.error('Failed to fetch trades', err);
        } finally {
            if (!isInitial) setLoadingTrades(false);
        }
    };

    const handleLoadMore = () => {
        if (!loadingTrades && hasMore) {
            fetchTrades(page + 1);
        }
    };

    const handleResync = async () => {
        Alert.alert(
            'Resync Backtest',
            'This will delete existing results and re-run the backtest. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Resync',
                    style: 'default',
                    onPress: async () => {
                        setResyncing(true);
                        try {
                            await optionBacktestAPI.resync(id as string);
                            loadInitialData(); // Reload everything
                            Alert.alert('Success', 'Backtest resynced successfully');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to resync backtest');
                        } finally {
                            setResyncing(false);
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0a7ea4" />
            </View>
        );
    }

    if (!run) {
        return (
            <View style={styles.center}>
                <Text>Backtest not found</Text>
            </View>
        );
    }

    const summary = run.results_summary_json || {};

    // Calculate fallback points if not in summary
    let totalBuyPoints = Number(summary.total_buy_points || 0);
    let totalSellPoints = Number(summary.total_sell_points || 0);

    const renderHeader = () => (
        <View style={styles.content}>
            {/* Header Info */}
            <View style={styles.headerInfo}>
                <View>
                    <Text style={styles.runId}>#{run.run_id}</Text>
                    <Text style={styles.strategyTitle}>{run.snapshot_name || run.strategy_name}</Text>
                    <View style={styles.badgeRow}>
                        <View style={[styles.badge, { backgroundColor: '#f3e8ff' }]}>
                            <Text style={[styles.badgeText, { color: '#7e22ce' }]}>{run.underlying_symbol}</Text>
                        </View>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>LOT: {run.lot_size}</Text>
                        </View>
                    </View>
                    <Text style={styles.dateRange}>
                        {new Date(run.start_date).toLocaleDateString()} → {new Date(run.end_date).toLocaleDateString()}
                    </Text>
                </View>
                <View style={styles.winRateContainer}>
                    <Text style={[styles.bigWinRate, { color: parseFloat(run.win_rate) >= 50 ? '#16a34a' : '#dc2626' }]}>
                        {run.win_rate}%
                    </Text>
                    <Text style={styles.winRateLabel}>Win Rate</Text>
                </View>
            </View>

            <TouchableOpacity
                style={styles.appliedStrategyBtn}
                onPress={() => router.push(`/option-backtest/${id}/applied-strategy` as any)}
            >
                <FontAwesome name="file-text-o" size={16} color="#0a7ea4" />
                <Text style={styles.appliedStrategyText}>View Applied Strategy Snapshot</Text>
                <FontAwesome name="chevron-right" size={12} color="#0a7ea4" />
            </TouchableOpacity>

            {/* Stats Grid */}
            <View style={styles.grid}>
                <MetricCard label="Total Trades" value={run.total_trades} />
                <MetricCard label="Winners" value={run.win_count || summary.win_count || '—'} color="#16a34a" />
                <MetricCard label="Losers" value={run.loss_count || summary.loss_count || '—'} color="#dc2626" />
                <MetricCard
                    label="Net P&L"
                    value={`₹${Math.round(Number(summary.total_pnl || 0)).toLocaleString()}`}
                    color={Number(summary.total_pnl) >= 0 ? "#16a34a" : "#dc2626"}
                    fullWidth
                />
                <MetricCard
                    label="Buy Pts"
                    value={totalBuyPoints.toFixed(1)}
                    color={totalBuyPoints >= 0 ? "#2563eb" : "#dc2626"}
                />
                <MetricCard
                    label="Sell Pts"
                    value={totalSellPoints.toFixed(1)}
                    color={totalSellPoints >= 0 ? "#ea580c" : "#dc2626"}
                />
            </View>

            <Text style={styles.sectionHeader}>Trade History</Text>
        </View>
    );

    const renderTradeItem = ({ item }: { item: any }) => (
        <View style={styles.tradeCard}>
            <View style={styles.tradeHeader}>
                <View style={styles.tradeDates}>
                    <Text style={styles.dateText}>{item.entry_date}</Text>
                    <FontAwesome name="long-arrow-right" size={12} color="#ccc" style={{ marginHorizontal: 4 }} />
                    <Text style={styles.dateText}>{item.exit_date}</Text>
                </View>
                <View style={styles.expiryBadge}>
                    <Text style={styles.expiryText}>{item.expiry_date}</Text>
                </View>
            </View>

            <View style={styles.legsContainer}>
                {item.legs_json.map((leg: any, idx: number) => (
                    <View key={idx} style={styles.legRow}>
                        <View style={[styles.actionBadge, leg.action === 'BUY' ? styles.bgGreen : styles.bgRed]}>
                            <Text style={styles.actionText}>{leg.action}</Text>
                        </View>
                        <Text style={styles.legDetail}>
                            {leg.strike} {leg.type}
                        </Text>
                        <View style={styles.priceContainer}>
                            <Text style={styles.price}>@{leg.entry?.toFixed(1)}</Text>
                            <FontAwesome name="arrow-right" size={10} color="#999" style={{ marginHorizontal: 4 }} />
                            <Text style={styles.price}>@{leg.exit?.toFixed(1)}</Text>
                        </View>
                        <Text style={[styles.legPnl, { color: leg.pnl >= 0 ? '#16a34a' : '#dc2626' }]}>
                            {leg.pnl >= 0 ? '+' : ''}{Math.round(leg.pnl)}
                        </Text>
                    </View>
                ))}
            </View>

            <View style={styles.tradeFooter}>
                <Text style={styles.reasonText}>
                    {(item.exit_reason || item.legs_json[0]?.reason || '').replace(/_/g, ' ')}
                </Text>
                <Text style={[styles.tradePnl, { color: item.total_pnl >= 0 ? '#16a34a' : '#dc2626' }]}>
                    {item.total_pnl >= 0 ? '+' : ''}₹{Math.round(Number(item.total_pnl)).toLocaleString()}
                </Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            {/* Nav Header */}
            <View style={styles.navHeader}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <FontAwesome name="arrow-left" size={20} color="#333" />
                </TouchableOpacity>
                <Text style={styles.navTitle}>Backtest Results</Text>
                <TouchableOpacity
                    onPress={handleResync}
                    disabled={resyncing}
                    style={styles.actionBtn}
                >
                    {resyncing ? <ActivityIndicator size="small" color="#0a7ea4" /> : <FontAwesome name="refresh" size={18} color="#0a7ea4" />}
                </TouchableOpacity>
            </View>

            <FlatList
                data={trades}
                renderItem={renderTradeItem}
                keyExtractor={(item, index) => index.toString()}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={styles.listContainer}
                ListFooterComponent={
                    hasMore ? (
                        <TouchableOpacity
                            onPress={handleLoadMore}
                            disabled={loadingTrades}
                            style={styles.loadMoreBtn}
                        >
                            {loadingTrades ? (
                                <ActivityIndicator color="#666" />
                            ) : (
                                <Text style={styles.loadMoreText}>Show More Trades</Text>
                            )}
                        </TouchableOpacity>
                    ) : (
                        trades.length > 0 ? <Text style={styles.endText}>End of results</Text> : null
                    )
                }
                ListEmptyComponent={!loading && <Text style={styles.emptyText}>No trades found for this period.</Text>}
            />
        </SafeAreaView>
    );
}

const MetricCard = ({ label, value, color = "#333", fullWidth = false }: { label: string, value: any, color?: string, fullWidth?: boolean }) => (
    <View style={[styles.metricCard, fullWidth && styles.fullWidth]}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    navHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backBtn: { padding: 8 },
    actionBtn: { padding: 8 },
    navTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    listContainer: {
        paddingBottom: 40,
    },
    content: {
        padding: 16,
    },
    headerInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    runId: {
        fontSize: 12,
        color: '#999',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        marginBottom: 4,
    },
    strategyTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#111',
        marginBottom: 8,
        maxWidth: 240,
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    badge: {
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#4b5563',
        textTransform: 'uppercase',
    },
    dateRange: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    winRateContainer: {
        alignItems: 'flex-end',
    },
    bigWinRate: {
        fontSize: 32,
        fontWeight: '900',
        lineHeight: 36,
    },
    winRateLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#9ca3af',
        textTransform: 'uppercase',
    },
    appliedStrategyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e0f2fe',
        padding: 12,
        borderRadius: 12,
        marginBottom: 24,
        gap: 8,
        borderWidth: 1,
        borderColor: '#bae6fd',
    },
    appliedStrategyText: {
        flex: 1,
        fontSize: 14,
        fontWeight: 'bold',
        color: '#0284c7',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    metricCard: {
        width: '31%', // 3 per row approx
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    fullWidth: {
        width: '100%',
        alignItems: 'center',
        backgroundColor: '#f0fdf4', // light green tint for PnL
        borderColor: '#bbf7d0',
    },
    metricLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#9ca3af',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    metricValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
        marginTop: 8,
    },
    tradeCard: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    tradeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f9fafb',
        paddingBottom: 8,
    },
    tradeDates: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6b7280',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    expiryBadge: {
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    expiryText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#4b5563',
    },
    legsContainer: {
        gap: 8,
        marginBottom: 12,
    },
    legRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    actionBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginRight: 8,
        minWidth: 40,
        alignItems: 'center'
    },
    bgGreen: { backgroundColor: '#22c55e' },
    bgRed: { backgroundColor: '#ef4444' },
    actionText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    legDetail: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
    },
    price: {
        fontSize: 12,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        color: '#6b7280',
    },
    legPnl: {
        fontSize: 13,
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        minWidth: 50,
        textAlign: 'right',
    },
    tradeFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f9fafb',
        paddingTop: 8,
    },
    reasonText: {
        fontSize: 11,
        color: '#9ca3af',
        fontStyle: 'italic',
        textTransform: 'capitalize',
    },
    tradePnl: {
        fontSize: 16,
        fontWeight: '900',
    },
    loadMoreBtn: {
        alignSelf: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: '#fff',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginTop: 10,
    },
    loadMoreText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4b5563',
    },
    endText: {
        textAlign: 'center',
        color: '#9ca3af',
        fontSize: 12,
        marginTop: 16,
    },
    emptyText: {
        textAlign: 'center',
        color: '#6b7280',
        marginTop: 40,
    }
});
