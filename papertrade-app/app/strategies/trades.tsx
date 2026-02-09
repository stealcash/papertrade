import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { strategiesAPI } from '@/services/strategies';

export default function TradesScreen() {
    const { strategyId, stockId, stockSymbol } = useLocalSearchParams();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const insets = useSafeAreaInsets();

    const [signals, setSignals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [strategyName, setStrategyName] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const itemsPerPage = 20; // Match website's paging size now that backend supports it

    useEffect(() => {
        loadData();
    }, [currentPage]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch strategy details
            const stratRes = await strategiesAPI.get(strategyId as string);
            const strat = stratRes.data.data || stratRes.data;
            setStrategyName(strat.name || strat.code);

            // Fetch signals
            const res = await strategiesAPI.getSignals({
                strategy: strat.code,
                stock: stockId,
                page: currentPage,
                page_size: itemsPerPage
            });

            const data = res.data.data || res.data;
            const results = data.results || [];

            setSignals(results);

            // Calculate total pages
            if (data.count) {
                setTotalPages(Math.ceil(data.count / itemsPerPage));
            } else {
                setTotalPages(1);
            }
        } catch (e) {
            console.error('Failed to load trades', e);
        } finally {
            setLoading(false);
        }
    };

    if (loading && signals.length === 0) {
        return (
            <View style={[styles.centered, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.tint} />
            </View>
        );
    }

    const renderSignal = ({ item }: { item: any }) => (
        <View style={[
            styles.signalCard,
            {
                backgroundColor: item.status === 'WIN' ? '#f0fdf4' : item.status === 'LOSS' ? '#fef2f2' : colors.card,
                borderColor: item.status === 'WIN' ? '#bcf0da' : item.status === 'LOSS' ? '#fecaca' : colors.border
            }
        ]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={[styles.signalValue, { color: colors.text, fontWeight: 'bold' }]}>
                    {item.date || new Date(item.created_at).toLocaleDateString()}
                </Text>
                <View style={[styles.directionBadge, { backgroundColor: item.signal_direction === 'UP' ? '#dcfce7' : '#fee2e2' }]}>
                    <Text style={[styles.directionText, { color: item.signal_direction === 'UP' ? '#166534' : '#991b1b' }]}>
                        {item.signal_direction}
                    </Text>
                </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={styles.compactCol}>
                    <Text style={styles.compactLabel}>Entry</Text>
                    <Text style={[styles.compactValue, { color: colors.text }]}>₹{Number(item.entry_price || 0).toFixed(1)}</Text>
                </View>
                <View style={styles.compactCol}>
                    <Text style={styles.compactLabel}>Exit</Text>
                    <Text style={[styles.compactValue, { color: colors.text }]}>{item.exit_price ? `₹${Number(item.exit_price).toFixed(1)}` : '-'}</Text>
                </View>
                <View style={styles.compactCol}>
                    <Text style={styles.compactLabel}>Result</Text>
                    {item.status === 'WIN' && <Text style={styles.winText}>WIN</Text>}
                    {item.status === 'LOSS' && <Text style={styles.lossText}>LOSS</Text>}
                    {item.status === 'PENDING' && <Text style={styles.pendingText}>PENDING</Text>}
                </View>
                <View style={styles.compactCol}>
                    <Text style={styles.compactLabel}>PnL</Text>
                    <Text style={[styles.compactValue, { color: Number(item.pnl) > 0 ? '#16a34a' : Number(item.pnl) < 0 ? '#dc2626' : '#999' }]}>
                        {item.pnl ? `${Number(item.pnl) > 0 ? '+' : ''}${item.pnl}` : '-'}
                    </Text>
                </View>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: `${stockSymbol} Trades`,
                    headerTitleStyle: { fontSize: 16, fontWeight: 'bold' },
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
                            <FontAwesome name="arrow-left" size={20} color={colors.text} />
                        </TouchableOpacity>
                    )
                }}
            />

            <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={[styles.strategyName, { color: colors.tabIconDefault }]}>{strategyName}</Text>
            </View>

            {signals.length === 0 ? (
                <View style={styles.emptyState}>
                    <FontAwesome name="inbox" size={48} color="#ccc" />
                    <Text style={{ color: '#999', marginTop: 16 }}>No trades found for this stock</Text>
                </View>
            ) : (
                <>
                    <FlatList
                        data={signals}
                        renderItem={renderSignal}
                        keyExtractor={(item, index) => `${item.id}-${index}`}
                        contentContainerStyle={{ padding: 12 }}
                    />

                    {/* Pagination */}
                    {signals.length > 0 && (
                        <View style={[
                            styles.pagination,
                            {
                                borderTopColor: colors.border,
                                paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
                                paddingHorizontal: 16
                            }
                        ]}>
                            <Text style={{ color: colors.tabIconDefault, fontSize: 12 }}>
                                Page {currentPage} of {totalPages}
                            </Text>
                            <View style={styles.paginationButtons}>
                                <TouchableOpacity
                                    style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
                                    onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <FontAwesome name="chevron-left" size={14} color={currentPage === 1 ? '#ccc' : colors.tint} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
                                    onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    <FontAwesome name="chevron-right" size={14} color={currentPage === totalPages ? '#ccc' : colors.tint} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 16, borderBottomWidth: 1 },
    stockSymbol: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
    strategyName: { fontSize: 14 },

    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    signalCard: { marginBottom: 8, padding: 10, borderRadius: 8, borderWidth: 1 },
    signalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    signalLabel: { fontSize: 12, fontWeight: '500' },
    signalValue: { fontSize: 12 },

    compactCol: { flex: 1, alignItems: 'center' },
    compactLabel: { fontSize: 10, color: '#666', marginBottom: 2 },
    compactValue: { fontSize: 11, fontWeight: 'bold' },

    directionBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    directionText: { fontSize: 10, fontWeight: 'bold' },

    winText: { color: '#16a34a', fontWeight: 'bold', fontSize: 11 },
    lossText: { color: '#dc2626', fontWeight: 'bold', fontSize: 11 },
    pendingText: { color: '#999', fontSize: 10 },
    pnlValue: { fontSize: 11, fontWeight: 'bold', fontFamily: 'monospace' },

    pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderTopWidth: 1 },
    paginationButtons: { flexDirection: 'row', gap: 10 },
    pageButton: { padding: 8, borderRadius: 8, backgroundColor: '#f3f4f6' },
    pageButtonDisabled: { opacity: 0.5 },
});
