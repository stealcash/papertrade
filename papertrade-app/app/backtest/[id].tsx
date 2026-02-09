import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { strategiesAPI } from '@/services/strategies';
import { backtestAPI } from '@/services/backtest';

export default function BacktestDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [run, setRun] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchDetail();
    }, [id]);

    const fetchDetail = async () => {
        try {
            const res = await backtestAPI.getRunById(Number(id));
            setRun(res.data?.data || res.data);
        } catch (error) {
            console.error('Failed to fetch backtest detail', error);
        } finally {
            setLoading(false);
        }
    };

    const topPerformers = useMemo(() => {
        if (!run || !run.list_of_trades_json) return [];
        const stats: Record<string, { wins: number, total: number }> = {};
        run.list_of_trades_json.forEach((trade: any) => {
            const sym = trade.stock_symbol;
            if (!stats[sym]) stats[sym] = { wins: 0, total: 0 };
            stats[sym].total += 1;
            if (trade.result === 'WIN') stats[sym].wins += 1;
        });
        return Object.entries(stats)
            .map(([symbol, data]) => ({
                symbol,
                wins: data.wins,
                total: data.total,
                rate: (data.wins / data.total) * 100
            }))
            .sort((a, b) => b.rate - a.rate || b.wins - a.wins)
            .slice(0, 5);
    }, [run]);

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={{ marginTop: 12, color: colors.tabIconDefault }}>Loading Analysis...</Text>
            </View>
        );
    }

    if (!run) {
        return (
            <View style={styles.centerContainer}>
                <Text style={{ color: colors.tabIconDefault }}>Backtest not found</Text>
            </View>
        );
    }

    const winRate = parseFloat(run.win_rate) || 0;
    const isProfitable = (run.total_pnl || 0) >= 0;

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ title: 'Backtest Report', headerShown: true }} />

            {/* Header / Strategy Info */}
            <View style={styles.header}>
                <Text style={[styles.strategyName, { color: colors.text }]}>
                    {run.strategy_details?.name || `Strategy #${run.strategy_predefined}`}
                </Text>
                <View style={styles.periodRow}>
                    <FontAwesome name="calendar" size={12} color={colors.tabIconDefault} />
                    <Text style={[styles.periodText, { color: colors.tabIconDefault }]}>
                        {new Date(run.start_date).toLocaleDateString()} - {new Date(run.end_date).toLocaleDateString()}
                    </Text>
                </View>
            </View>

            {/* Accuracy Summary */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Accuracy Summary</Text>
                <View style={styles.accuracyCard}>
                    <View style={styles.winRateCircle}>
                        <Text style={[styles.winRateLarge, { color: winRate >= 50 ? '#10b981' : '#ef4444' }]}>
                            {winRate.toFixed(1)}%
                        </Text>
                        <Text style={styles.winRateLabel}>Overall Win Rate</Text>
                    </View>
                    <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Total Signals</Text>
                            <Text style={styles.statValue}>{run.total_signals}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statLabel, { color: '#10b981' }]}>Wins</Text>
                            <Text style={styles.statValue}>{run.win_count}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statLabel, { color: '#ef4444' }]}>Losses</Text>
                            <Text style={styles.statValue}>{run.loss_count}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* PnL Card (Only if trades were made) */}
            {run.number_of_trades > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Financial Performance</Text>
                    <View style={styles.pnlCard}>
                        <View style={styles.pnlRow}>
                            <View>
                                <Text style={styles.statLabel}>Total P&L</Text>
                                <Text style={[styles.pnlValue, { color: isProfitable ? '#10b981' : '#ef4444' }]}>
                                    {isProfitable ? '+' : ''}₹{parseFloat(run.total_pnl).toLocaleString()}
                                </Text>
                            </View>
                            <View style={[styles.pnlBadge, { backgroundColor: isProfitable ? '#dcfce7' : '#fee2e2' }]}>
                                <Text style={{ color: isProfitable ? '#15803d' : '#b91c1c', fontWeight: 'bold' }}>
                                    {parseFloat(run.pnl_percentage).toFixed(2)}%
                                </Text>
                            </View>
                        </View>
                        <View style={styles.pnlSubRow}>
                            <View style={styles.pnlSubItem}>
                                <Text style={styles.pnlSubLabel}>Total Trades</Text>
                                <Text style={styles.pnlSubValue}>{run.number_of_trades}</Text>
                            </View>
                            <View style={styles.pnlSubItem}>
                                <Text style={styles.pnlSubLabel}>Initial Capital</Text>
                                <Text style={styles.pnlSubValue}>₹{parseFloat(run.initial_wallet_amount).toLocaleString()}</Text>
                            </View>
                        </View>
                    </View>
                </View>
            )}

            {/* Top Performers */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top Performers</Text>
                <View style={styles.performersList}>
                    {topPerformers.map((item, index) => (
                        <View key={item.symbol} style={styles.performerItem}>
                            <View style={styles.performerRank}>
                                <Text style={styles.rankText}>{index + 1}</Text>
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.performerSymbol}>{item.symbol}</Text>
                                <Text style={styles.performerStats}>{item.wins} Wins / {item.total} Total</Text>
                            </View>
                            <Text style={[styles.performerRate, { color: item.rate >= 50 ? '#10b981' : '#ef4444' }]}>
                                {item.rate.toFixed(1)}%
                            </Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* Predictions List */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Signal History</Text>
                <View style={styles.signalsList}>
                    {run.list_of_trades_json.map((sig: any, index: number) => (
                        <View key={index} style={styles.signalItem}>
                            <View style={styles.signalMain}>
                                <Text style={styles.signalSymbol}>{sig.stock_symbol}</Text>
                                <Text style={styles.signalDate}>{sig.signal_date}</Text>
                            </View>
                            <View style={styles.signalData}>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={styles.dataLabel}>Signal</Text>
                                    <View style={styles.signalDirection}>
                                        <Ionicons
                                            name={sig.signal === 'UP' ? 'trending-up' : 'trending-down'}
                                            size={14}
                                            color={sig.signal === 'UP' ? '#10b981' : '#ef4444'}
                                        />
                                        <Text style={[styles.dataValue, { color: sig.signal === 'UP' ? '#10b981' : '#ef4444' }]}>
                                            {sig.signal}
                                        </Text>
                                    </View>
                                </View>
                                <View style={{ alignItems: 'flex-end', marginLeft: 16 }}>
                                    <Text style={styles.dataLabel}>Result</Text>
                                    <View style={[styles.resultBadge, { backgroundColor: sig.result === 'WIN' ? '#dcfce7' : '#fee2e2' }]}>
                                        <Text style={[styles.resultText, { color: sig.result === 'WIN' ? '#15803d' : '#b91c1c' }]}>
                                            {sig.result}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    strategyName: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
    periodRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    periodText: { fontSize: 13 },

    section: { padding: 16 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#64748b', marginBottom: 12, textTransform: 'uppercase' },

    accuracyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    winRateCircle: { alignItems: 'center', marginBottom: 20 },
    winRateLarge: { fontSize: 32, fontWeight: 'bold' },
    winRateLabel: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
    statsGrid: { flexDirection: 'row', width: '100%', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16 },
    statItem: { flex: 1, alignItems: 'center' },
    statLabel: { fontSize: 11, color: '#94a3b8', marginBottom: 4 },
    statValue: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },

    pnlCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f1f5f9' },
    pnlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    pnlValue: { fontSize: 24, fontWeight: 'bold' },
    pnlBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    pnlSubRow: { flexDirection: 'row', gap: 24 },
    pnlSubItem: {},
    pnlSubLabel: { fontSize: 11, color: '#94a3b8', marginBottom: 2 },
    pnlSubValue: { fontSize: 14, fontWeight: '600', color: '#1e293b' },

    performersList: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9' },
    performerItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    performerRank: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
    rankText: { fontSize: 11, fontWeight: 'bold', color: '#64748b' },
    performerSymbol: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
    performerStats: { fontSize: 11, color: '#94a3b8' },
    performerRate: { fontSize: 14, fontWeight: 'bold' },

    signalsList: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9' },
    signalItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    signalMain: { flex: 1 },
    signalSymbol: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
    signalDate: { fontSize: 12, color: '#94a3b8' },
    signalData: { flexDirection: 'row' },
    signalDirection: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dataLabel: { fontSize: 10, color: '#94a3b8', marginBottom: 2 },
    dataValue: { fontSize: 12, fontWeight: 'bold' },
    resultBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    resultText: { fontSize: 10, fontWeight: 'bold' },
});
