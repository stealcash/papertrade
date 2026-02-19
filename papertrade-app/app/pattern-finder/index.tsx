
import React, { useState, useEffect } from 'react';
import {
    StyleSheet, View, Text, ScrollView, TouchableOpacity,
    ActivityIndicator, TextInput, Modal, FlatList, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { patternAPI, PatternFinderResult, PatternMatch } from '@/services/pattern';
import { stocksAPI } from '@/services/stocks';
import PatternChart from '@/components/PatternChart';

export default function PatternFinderScreen() {
    const router = useRouter();
    const [symbol, setSymbol] = useState('NIFTY');
    const [tolerance, setTolerance] = useState(0.5); // 0.2 - 0.5
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<PatternFinderResult | null>(null);
    const [stocks, setStocks] = useState<any[]>([]);
    const [showStockModal, setShowStockModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadStocks();
    }, []);

    const loadStocks = async () => {
        try {
            const res = await stocksAPI.getAll();
            setStocks(res.data || []);
        } catch (e) {
            console.log("Failed to load stocks", e);
        }
    };

    const handleFind = async () => {
        if (!symbol) return Alert.alert("Error", "Please select a stock");

        setLoading(true);
        setResult(null);
        try {
            const res = await patternAPI.find(symbol, tolerance);
            if (res.data.error) {
                Alert.alert("Error", res.data.error);
            } else {
                setResult(res.data);
            }
        } catch (e) {
            Alert.alert("Error", "Failed to analyze pattern. Ensure backend is running.");
        } finally {
            setLoading(false);
        }
    };

    const filteredStocks = stocks.filter(s =>
        s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderPatternItem = ({ item }: { item: PatternMatch }) => {
        // Prepare chart data: 7 days pattern + 3 days projection
        const chartData = [
            ...item.pattern_data,
            ...item.projection_data.map(d => d.change_pct)
        ];

        const next3Return = item.projection_data.reduce((sum, d) => sum + d.change_pct, 0);

        return (
            <View style={styles.matchCard}>
                <View style={styles.matchHeader}>
                    <Text style={styles.matchDate}>{item.date}</Text>
                    <View style={[styles.badge, next3Return >= 0 ? styles.bgGreen : styles.bgRed]}>
                        <Text style={styles.badgeText}>3D: {next3Return > 0 ? '+' : ''}{next3Return.toFixed(2)}%</Text>
                    </View>
                </View>

                <View style={styles.chartContainer}>
                    <PatternChart data={chartData} highlightLast={3} height={60} />
                </View>

                <View style={styles.matchFooter}>
                    <Text style={styles.matchSub}>Pattern Start: {item.start_date}</Text>
                    <Text style={styles.matchSub}>
                        Close: {item.projection_data[0]?.close?.toFixed(2) || '-'}
                        {' → '}
                        {item.projection_data[2]?.close?.toFixed(2) || '-'}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <FontAwesome name="arrow-left" size={20} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Pattern Finder</Text>
                <View style={{ width: 32 }} />
            </View>

            <View style={styles.content}>
                {/* Controls */}
                <View style={styles.controlsCard}>
                    <View style={styles.controlRow}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Stock</Text>
                            <TouchableOpacity style={styles.stockSelector} onPress={() => setShowStockModal(true)}>
                                <Text style={styles.stockText}>{symbol}</Text>
                                <FontAwesome name="chevron-down" size={12} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.inputGroup, { flex: 1, marginLeft: 16 }]}>
                            <Text style={styles.label}>Tolerance ({tolerance}%)</Text>
                            <View style={styles.toleranceRow}>
                                <TouchableOpacity onPress={() => setTolerance(Math.max(0.2, Number((tolerance - 0.1).toFixed(1))))} style={styles.tolBtn}>
                                    <FontAwesome name="minus" size={12} color="#444" />
                                </TouchableOpacity>
                                <Text style={styles.tolValue}>{tolerance}</Text>
                                <TouchableOpacity onPress={() => setTolerance(Math.min(0.5, Number((tolerance + 0.1).toFixed(1))))} style={styles.tolBtn}>
                                    <FontAwesome name="plus" size={12} color="#444" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.findBtn, loading && styles.disabledBtn]}
                        onPress={handleFind}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.findBtnText}>Find Patterns</Text>}
                    </TouchableOpacity>
                </View>

                {/* Results */}
                {result && (
                    <View style={{ flex: 1 }}>
                        <View style={styles.summaryCard}>
                            <View>
                                <Text style={styles.summaryTitle}>Current Pattern (Last 7 Days)</Text>
                                <Text style={styles.summarySub}>Target to match</Text>
                            </View>
                            <View style={{ height: 40, width: 100 }}>
                                <PatternChart
                                    data={result.target_pattern.map(d => d.change_pct)}
                                    height={40}
                                    barWidth={4}
                                    gap={2}
                                />
                            </View>
                        </View>

                        <View style={styles.statsRow}>
                            <Text style={styles.statsText}>Found {result.count} similiar patterns</Text>
                            <Text style={styles.statsText}>
                                Avg 3D Return: <Text style={{ fontWeight: 'bold', color: result.avg_3d_return >= 0 ? 'green' : 'red' }}>
                                    {result.avg_3d_return > 0 ? '+' : ''}{result.avg_3d_return.toFixed(2)}%
                                </Text>
                            </Text>
                        </View>

                        <FlatList
                            data={result.matches}
                            renderItem={renderPatternItem}
                            keyExtractor={(item) => item.date}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>
                )}
            </View>

            {/* Stock Selector Modal */}
            <Modal visible={showStockModal} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Stock</Text>
                        <TouchableOpacity onPress={() => setShowStockModal(false)}>
                            <Text style={styles.closeText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search stock..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    <FlatList
                        data={filteredStocks}
                        keyExtractor={item => item.symbol}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.stockItem}
                                onPress={() => {
                                    setSymbol(item.symbol);
                                    setShowStockModal(false);
                                }}
                            >
                                <Text style={styles.stockSymbol}>{item.symbol}</Text>
                                <Text style={styles.stockName}>{item.name}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backBtn: { padding: 8 },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    controlsCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    controlRow: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    inputGroup: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        color: '#666',
        marginBottom: 6,
        fontWeight: '600',
    },
    stockSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        padding: 10,
        backgroundColor: '#f9fafb',
    },
    stockText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    toleranceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        width: 120, // ensure width
    },
    tolBtn: {
        padding: 10,
        backgroundColor: '#e5e7eb',
        width: 36,
        alignItems: 'center',
    },
    tolValue: {
        flex: 1,
        textAlign: 'center',
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    findBtn: {
        backgroundColor: '#0a7ea4',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    disabledBtn: {
        backgroundColor: '#93c5d6',
    },
    findBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    summaryCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    summaryTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
    summarySub: { fontSize: 12, color: '#666' },

    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    statsText: { fontSize: 12, fontWeight: '600', color: '#64748b' },

    listContent: {
        paddingBottom: 20,
    },
    matchCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
        elevation: 1,
    },
    matchHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    matchDate: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    bgGreen: { backgroundColor: '#dcfce7' },
    bgRed: { backgroundColor: '#fee2e2' },
    badgeText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#333',
    },
    chartContainer: {
        marginBottom: 8,
        marginTop: 4,
    },
    matchFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        paddingTop: 8,
    },
    matchSub: {
        fontSize: 10,
        color: '#94a3b8',
    },

    // Modal
    modalContainer: { flex: 1, backgroundColor: '#fff', padding: 16 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    closeText: { color: '#007AFF', fontSize: 16 },
    searchInput: {
        backgroundColor: '#f1f5f9',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        fontSize: 16,
    },
    stockItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    stockSymbol: { fontWeight: 'bold', fontSize: 16, color: '#333' },
    stockName: { color: '#666', fontSize: 14 },
});
