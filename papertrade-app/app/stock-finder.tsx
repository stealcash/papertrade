import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Platform, FlatList } from 'react-native';
import { Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { strategiesAPI } from '@/services/strategies';
import { stocksAPI } from '@/services/stocks';
import { sectorsAPI } from '@/services/sectors';
import DateTimePicker from '@react-native-community/datetimepicker';
import PredictionModal from '@/components/PredictionModal';

interface Strategy {
    id: number;
    name: string;
    code: string;
    description: string;
    type: string;
}

interface Sector {
    id: number;
    name: string;
}

interface Category {
    id: number;
    name: string;
}

interface ScanSignal {
    stock_id: number;
    stock_symbol: string;
    stock_name: string;
    direction: 'UP' | 'DOWN';
    entry_price: number;
    expected_value: number;
    latest_price?: number;
    latest_date?: string;
}

interface HistoryItem {
    id: number;
    strategies: { id: number; name: string }[];
    filters: {
        date: string;
        direction: 'UP' | 'DOWN';
        sector_id?: string;
        category_id?: string;
    };
    results: ScanSignal[];
    created_at: string;
}

export default function StockFinderScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    // Metadata
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [history, setHistory] = useState<HistoryItem[]>([]);

    // Selection
    const [selectedStrategies, setSelectedStrategies] = useState<Strategy[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<number | ''>('');
    const [selectedSector, setSelectedSector] = useState<number | ''>('');
    const [signalDirection, setSignalDirection] = useState<'UP' | 'DOWN'>('UP');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Results
    const [results, setResults] = useState<ScanSignal[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [scanDateStr, setScanDateStr] = useState<string | null>(null);
    const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);

    // Prediction Modal
    const [predictionVisible, setPredictionVisible] = useState(false);
    const [selectedStock, setSelectedStock] = useState<any>(null);

    const fetchMetadata = async () => {
        setLoading(true);
        try {
            const [sysRes, userRes, catRes, sectorRes, histRes] = await Promise.all([
                strategiesAPI.getAll({ scope: 'system' }),
                strategiesAPI.getRuleBased(),
                stocksAPI.getCategories(),
                sectorsAPI.getAll(),
                strategiesAPI.getFinderHistory()
            ]);

            const sysStrats = (sysRes.data?.data || sysRes.data || []).map((s: any) => ({ ...s, type: 'SYSTEM' }));
            const userStrats = (userRes.data?.data || userRes.data || []).map((s: any) => ({ ...s, type: 'USER' }));
            setStrategies([...sysStrats, ...userStrats]);

            const catData = catRes.data?.data || catRes.data || [];
            setCategories(Array.isArray(catData) ? catData : (catData.results || []));

            const sectorData = sectorRes.data?.data || sectorRes.data || [];
            setSectors(Array.isArray(sectorData) ? sectorData : (sectorData.results || []));

            const histData = histRes.data?.data || histRes.data || [];
            setHistory(Array.isArray(histData) ? histData : (histData.results || []));

        } catch (error) {
            console.error("Failed to fetch metadata", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetadata();
    }, []);

    const toggleStrategy = (strategy: Strategy) => {
        if (selectedStrategies.find(s => s.id === strategy.id)) {
            setSelectedStrategies(prev => prev.filter(s => s.id !== strategy.id));
        } else {
            if (selectedStrategies.length >= 3) {
                Alert.alert("Limit Reached", "You can select up to 3 strategies only.");
                return;
            }
            setSelectedStrategies(prev => [...prev, strategy]);
        }
    };

    const handleScan = async () => {
        if (selectedStrategies.length === 0) {
            Alert.alert("Error", "Please select at least one strategy.");
            return;
        }

        setScanning(true);
        setResults(null);
        setSelectedHistoryId(null);
        try {
            const payload = {
                strategies: selectedStrategies.map(s => ({ id: s.id, type: s.type })),
                direction: signalDirection,
                date: selectedDate.toISOString().split('T')[0],
                category: selectedCategory || undefined,
                sector: selectedSector || undefined
            };
            const res = await strategiesAPI.findStocks(payload);
            const data = res.data?.data || res.data;
            setResults(data.results || []);
            setScanDateStr(data.date);
            setSelectedHistoryId(data.history_id);

            // Refresh history
            const histRes = await strategiesAPI.getFinderHistory();
            const histData = histRes.data?.data || histRes.data || [];
            setHistory(Array.isArray(histData) ? histData : (histData.results || []));

        } catch (error: any) {
            console.error(error);
            Alert.alert("Error", error.response?.data?.message || "Scan failed.");
        } finally {
            setScanning(false);
        }
    };

    const loadHistory = (item: HistoryItem) => {
        setResults(item.results);
        setScanDateStr(item.filters.date);
        setSignalDirection(item.filters.direction);
        setSelectedHistoryId(item.id);

        // Match strategies
        const activeStrats = strategies.filter(s => item.strategies.some(his => his.id === s.id));
        setSelectedStrategies(activeStrats);

        // Scroll to results potentially or just give feedback
        Alert.alert("Success", "Loaded scan results from history.");
    };

    const onDateChange = (event: any, date?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (date) setSelectedDate(date);
    };

    const renderHistoryItem = ({ item }: { item: HistoryItem }) => {
        const isActive = selectedHistoryId === item.id;
        const color = item.filters.direction === 'UP' ? '#10b981' : '#ef4444';

        return (
            <TouchableOpacity
                style={[styles.historyCard, { backgroundColor: colors.card, borderColor: isActive ? colors.tint : colors.border }]}
                onPress={() => loadHistory(item)}
            >
                <View style={styles.historyTop}>
                    <Text style={[styles.historyDate, { color: colors.tint }]}>{item.filters.date}</Text>
                    <View style={[styles.historyBadge, { backgroundColor: color + '20' }]}>
                        <Text style={[styles.historyBadgeText, { color }]}>{item.filters.direction}</Text>
                    </View>
                </View>
                <Text style={[styles.historyStrats, { color: colors.text }]} numberOfLines={1}>
                    {item.strategies.map(s => s.name).join(', ')}
                </Text>
                <Text style={[styles.historyCount, { color: colors.tabIconDefault }]}>{item.results.length} stocks</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{
                title: 'Stock Finder',
                headerShown: true,
                headerRight: () => (
                    <TouchableOpacity onPress={fetchMetadata} style={{ marginRight: 15 }}>
                        <FontAwesome name="refresh" size={18} color={colors.tint} />
                    </TouchableOpacity>
                )
            }} />

            <ScrollView style={styles.container}>
                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={colors.tint} />
                    </View>
                ) : (
                    <View style={styles.content}>
                        {/* History Horizontal List */}
                        {history.length > 0 && (
                            <View style={styles.historySection}>
                                <Text style={[styles.sectionTitleSmall, { color: colors.text }]}>Recent Scans</Text>
                                <FlatList
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    data={history}
                                    keyExtractor={(item) => item.id.toString()}
                                    renderItem={renderHistoryItem}
                                    contentContainerStyle={{ paddingBottom: 10 }}
                                />
                            </View>
                        )}

                        {/* Config Section */}
                        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Scan Configuration</Text>

                            <Text style={[styles.label, { color: colors.tabIconDefault }]}>Strategies ({selectedStrategies.length}/3)</Text>
                            <View style={styles.strategyGrid}>
                                {strategies.map(strat => {
                                    const isSelected = !!selectedStrategies.find(s => s.id === strat.id);
                                    return (
                                        <TouchableOpacity
                                            key={`${strat.type}-${strat.id}`}
                                            style={[
                                                styles.stratChip,
                                                isSelected && { backgroundColor: colors.tint, borderColor: colors.tint },
                                                { borderColor: colors.border }
                                            ]}
                                            onPress={() => toggleStrategy(strat)}
                                        >
                                            <Text style={[
                                                styles.stratChipText,
                                                { color: isSelected ? '#fff' : colors.text }
                                            ]} numberOfLines={1}>
                                                {strat.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <View style={styles.fieldRow}>
                                <View style={styles.field}>
                                    <Text style={[styles.label, { color: colors.tabIconDefault }]}>Signal Date</Text>
                                    <TouchableOpacity
                                        style={[styles.input, { borderColor: colors.border, backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f9fafb' }]}
                                        onPress={() => setShowDatePicker(true)}
                                    >
                                        <Text style={{ color: colors.text, fontSize: 13 }}>{selectedDate.toLocaleDateString()}</Text>
                                        <FontAwesome name="calendar" size={14} color={colors.tabIconDefault} />
                                    </TouchableOpacity>
                                    {showDatePicker && (
                                        <DateTimePicker
                                            value={selectedDate}
                                            mode="date"
                                            display="default"
                                            onChange={onDateChange}
                                            maximumDate={new Date()}
                                        />
                                    )}
                                </View>

                                <View style={styles.field}>
                                    <Text style={[styles.label, { color: colors.tabIconDefault }]}>Direction</Text>
                                    <View style={styles.directionToggle}>
                                        <TouchableOpacity
                                            style={[styles.dirBtn, signalDirection === 'UP' && styles.dirBtnUp]}
                                            onPress={() => setSignalDirection('UP')}
                                        >
                                            <FontAwesome name="arrow-up" size={12} color={signalDirection === 'UP' ? '#fff' : '#10b981'} />
                                            <Text style={[styles.dirText, { color: signalDirection === 'UP' ? '#fff' : '#10b981' }]}>BUY</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.dirBtn, signalDirection === 'DOWN' && styles.dirBtnDown]}
                                            onPress={() => setSignalDirection('DOWN')}
                                        >
                                            <FontAwesome name="arrow-down" size={12} color={signalDirection === 'DOWN' ? '#fff' : '#ef4444'} />
                                            <Text style={[styles.dirText, { color: signalDirection === 'DOWN' ? '#fff' : '#ef4444' }]}>SELL</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>

                            {/* Sector and Category Filters */}
                            <View style={styles.fieldRow}>
                                <View style={styles.field}>
                                    <Text style={[styles.label, { color: colors.tabIconDefault }]}>Sector</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                                        <TouchableOpacity
                                            style={[styles.filterChip, selectedSector === '' && styles.filterChipActive, { borderColor: colors.border }]}
                                            onPress={() => setSelectedSector('')}
                                        >
                                            <Text style={[styles.filterChipText, { color: selectedSector === '' ? '#fff' : colors.text }]}>All</Text>
                                        </TouchableOpacity>
                                        {sectors.map(s => (
                                            <TouchableOpacity
                                                key={s.id}
                                                style={[styles.filterChip, selectedSector === s.id && styles.filterChipActive, { borderColor: colors.border }]}
                                                onPress={() => setSelectedSector(s.id)}
                                            >
                                                <Text style={[styles.filterChipText, { color: selectedSector === s.id ? '#fff' : colors.text }]}>{s.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            </View>

                            <View style={[styles.fieldRow, { marginTop: -10 }]}>
                                <View style={styles.field}>
                                    <Text style={[styles.label, { color: colors.tabIconDefault }]}>Category</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                                        <TouchableOpacity
                                            style={[styles.filterChip, selectedCategory === '' && styles.filterChipActive, { borderColor: colors.border }]}
                                            onPress={() => setSelectedCategory('')}
                                        >
                                            <Text style={[styles.filterChipText, { color: selectedCategory === '' ? '#fff' : colors.text }]}>All</Text>
                                        </TouchableOpacity>
                                        {categories.map(c => (
                                            <TouchableOpacity
                                                key={c.id}
                                                style={[styles.filterChip, selectedCategory === c.id && styles.filterChipActive, { borderColor: colors.border }]}
                                                onPress={() => setSelectedCategory(c.id)}
                                            >
                                                <Text style={[styles.filterChipText, { color: selectedCategory === c.id ? '#fff' : colors.text }]}>{c.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.scanBtn, { backgroundColor: colors.tint }, scanning && styles.scanBtnDisabled]}
                                onPress={handleScan}
                                disabled={scanning}
                            >
                                {scanning ? <ActivityIndicator size="small" color="#fff" /> : <FontAwesome name="search" size={16} color="#fff" />}
                                <Text style={styles.scanBtnText}>{scanning ? 'Scanning...' : 'Find Stocks'}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Results Section */}
                        {results && (
                            <View style={styles.resultsContainer}>
                                <View style={styles.resultsHeader}>
                                    <Text style={[styles.resultsTitle, { color: colors.text }]}>Results Found ({results.length})</Text>
                                    {scanDateStr && <Text style={[styles.resultsDate, { color: colors.tabIconDefault }]}>Signal Date: {scanDateStr}</Text>}
                                </View>

                                {results.length === 0 ? (
                                    <View style={styles.emptyResults}>
                                        <Text style={{ color: colors.tabIconDefault }}>No matching stocks found for this criteria.</Text>
                                    </View>
                                ) : (
                                    results.map((sig, idx) => (
                                        <View key={idx} style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                            <View style={styles.resultMain}>
                                                <View>
                                                    <Text style={[styles.resultSymbol, { color: colors.text }]}>{sig.stock_symbol}</Text>
                                                    <Text style={[styles.resultName, { color: colors.tabIconDefault }]}>{sig.stock_name}</Text>
                                                </View>
                                                <View style={{ alignItems: 'flex-end' }}>
                                                    <View style={[styles.resultDirection, { backgroundColor: sig.direction === 'UP' ? '#dcfce7' : '#fee2e2' }]}>
                                                        <Text style={[styles.resultDirectionText, { color: sig.direction === 'UP' ? '#15803d' : '#b91c1c' }]}>{sig.direction}</Text>
                                                    </View>
                                                    <TouchableOpacity
                                                        style={styles.trackBtn}
                                                        onPress={() => {
                                                            setSelectedStock({ id: sig.stock_id, symbol: sig.stock_symbol, name: sig.stock_name });
                                                            setPredictionVisible(true);
                                                        }}
                                                    >
                                                        <FontAwesome name="bullseye" size={14} color={colors.tint} />
                                                        <Text style={[styles.trackBtnText, { color: colors.tint }]}>Track</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>

                                            <View style={[styles.resultDetails, { borderTopColor: colors.border }]}>
                                                <View style={styles.detailItem}>
                                                    <Text style={[styles.detailLabel, { color: colors.tabIconDefault }]}>Day 0 Price</Text>
                                                    <Text style={[styles.detailValue, { color: colors.text }]}>₹{parseFloat(sig.entry_price as any || 0).toFixed(2)}</Text>
                                                </View>
                                                <View style={styles.detailItem}>
                                                    <Text style={[styles.detailLabel, { color: colors.tabIconDefault }]}>Latest Price</Text>
                                                    <Text style={[styles.detailValue, { color: colors.text }]}>₹{parseFloat(sig.latest_price as any || 0).toFixed(2)}</Text>
                                                </View>
                                                <View style={styles.detailItem}>
                                                    <Text style={[styles.detailLabel, { color: colors.tabIconDefault }]}>Expected</Text>
                                                    <Text style={[styles.detailValue, { color: colors.tint, fontWeight: 'bold' }]}>₹{parseFloat(sig.expected_value as any || 0).toFixed(2)}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    ))
                                )}
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            <PredictionModal
                stock={selectedStock}
                visible={predictionVisible}
                onClose={() => setPredictionVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 16 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 },

    // History
    historySection: { marginBottom: 20 },
    sectionTitleSmall: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.5 },
    historyCard: { width: 160, padding: 12, borderRadius: 12, borderWidth: 1, marginRight: 12 },
    historyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    historyDate: { fontSize: 10, fontWeight: 'bold' },
    historyBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    historyBadgeText: { fontSize: 8, fontWeight: 'bold' },
    historyStrats: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
    historyCount: { fontSize: 9 },

    // Config
    card: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
    label: { fontSize: 11, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },

    strategyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    stratChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, maxWidth: 140 },
    stratChipText: { fontSize: 11, fontWeight: '600' },

    fieldRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    field: { flex: 1 },
    input: { height: 44, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

    directionToggle: { flexDirection: 'row', height: 44, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' },
    dirBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#fff' },
    dirBtnUp: { backgroundColor: '#10b981' },
    dirBtnDown: { backgroundColor: '#ef4444' },
    dirText: { fontSize: 11, fontWeight: 'bold' },

    filterScroll: { marginHorizontal: -4 },
    filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, marginRight: 8, marginVertical: 4 },
    filterChipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
    filterChipText: { fontSize: 11, fontWeight: '600' },

    scanBtn: { height: 50, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 },
    scanBtnDisabled: { opacity: 0.6 },
    scanBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

    // Results
    resultsContainer: { marginBottom: 30 },
    resultsHeader: { marginBottom: 12, paddingHorizontal: 4 },
    resultsTitle: { fontSize: 16, fontWeight: 'bold' },
    resultsDate: { fontSize: 12, marginTop: 4 },
    emptyResults: { padding: 40, alignItems: 'center' },

    resultCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12, elevation: 1 },
    resultMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    resultSymbol: { fontSize: 17, fontWeight: 'bold' },
    resultName: { fontSize: 11, marginTop: 2 },
    resultDirection: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 8 },
    resultDirectionText: { fontSize: 10, fontWeight: 'bold' },

    trackBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.2)' },
    trackBtnText: { fontSize: 11, fontWeight: 'bold' },

    resultDetails: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 12 },
    detailItem: { flex: 1 },
    detailLabel: { fontSize: 9, marginBottom: 2, textTransform: 'uppercase' },
    detailValue: { fontSize: 13, fontWeight: '600' }
});
