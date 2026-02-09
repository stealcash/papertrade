import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert, SafeAreaView, ScrollView, Modal, TextInput, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { stocksAPI } from '@/services/stocks';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import DateTimePicker from '@react-native-community/datetimepicker';

type ViewMode = 'TABLE' | 'SUMMARY';

export default function StockHistoryScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const router = useRouter();

    const [selectedStockIds, setSelectedStockIds] = useState<number[]>([]);
    const [selectedStocks, setSelectedStocks] = useState<any[]>([]);
    const [prices, setPrices] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSelectionOpen, setIsSelectionOpen] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('TABLE');

    // Selection Modal State
    const [allStocks, setAllStocks] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loadingStocks, setLoadingStocks] = useState(false);

    const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const [endDate, setEndDate] = useState(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    useEffect(() => {
        if (selectedStockIds.length > 0) {
            fetchPrices();
        } else {
            setPrices([]);
        }
    }, [selectedStockIds, startDate, endDate]);

    const fetchPrices = async () => {
        setLoading(true);
        try {
            const params = {
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0],
                stock_ids: selectedStockIds.join(',')
            };
            const res = await stocksAPI.getPrices(params);
            const data = res.data?.data || res.data;
            setPrices(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch prices', error);
            Alert.alert("Error", "Failed to load comparison data.");
            setPrices([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllStocks = async () => {
        if (!isSelectionOpen) return;
        setLoadingStocks(true);
        try {
            const res = await stocksAPI.getAll({ page_size: 100, search: searchQuery });
            const data = res.data?.data || res.data;
            const list = data.stocks || data.results || [];
            setAllStocks(Array.isArray(list) ? list : []);
        } catch (error) {
            console.error(error);
            setAllStocks([]);
        } finally {
            setLoadingStocks(false);
        }
    };

    useEffect(() => {
        if (isSelectionOpen) {
            fetchAllStocks();
        }
    }, [isSelectionOpen, searchQuery]);

    const toggleStockSelection = (stock: any) => {
        const isSelected = selectedStockIds.includes(stock.id);
        if (isSelected) {
            setSelectedStockIds(prev => prev.filter(id => id !== stock.id));
            setSelectedStocks(prev => prev.filter(s => s.id !== stock.id));
        } else {
            if (selectedStockIds.length >= 5) {
                Alert.alert("Limit Reached", "You can compare up to 5 stocks at once.");
                return;
            }
            setSelectedStockIds(prev => [...prev, stock.id]);
            setSelectedStocks(prev => [...prev, stock]);
        }
    };

    const pivotData = useMemo(() => {
        if (!prices.length) return { stocks: [], rows: [], summary: {} };

        const datesSet = new Set(prices.map(p => p.date));
        const datesDesc = Array.from(datesSet).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        const stockSymbols = Array.from(new Set(prices.map(p => p.stock_symbol))).sort();

        const priceMap = new Map();
        prices.forEach(p => {
            const key = `${p.date}_${p.stock_symbol}`;
            priceMap.set(key, p.close_price);
        });

        const rows = datesDesc.map((date, idx) => {
            const rowPrices: { [symbol: string]: number } = {};
            const rowChanges: { [symbol: string]: number | null } = {};
            const prevDate = idx < datesDesc.length - 1 ? datesDesc[idx + 1] : null;

            stockSymbols.forEach(symbol => {
                const current = priceMap.get(`${date}_${symbol}`);
                if (current != null) rowPrices[symbol] = current;

                if (prevDate) {
                    const prev = priceMap.get(`${prevDate}_${symbol}`);
                    if (current != null && prev != null && prev !== 0) {
                        rowChanges[symbol] = ((current - prev) / prev) * 100;
                    } else {
                        rowChanges[symbol] = null;
                    }
                } else {
                    rowChanges[symbol] = null;
                }
            });
            return { date, prices: rowPrices, changes: rowChanges };
        });

        const summary: { [symbol: string]: { totalChange: number; startPrice: number; endPrice: number } } = {};
        stockSymbols.forEach(symbol => {
            const stockPrices = prices.filter(p => p.stock_symbol === symbol).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            if (stockPrices.length >= 2) {
                const start = stockPrices[0].close_price;
                const end = stockPrices[stockPrices.length - 1].close_price;
                summary[symbol] = {
                    totalChange: start !== 0 ? ((end - start) / start) * 100 : 0,
                    startPrice: start,
                    endPrice: end
                };
            }
        });

        return { stocks: stockSymbols, rows, summary };
    }, [prices]);

    const renderHeader = () => (
        <View style={[styles.tableHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
            <View style={styles.dateCol}>
                <Text style={[styles.headerText, { color: colors.tabIconDefault }]}>DATE</Text>
            </View>
            {pivotData.stocks.map(symbol => (
                <View key={symbol} style={styles.stockCol}>
                    <Text style={[styles.headerText, { color: colors.text, fontWeight: 'bold' }]}>{symbol}</Text>
                </View>
            ))}
        </View>
    );

    const renderRow = ({ item }: { item: any }) => (
        <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
            <View style={styles.dateCol}>
                <Text style={[styles.dateText, { color: colors.text }]}>
                    {new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                </Text>
            </View>
            {pivotData.stocks.map(symbol => {
                const price = item.prices[symbol];
                const change = item.changes[symbol];
                return (
                    <View key={symbol} style={styles.stockCol}>
                        <Text style={[styles.priceText, { color: colors.text }]}>
                            {price ? `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                        </Text>
                        {change !== null && (
                            <Text style={[styles.changeTextSmall, { color: change >= 0 ? '#10b981' : '#ef4444' }]}>
                                {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                            </Text>
                        )}
                    </View>
                );
            })}
        </View>
    );

    const renderSummary = () => (
        <ScrollView contentContainerStyle={styles.summaryList}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>Period Performance</Text>
            <Text style={[styles.summaryDates, { color: colors.tabIconDefault }]}>
                {startDate.toLocaleDateString()} to {endDate.toLocaleDateString()}
            </Text>

            {pivotData.stocks.map(symbol => {
                const data = pivotData.summary[symbol];
                if (!data) return null;
                const isPos = data.totalChange >= 0;
                return (
                    <View key={symbol} style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.summaryCardMain}>
                            <Text style={[styles.summarySymbol, { color: colors.text }]}>{symbol}</Text>
                            <View style={[styles.summaryBadge, { backgroundColor: isPos ? '#dcfce7' : '#fee2e2' }]}>
                                <FontAwesome name={isPos ? "caret-up" : "caret-down"} size={14} color={isPos ? "#15803d" : "#b91c1c"} />
                                <Text style={[styles.summaryBadgeText, { color: isPos ? "#15803d" : "#b91c1c" }]}>
                                    {Math.abs(data.totalChange).toFixed(2)}%
                                </Text>
                            </View>
                        </View>
                        <View style={styles.summaryDetails}>
                            <View style={styles.summaryDetailItem}>
                                <Text style={styles.detailLabel}>Start Price</Text>
                                <Text style={[styles.detailValue, { color: colors.text }]}>₹{data.startPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                            </View>
                            <FontAwesome name="long-arrow-right" size={12} color={colors.tabIconDefault} style={{ marginTop: 20 }} />
                            <View style={styles.summaryDetailItem}>
                                <Text style={styles.detailLabel}>End Price</Text>
                                <Text style={[styles.detailValue, { color: colors.text }]}>₹{data.endPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                            </View>
                        </View>
                    </View>
                );
            })}
        </ScrollView>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{
                title: 'Stock History',
                headerShown: true,
                headerRight: () => (
                    <TouchableOpacity onPress={() => setIsSelectionOpen(true)} style={{ marginRight: 15 }}>
                        <FontAwesome name="filter" size={20} color={colors.tint} />
                    </TouchableOpacity>
                )
            }} />

            <View style={[styles.viewTabs, { borderBottomColor: colors.border }]}>
                <TouchableOpacity
                    style={[styles.viewTab, viewMode === 'TABLE' && { borderBottomColor: colors.tint }]}
                    onPress={() => setViewMode('TABLE')}
                >
                    <Text style={[styles.viewTabText, { color: viewMode === 'TABLE' ? colors.tint : colors.tabIconDefault }]}>Table view</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.viewTab, viewMode === 'SUMMARY' && { borderBottomColor: colors.tint }]}
                    onPress={() => setViewMode('SUMMARY')}
                >
                    <Text style={[styles.viewTabText, { color: viewMode === 'SUMMARY' ? colors.tint : colors.tabIconDefault }]}>Performance</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.tint} />
                </View>
            ) : selectedStockIds.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <FontAwesome name="line-chart" size={64} color={colors.tabIconDefault} />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No Stocks Selected</Text>
                    <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
                        Select up to 5 stocks to compare their historical performance.
                    </Text>
                    <TouchableOpacity
                        style={[styles.primaryBtn, { backgroundColor: colors.tint }]}
                        onPress={() => setIsSelectionOpen(true)}
                    >
                        <Text style={styles.primaryBtnText}>Choose Stocks</Text>
                    </TouchableOpacity>
                </View>
            ) : viewMode === 'TABLE' ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={true} bounces={false}>
                    <FlatList
                        data={pivotData.rows}
                        renderItem={renderRow}
                        keyExtractor={item => item.date}
                        ListHeaderComponent={renderHeader}
                        stickyHeaderIndices={[0]}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={true}
                    />
                </ScrollView>
            ) : (
                renderSummary()
            )}

            {/* Selection Modal */}
            <Modal visible={isSelectionOpen} animationType="slide">
                <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setIsSelectionOpen(false)}>
                            <FontAwesome name="times" size={20} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Comparison Settings</Text>
                        <TouchableOpacity onPress={() => setIsSelectionOpen(false)}>
                            <Text style={{ color: colors.tint, fontWeight: 'bold' }}>Done</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalScroll}>
                        {/* Date Range Section */}
                        <View style={styles.modalSection}>
                            <Text style={[styles.modalLabel, { color: colors.tabIconDefault }]}>Comparison Period</Text>
                            <View style={styles.dateRow}>
                                <TouchableOpacity
                                    style={[styles.datePickerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                                    onPress={() => setShowStartPicker(true)}
                                >
                                    <View>
                                        <Text style={styles.datePickerLabel}>START DATE</Text>
                                        <Text style={[styles.datePickerVal, { color: colors.text }]}>{startDate.toLocaleDateString()}</Text>
                                    </View>
                                    <FontAwesome name="calendar" size={14} color={colors.tint} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.datePickerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                                    onPress={() => setShowEndPicker(true)}
                                >
                                    <View>
                                        <Text style={styles.datePickerLabel}>END DATE</Text>
                                        <Text style={[styles.datePickerVal, { color: colors.text }]}>{endDate.toLocaleDateString()}</Text>
                                    </View>
                                    <FontAwesome name="calendar" size={14} color={colors.tint} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {showStartPicker && (
                            <DateTimePicker
                                value={startDate}
                                mode="date"
                                display="default"
                                onChange={(e, d) => {
                                    setShowStartPicker(Platform.OS === 'ios');
                                    if (d) setStartDate(d);
                                }}
                                maximumDate={endDate}
                            />
                        )}
                        {showEndPicker && (
                            <DateTimePicker
                                value={endDate}
                                mode="date"
                                display="default"
                                onChange={(e, d) => {
                                    setShowEndPicker(Platform.OS === 'ios');
                                    if (d) setEndDate(d);
                                }}
                                minimumDate={startDate}
                                maximumDate={new Date()}
                            />
                        )}

                        {/* Search Section */}
                        <View style={styles.modalSection}>
                            <Text style={[styles.modalLabel, { color: colors.tabIconDefault }]}>Select Stocks ({selectedStockIds.length}/5)</Text>
                            <View style={[styles.searchBox, { backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#f3f4f6' }]}>
                                <FontAwesome name="search" size={16} color={colors.tabIconDefault} />
                                <TextInput
                                    style={[styles.searchInput, { color: colors.text }]}
                                    placeholder="Search symbol or name..."
                                    placeholderTextColor={colors.tabIconDefault}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                            </View>
                        </View>

                        {loadingStocks ? (
                            <ActivityIndicator style={{ marginTop: 20 }} color={colors.tint} />
                        ) : (
                            allStocks.map(item => {
                                const isSelected = selectedStockIds.includes(item.id);
                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[styles.stockItem, { borderBottomColor: colors.border }]}
                                        onPress={() => toggleStockSelection(item)}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.stockSymbol, { color: colors.text }]}>{item.symbol}</Text>
                                            <Text style={[styles.stockName, { color: colors.tabIconDefault }]} numberOfLines={1}>{item.name}</Text>
                                        </View>
                                        <FontAwesome
                                            name={isSelected ? "check-circle" : "circle-o"}
                                            size={24}
                                            color={isSelected ? colors.tint : colors.tabIconDefault}
                                        />
                                    </TouchableOpacity>
                                );
                            })
                        )}
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Tabs
    viewTabs: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1 },
    viewTab: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: 'transparent', marginRight: 12 },
    viewTabText: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },

    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    emptyTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 20 },
    emptyText: { textAlign: 'center', marginTop: 10, lineHeight: 20 },
    primaryBtn: { marginTop: 30, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 12 },
    primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

    // Table
    list: { paddingBottom: 20 },
    tableHeader: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1 },
    tableRow: { flexDirection: 'row', paddingVertical: 14, borderBottomWidth: 1 },
    dateCol: { width: 90, paddingLeft: 16 },
    stockCol: { width: 120, alignItems: 'center', paddingHorizontal: 8 },
    headerText: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
    dateText: { fontSize: 13, fontWeight: '600' },
    priceText: { fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: '500' },
    changeTextSmall: { fontSize: 10, fontWeight: 'bold', marginTop: 2 },

    // Summary
    summaryList: { padding: 16 },
    summaryTitle: { fontSize: 18, fontWeight: 'bold' },
    summaryDates: { fontSize: 12, marginBottom: 20, marginTop: 4 },
    summaryCard: { padding: 16, borderRadius: 16, borderWIdth: 1, marginBottom: 16, elevation: 1 },
    summaryCardMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    summarySymbol: { fontSize: 20, fontWeight: 'bold' },
    summaryBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
    summaryBadgeText: { fontSize: 14, fontWeight: 'bold' },
    summaryDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 16 },
    summaryDetailItem: { flex: 1 },
    detailLabel: { fontSize: 10, color: '#888', textTransform: 'uppercase', marginBottom: 4 },
    detailValue: { fontSize: 15, fontWeight: 'bold' },

    // Modal
    modalContainer: { flex: 1 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    modalScroll: { flex: 1 },
    modalSection: { padding: 16 },
    modalLabel: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 12 },
    dateRow: { flexDirection: 'row', gap: 12 },
    datePickerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, borderWidth: 1 },
    datePickerLabel: { fontSize: 9, color: '#888', fontWeight: '700' },
    datePickerVal: { fontSize: 13, fontWeight: 'bold', marginTop: 2 },
    searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 48, borderRadius: 24 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 15 },
    stockItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1 },
    stockSymbol: { fontSize: 16, fontWeight: 'bold' },
    stockName: { fontSize: 12, marginTop: 2 },
});
