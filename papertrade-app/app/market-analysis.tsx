import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, FlatList, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { stocksAPI } from '@/services/stocks';
import { strategiesAPI } from '@/services/strategies';

export default function MarketAnalysisScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    // Data State
    const [stocks, setStocks] = useState<any[]>([]);
    const [selectedStock, setSelectedStock] = useState<any>(null);
    const [priceHistory, setPriceHistory] = useState<any[]>([]);
    const [strategies, setStrategies] = useState<any[]>([]);
    const [selectedStrategyCode, setSelectedStrategyCode] = useState<string>('');
    const [stats, setStats] = useState({ total: 0, dirCorrect: 0, priceCorrect: 0 });

    // Loading State
    const [loadingStocks, setLoadingStocks] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [autoInitialized, setAutoInitialized] = useState(false);

    // Search & Filter
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const [endDate, setEndDate] = useState(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [stocksRes, stratsRes] = await Promise.all([
                    stocksAPI.getAll({ page_size: 100 }),
                    strategiesAPI.getAll()
                ]);
                const stockData = stocksRes.data?.data?.stocks || stocksRes.data?.stocks || [];
                setStocks(Array.isArray(stockData) ? stockData : []);
                setStrategies(stratsRes.data?.data || stratsRes.data || []);
            } catch (error) {
                console.error('Failed to fetch initial data', error);
            } finally {
                setLoadingStocks(false);
            }
        };
        fetchInitialData();
    }, []);

    // Auto-initialize: Select first stock & strategy once data is loaded
    useEffect(() => {
        if (autoInitialized || loadingStocks || stocks.length === 0 || strategies.length === 0) return;

        const sortedStocks = [...stocks].sort((a, b) => a.symbol.localeCompare(b.symbol));
        // Sort strategies if needed, or take first
        const firstStock = sortedStocks[0];
        const firstStrategy = strategies[0];

        if (firstStock && firstStrategy) {
            setSelectedStock(firstStock);
            setSearchQuery(firstStock.symbol);
            setSelectedStrategyCode(firstStrategy.code);
            setAutoInitialized(true);
            // Fetch history immediately
            fetchHistory(firstStock.symbol, firstStrategy.code);
        }
    }, [stocks, strategies, loadingStocks, autoInitialized]);

    const handleApply = () => {
        if (selectedStock) {
            fetchHistory(selectedStock.symbol, selectedStrategyCode);
        }
    };

    const onDateChange = (event: any, selectedDate: Date | undefined, isStart: boolean) => {
        if (isStart) setShowStartPicker(false);
        else setShowEndPicker(false);

        if (selectedDate) {
            if (isStart) setStartDate(selectedDate);
            else setEndDate(selectedDate);
        }
    };

    const fetchHistory = async (symbol: string, strategyCode: string) => {
        setLoadingHistory(true);
        try {
            const params: any = {
                stock_symbol: symbol,
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0],
                strategy: strategyCode || undefined
            };

            const response = await stocksAPI.getPrices(params);
            const allPrices = response.data?.data || response.data || [];
            const sorted = Array.isArray(allPrices)
                ? allPrices.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                : [];
            setPriceHistory(sorted);
        } catch (error) {
            console.error('Failed to fetch history', error);
            setPriceHistory([]);
        } finally {
            setLoadingHistory(false);
        }
    };

    // useEffect(() => {
    //     if (selectedStock) {
    //         fetchHistory(selectedStock.symbol, selectedStrategyCode);
    //     }
    // }, [selectedStock, selectedStrategyCode]);

    useEffect(() => {
        if (priceHistory.length > 0 && selectedStrategyCode) {
            calculateStats();
        } else {
            setStats({ total: 0, dirCorrect: 0, priceCorrect: 0 });
        }
    }, [priceHistory, selectedStrategyCode]);

    const calculateStats = () => {
        let total = 0;
        let dirCorrect = 0;
        let priceCorrect = 0;

        for (let i = 0; i < priceHistory.length - 1; i++) {
            const day = priceHistory[i];
            const prevDay = priceHistory[i + 1];

            const predictedPrice = day.predicted_price ? parseFloat(day.predicted_price) : null;
            const predictedDir = day.predicted_direction;

            if (predictedPrice !== null && predictedDir) {
                total++;
                const prevClose = prevDay.close_price;
                const actualClose = day.close_price;
                const actualChange = actualClose - prevClose;
                const actualChangePct = prevClose !== 0 ? (actualChange / prevClose) * 100 : 0;
                const actualDir = actualChange >= 0 ? 'UP' : 'DOWN';

                if (predictedDir === actualDir) dirCorrect++;

                const predictedChangePct = prevClose !== 0 ? ((predictedPrice - prevClose) / prevClose) * 100 : 0;
                if (predictedDir === 'UP') {
                    if (actualChangePct >= (0.5 * predictedChangePct)) priceCorrect++;
                } else {
                    if (actualChangePct <= (0.5 * predictedChangePct)) priceCorrect++;
                }
            }
        }
        setStats({ total, dirCorrect, priceCorrect });
    };

    const filteredStocks = stocks.filter(s =>
        s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderPriceItem = ({ item, index }: { item: any, index: number }) => {
        const prevClose = index < priceHistory.length - 1 ? priceHistory[index + 1].close_price : item.open_price;
        const change = item.close_price - prevClose;
        const changePercent = (change / prevClose) * 100;
        const isUp = change >= 0;

        return (
            <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                <View style={styles.colDate}>
                    <Text style={[styles.cellText, { color: colors.text }]}>{new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</Text>
                </View>
                <View style={styles.colPrice}>
                    <Text style={[styles.cellText, styles.bold, { color: colors.text }]}>₹{parseFloat(item.close_price as any || 0).toFixed(2)}</Text>
                    <Text style={[styles.tinyText, { color: isUp ? '#10b981' : '#ef4444' }]}>
                        {isUp ? '+' : ''}{(Number(changePercent) || 0).toFixed(2)}%
                    </Text>
                </View>
                {selectedStrategyCode ? (
                    <View style={styles.colPred}>
                        {item.predicted_direction ? (
                            <View style={[styles.predBadge, { backgroundColor: item.predicted_direction === 'UP' ? '#dcfce7' : '#fee2e2' }]}>
                                <Text style={[styles.predText, { color: item.predicted_direction === 'UP' ? '#15803d' : '#b91c1c' }]}>
                                    {item.predicted_direction}
                                </Text>
                            </View>
                        ) : <Text style={styles.cellText}>-</Text>}
                        <Text style={[styles.tinyText, { color: colors.tabIconDefault }]}>
                            {item.predicted_price ? `₹${parseFloat(item.predicted_price).toFixed(2)}` : ''}
                        </Text>
                    </View>
                ) : null}
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ title: 'Strategy Analysis', headerShown: true }} />

            <View style={styles.header}>
                {/* Search Stock */}
                <View style={[styles.searchContainer, { backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#f3f4f6' }]}>
                    <FontAwesome name="search" size={16} color={colors.tabIconDefault} style={styles.searchIcon} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Search for a stock..."
                        value={searchQuery}
                        onChangeText={(text) => { setSearchQuery(text); setIsSearchOpen(true); }}
                        onFocus={() => setIsSearchOpen(true)}
                    />
                </View>

                {/* Search Results Overlay */}
                {isSearchOpen && searchQuery.length > 0 && (
                    <View style={[styles.searchOverlay, { backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#fff', borderColor: colors.border }]}>
                        <FlatList
                            data={filteredStocks.slice(0, 5)}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.searchItem, { borderBottomColor: colors.border }]}
                                    onPress={() => { setSelectedStock(item); setSearchQuery(''); setIsSearchOpen(false); }}
                                >
                                    <Text style={[styles.searchSymbol, { color: colors.text }]}>{item.symbol}</Text>
                                    <Text style={[styles.searchName, { color: colors.tabIconDefault }]}>{item.name}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                )}

                {/* Strategy Selector */}
                <View style={styles.strategyRow}>
                    <Text style={[styles.label, { color: colors.tabIconDefault }]}>Strategy:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stratScroll}>
                        <TouchableOpacity
                            style={[styles.stratBtn, selectedStrategyCode === '' && styles.stratBtnActive, { borderColor: colors.border }]}
                            onPress={() => setSelectedStrategyCode('')}
                        >
                            <Text style={[styles.stratBtnText, { color: selectedStrategyCode === '' ? '#fff' : colors.text }]}>None</Text>
                        </TouchableOpacity>
                        {strategies.map(s => (
                            <TouchableOpacity
                                key={s.id}
                                style={[styles.stratBtn, selectedStrategyCode === s.code && styles.stratBtnActive, { borderColor: colors.border }]}
                                onPress={() => setSelectedStrategyCode(s.code)}
                            >
                                <Text style={[styles.stratBtnText, { color: selectedStrategyCode === s.code ? '#fff' : colors.text }]}>{s.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>

            {/* Date Filter & Apply */}
            <View style={styles.filterRow}>
                <TouchableOpacity onPress={() => setShowStartPicker(true)} style={[styles.dateBtn, { borderColor: colors.border }]}>
                    <Text style={[styles.dateText, { color: colors.text }]}>{startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</Text>
                </TouchableOpacity>
                <Text style={[styles.dateSep, { color: colors.tabIconDefault }]}>-</Text>
                <TouchableOpacity onPress={() => setShowEndPicker(true)} style={[styles.dateBtn, { borderColor: colors.border }]}>
                    <Text style={[styles.dateText, { color: colors.text }]}>{endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleApply}
                    disabled={loadingHistory || !selectedStock}
                    style={[styles.applyBtn, { opacity: (loadingHistory || !selectedStock) ? 0.6 : 1 }]}
                >
                    {loadingHistory ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.applyText}>Apply</Text>}
                </TouchableOpacity>

                {showStartPicker && (
                    <DateTimePicker
                        value={startDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(e, d) => onDateChange(e, d, true)}
                        maximumDate={endDate}
                    />
                )}
                {showEndPicker && (
                    <DateTimePicker
                        value={endDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(e, d) => onDateChange(e, d, false)}
                        minimumDate={startDate}
                        maximumDate={new Date()}
                    />
                )}
            </View>

            {!selectedStock ? (
                <View style={styles.centerContainer}>
                    <FontAwesome name="area-chart" size={64} color={colors.tabIconDefault} />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>Start Analysis</Text>
                    <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>Search for a stock to analyze its performance.</Text>
                </View>
            ) : (
                <View style={styles.mainContent}>
                    {/* Stats Summary */}
                    {selectedStrategyCode && stats.total > 0 && (
                        <View style={styles.statsRow}>
                            <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}>
                                <Text style={styles.statLabel}>Total Predictions</Text>
                                <Text style={styles.statValue}>{stats.total}</Text>
                            </View>
                            <View style={[styles.statCard, { backgroundColor: '#f0fdf4' }]}>
                                <Text style={styles.statLabel}>Direction Correct</Text>
                                <Text style={styles.statValue}>{(stats.total > 0 ? (stats.dirCorrect / stats.total) * 100 : 0).toFixed(0)}%</Text>
                            </View>
                            <View style={[styles.statCard, { backgroundColor: '#faf5ff' }]}>
                                <Text style={styles.statLabel}>Price Target Met</Text>
                                <Text style={styles.statValue}>{(stats.total > 0 ? (stats.priceCorrect / stats.total) * 100 : 0).toFixed(0)}%</Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.historyHeader}>
                        <Text style={[styles.stockTitle, { color: colors.text }]}>{selectedStock.name} ({selectedStock.symbol})</Text>
                    </View>

                    {loadingHistory ? (
                        <ActivityIndicator size="small" color="#3b82f6" style={{ marginTop: 20 }} />
                    ) : (
                        <FlatList
                            data={priceHistory}
                            renderItem={renderPriceItem}
                            keyExtractor={(item) => item.date}
                            ListHeaderComponent={() => (
                                <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
                                    <Text style={[styles.headerCell, styles.colDate]}>Date</Text>
                                    <View style={styles.colPriceHeader}>
                                        <Text style={[styles.headerCell, { textAlign: 'right' }]}>Close</Text>
                                    </View>
                                    {selectedStrategyCode ? (
                                        <View style={styles.colPredHeader}>
                                            <Text style={[styles.headerCell, { textAlign: 'center' }]}>Pred</Text>
                                        </View>
                                    ) : null}
                                </View>
                            )}
                        />
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 16, zIndex: 10 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', height: 44, borderRadius: 22, paddingHorizontal: 16 },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 14 },
    searchOverlay: { position: 'absolute', top: 60, left: 16, right: 16, borderRadius: 12, borderWidth: 1, elevation: 5, zIndex: 100 },
    searchItem: { padding: 12, borderBottomWidth: 1 },
    searchSymbol: { fontWeight: 'bold', fontSize: 14 },
    searchName: { fontSize: 11 },

    strategyRow: { marginTop: 16, flexDirection: 'row', alignItems: 'center' },
    label: { fontSize: 12, fontWeight: 'bold', marginRight: 8 },
    stratScroll: { flex: 1 },
    stratBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, marginRight: 8 },
    stratBtnActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
    stratBtnText: { fontSize: 11, fontWeight: '600' },

    filterRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
    dateBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, backgroundColor: 'transparent' },
    dateText: { fontSize: 12, fontWeight: '500' },
    dateSep: { fontWeight: 'bold' },
    applyBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginLeft: 'auto' },
    applyText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

    mainContent: { flex: 1, paddingHorizontal: 16 },
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    statCard: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
    statLabel: { fontSize: 10, color: '#4b5563', marginBottom: 4 },
    statValue: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },

    historyHeader: { marginBottom: 12 },
    stockTitle: { fontSize: 18, fontWeight: 'bold' },

    tableHeader: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1 },
    headerCell: { fontSize: 12, fontWeight: 'bold', color: '#6b7280' },
    tableRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, alignItems: 'center' },
    cellText: { fontSize: 13 },
    bold: { fontWeight: 'bold' },
    tinyText: { fontSize: 10, marginTop: 2 },

    colDate: { width: 80 },
    colPrice: { flex: 1, alignItems: 'flex-end', paddingRight: 0 },
    colPriceHeader: { flex: 1, alignItems: 'flex-end', paddingRight: 0 },
    colPred: { width: 90, alignItems: 'center' },
    colPredHeader: { width: 90, alignItems: 'center' },

    predBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    predText: { fontSize: 10, fontWeight: 'bold' },

    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
    emptyTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 16 },
    emptyText: { fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }
});
