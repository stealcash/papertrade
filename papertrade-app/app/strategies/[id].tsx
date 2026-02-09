import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, FlatList, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { strategiesAPI } from '@/services/strategies';
import { backtestAPI } from '@/services/backtest';

interface StrategyDetail {
    id: number;
    name: string;
    code: string;
    description: string;
    type: string;
    status: string;
    config?: any;
}

export default function StrategyDetailScreen() {
    const { id, isCustom } = useLocalSearchParams();
    const router = useRouter(); // Initialize router
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const insets = useSafeAreaInsets();

    const [strategy, setStrategy] = useState<StrategyDetail | null>(null);
    const [performanceData, setPerformanceData] = useState<any[]>([]);
    const [latestBacktest, setLatestBacktest] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'stocks'>('overview');

    // Filters and search
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSector, setSelectedSector] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [allSectors, setAllSectors] = useState<string[]>([]);
    const [allCategories, setAllCategories] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<{ min: string | null, max: string | null }>({ min: null, max: null });

    const fetchDetail = async () => {
        try {
            // 1. Fetch Strategy Details
            const res = isCustom === 'true'
                ? await strategiesAPI.getRuleBasedById(Number(id))
                : await strategiesAPI.get(id as string);

            const stratData = res.data.data || res.data;
            setStrategy(stratData);

            // 2. Fetch Performance (Last 60 Days)
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 60);
            const startDateStr = startDate.toISOString().split('T')[0];

            let perfData = [];
            try {
                const perfRes = await strategiesAPI.getPerformance({
                    strategy_id: id,
                    start_date: startDateStr
                });
                perfData = perfRes.data.data || perfRes.data?.data || [];
                const meta = perfRes.data.metadata || perfRes.data?.metadata || {};

                // Set metadata
                setDateRange({
                    min: meta.min_date || startDateStr,
                    max: meta.max_date || new Date().toISOString().split('T')[0]
                });
                if (meta.all_sectors) setAllSectors(meta.all_sectors);
                if (meta.all_categories) setAllCategories(meta.all_categories);

                setPerformanceData(Array.isArray(perfData) ? perfData : []);
            } catch (e) {
                console.log("Perf fetch failed");
            }

            // 3. Fetch Latest Backtest
            if (stratData?.code) {
                try {
                    // Using getRuns from backtestAPI
                    const runsRes = await backtestAPI.getRuns({ strategy_code: stratData.code });
                    const runs = runsRes.data.data?.results || runsRes.data?.data || [];
                    const latest = runs.find((r: any) => r.strategy_predefined === stratData.code && r.status === 'COMPLETED');
                    if (latest) setLatestBacktest(latest);
                } catch (e) { console.log('Backtest fetch failed'); }
            }

        } catch (e) {
            console.error('Error fetching strategy detail:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetail();
    }, [id]);

    const topLivePerformers = useMemo(() => {
        return [...performanceData]
            .sort((a, b) => b.win_rate - a.win_rate || b.wins - a.wins)
            .slice(0, 5);
    }, [performanceData]);

    // Filtered signals based on search and filters
    const filteredPerformance = useMemo(() => {
        return performanceData.filter(item => {
            const matchesSearch = item.stock_symbol?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesSector = selectedSector ? item.sectors?.includes(selectedSector) : true;
            const matchesCategory = selectedCategory ? item.categories?.includes(selectedCategory) : true;
            return matchesSearch && matchesSector && matchesCategory;
        });
    }, [performanceData, searchTerm, selectedSector, selectedCategory]);

    if (loading) {
        return (
            <View style={[styles.centered, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.tint} />
            </View>
        );
    }

    if (!strategy) {
        return (
            <View style={[styles.centered, { backgroundColor: colors.background }]}>
                <Text style={{ color: colors.text }}>Strategy not found</Text>
            </View>
        );
    }

    const renderStockItem = ({ item }: { item: any }) => (
        <View style={styles.stockRow}>
            <View style={{ flex: 2 }}>
                <Text style={styles.stockSymbol}>{item.stock_symbol}</Text>
                <Text style={styles.stockSignals}>{item.total_signals} Signals</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={[styles.winRateBadge, { backgroundColor: item.win_rate >= 50 ? '#dcfce7' : '#ffedd5' }]}>
                    <Text style={[styles.winRateText, { color: item.win_rate >= 50 ? '#166534' : '#9a3412' }]}>
                        {item.win_rate}%
                    </Text>
                </View>
            </View>
            <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                <Text style={[styles.pnlText, { color: item.total_pnl >= 0 ? '#16a34a' : '#dc2626' }]}>
                    {item.total_pnl >= 0 ? '+' : ''}{Number(item.total_pnl).toFixed(2)}
                </Text>
                <Text style={styles.recordText}>W:{item.wins} L:{item.losses}</Text>
            </View>
            <TouchableOpacity
                style={styles.viewTradesButton}
                onPress={() => router.push({ pathname: '/strategies/trades', params: { strategyId: id, stockId: item.stock_id, stockSymbol: item.stock_symbol } } as any)}
            >
                <Text style={styles.viewTradesText}>View Trades</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{
                title: strategy.name || 'Strategy Detail',
                headerTitleStyle: { fontSize: 16, fontWeight: 'bold' },
                headerTitleAlign: 'left'
            }} />

            <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', flex: 1, alignItems: 'center', gap: 12 }}>
                        <View style={[styles.iconBox, { backgroundColor: colors.tint }]}>
                            <FontAwesome name="flash" size={24} color="#fff" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.name, { color: colors.text }]}>{strategy.name}</Text>
                            <Text style={[styles.type, { color: colors.tabIconDefault }]}>{strategy.type} Strategy</Text>
                            {dateRange.max && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                    <FontAwesome name="clock-o" size={11} color={colors.tabIconDefault} />
                                    <Text style={[styles.lastData, { color: colors.tabIconDefault }]}>Last Data: {dateRange.max}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {isCustom === 'true' && (
                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => router.push({ pathname: '/strategies/edit', params: { id: strategy.id } } as any)}
                        >
                            <FontAwesome name="pencil" size={16} color="#fff" />
                            <Text style={styles.editButtonText}>Edit</Text>
                        </TouchableOpacity>
                    )}

                    {latestBacktest && (
                        <View style={styles.backtestBadge}>
                            <Text style={styles.backtestLabel}>Win Rate</Text>
                            <Text style={[styles.backtestValue, { color: Number(latestBacktest.win_rate) >= 50 ? '#16a34a' : '#dc2626' }]}>
                                {latestBacktest.win_rate}%
                            </Text>
                        </View>
                    )}
                </View>

                {/* Description */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
                    <Text style={[styles.description, { color: colors.tabIconDefault }]}>
                        {strategy.description || 'No description provided.'}
                    </Text>
                </View>

                {/* Backtest Stats */}
                {latestBacktest && (
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                            <FontAwesome name="history" size={16} color={colors.text} />
                            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Backtest Summary</Text>
                        </View>
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Total Trades</Text>
                                <Text style={styles.statValue}>{latestBacktest.total_trades}</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Wins</Text>
                                <Text style={[styles.statValue, { color: '#16a34a' }]}>{latestBacktest.win_count}</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Losses</Text>
                                <Text style={[styles.statValue, { color: '#dc2626' }]}>{latestBacktest.loss_count}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Top Performers (Live) */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                        <FontAwesome name="line-chart" size={16} color={colors.text} />
                        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Top Live Performers</Text>
                    </View>
                    {topLivePerformers.length === 0 ? (
                        <Text style={{ color: '#999', fontStyle: 'italic' }}>No live data available yet.</Text>
                    ) : (
                        topLivePerformers.map((stock, i) => (
                            <View key={stock.stock_symbol} style={styles.performerRow}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <View style={[styles.rankBadge, i === 0 && { backgroundColor: '#fef08a' }]}>
                                        <Text style={[styles.rankText, i === 0 && { color: '#854d0e' }]}>{i + 1}</Text>
                                    </View>
                                    <Text style={styles.performerSymbol}>{stock.stock_symbol}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ fontWeight: 'bold', color: '#16a34a' }}>{stock.win_rate}%</Text>
                                    <Text style={{ fontSize: 10, color: '#666' }}>{stock.wins} Wins</Text>
                                </View>
                            </View>
                        ))
                    )}
                </View>

                {/* Stock List */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Stock Performance</Text>
                        {dateRange.min && (
                            <Text style={styles.dateRange}>
                                {dateRange.min} — {dateRange.max}
                            </Text>
                        )}
                    </View>

                    {/* Search and Filters */}
                    <View style={{ marginBottom: 12, gap: 8 }}>
                        <TextInput
                            style={[styles.searchInput, { borderColor: colors.border, color: colors.text }]}
                            placeholder="Search Stock..."
                            placeholderTextColor="#999"
                            value={searchTerm}
                            onChangeText={setSearchTerm}
                        />
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.filterLabel}>Sector</Text>
                                <View style={[styles.pickerContainer, { borderColor: colors.border }]}>
                                    <Picker
                                        selectedValue={selectedSector}
                                        onValueChange={(value) => setSelectedSector(value)}
                                        style={{ height: 40, color: colors.text }}
                                    >
                                        <Picker.Item label="All Sectors" value="" />
                                        {allSectors.map(s => <Picker.Item key={s} label={s} value={s} />)}
                                    </Picker>
                                </View>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.filterLabel}>Category</Text>
                                <View style={[styles.pickerContainer, { borderColor: colors.border }]}>
                                    <Picker
                                        selectedValue={selectedCategory}
                                        onValueChange={(value) => setSelectedCategory(value)}
                                        style={{ height: 40, color: colors.text }}
                                    >
                                        <Picker.Item label="All Categories" value="" />
                                        {allCategories.map(c => <Picker.Item key={c} label={c} value={c} />)}
                                    </Picker>
                                </View>
                            </View>
                        </View>
                    </View>

                    {filteredPerformance.length === 0 ? (
                        <Text style={{ color: '#999', padding: 20, textAlign: 'center' }}>No data found</Text>
                    ) : (
                        filteredPerformance.slice(0, 20).map((item, index) => (
                            <View key={index}>
                                {renderStockItem({ item })}
                                {index < filteredPerformance.length - 1 && <View style={styles.separator} />}
                            </View>
                        ))
                    )}
                    {filteredPerformance.length > 20 && (
                        <Text style={{ textAlign: 'center', color: '#999', marginTop: 10, fontSize: 12 }}>Showing top 10 stocks</Text>
                    )}
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 10, gap: 12 },
    iconBox: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
    name: { fontSize: 20, fontWeight: 'bold' },
    type: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },

    backtestBadge: { alignItems: 'flex-end' },
    backtestLabel: { fontSize: 10, color: '#666', textTransform: 'uppercase' },
    backtestValue: { fontSize: 18, fontWeight: 'bold' },

    card: { marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 12, borderWidth: 1 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
    description: { fontSize: 14, lineHeight: 20 },

    statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    statItem: { alignItems: 'center', flex: 1 },
    statLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
    statValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },

    performerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    performerSymbol: { fontWeight: '600', fontSize: 14 },
    rankBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
    rankText: { fontSize: 10, fontWeight: 'bold', color: '#666' },

    stockRow: { flexDirection: 'row', paddingVertical: 12, alignItems: 'center' },
    stockSymbol: { fontWeight: 'bold', fontSize: 15, marginBottom: 2 },
    stockSignals: { fontSize: 11, color: '#666' },
    winRateBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    winRateText: { fontSize: 12, fontWeight: 'bold' },
    pnlText: { fontWeight: 'bold', fontSize: 14 },
    recordText: { fontSize: 10, color: '#666' },
    separator: { height: 1, backgroundColor: '#f3f4f6' },

    configRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.1)' },
    configKey: { fontSize: 14, textTransform: 'capitalize' },
    configValue: { fontSize: 14, fontWeight: '600' },
    editButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3b82f6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 6 },
    editButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },

    // New styles for filters, search, and View Trades
    lastData: { fontSize: 10 },
    dateRange: { fontSize: 10, color: '#666', fontFamily: 'monospace' },
    searchInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
    filterLabel: { fontSize: 11, color: '#666', marginBottom: 4, fontWeight: '500' },
    pickerContainer: { borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
    viewTradesButton: { backgroundColor: '#dbeafe', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, marginLeft: 8 },
    viewTradesText: { color: '#3b82f6', fontSize: 11, fontWeight: '600' },
});
