import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { strategiesAPI } from '@/services/strategies';

interface Strategy {
    id: number;
    name: string;
    code: string;
    description: string;
    type: string;
}

interface ScanSignal {
    stock_symbol: string;
    stock_name: string;
    direction: 'UP' | 'DOWN';
    entry_price: number;
    expected_value: number;
}

interface ScanResult {
    date: string | null;
    signals: ScanSignal[];
    count: number;
    message?: string;
}

export default function ScannerScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStrategies = async () => {
        try {
            const res = await strategiesAPI.getAll({ scope: 'system' });
            const data = res.data?.data || res.data || [];
            const results = Array.isArray(data) ? data : (data.results || []);
            setStrategies(results);
            if (results.length > 0 && !selectedStrategy) {
                handleSelectStrategy(results[0]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleSelectStrategy = async (strategy: Strategy) => {
        setSelectedStrategy(strategy);
        setScanning(true);
        try {
            const res = await strategiesAPI.getScanResults(strategy.id);
            const data = res.data?.data || res.data;
            setScanResult(data);
        } catch (error) {
            console.error(error);
        } finally {
            setScanning(false);
        }
    };

    useEffect(() => {
        fetchStrategies();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchStrategies();
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ title: 'Market Scanner', headerShown: true }} />

            <ScrollView
                style={styles.container}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color="#3b82f6" />
                    </View>
                ) : (
                    <View style={styles.content}>
                        {/* Strategy Selector */}
                        <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#fff', borderColor: colors.border }]}>
                            <Text style={[styles.label, { color: colors.tabIconDefault }]}>Select Strategy</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strategyScroll}>
                                {strategies.map((strat) => (
                                    <TouchableOpacity
                                        key={strat.id}
                                        style={[
                                            styles.strategyButton,
                                            selectedStrategy?.id === strat.id && styles.strategyButtonActive,
                                            { borderColor: colors.border }
                                        ]}
                                        onPress={() => handleSelectStrategy(strat)}
                                    >
                                        <Text style={[
                                            styles.strategyText,
                                            { color: selectedStrategy?.id === strat.id ? '#fff' : colors.text }
                                        ]}>
                                            {strat.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {selectedStrategy && (
                                <View style={[styles.descriptionBox, { backgroundColor: colorScheme === 'dark' ? '#111827' : '#f9fafb' }]}>
                                    <Text style={[styles.description, { color: colors.tabIconDefault }]}>
                                        {selectedStrategy.description}
                                    </Text>
                                    <View style={styles.tagRow}>
                                        <Text style={styles.tag}>{selectedStrategy.type}</Text>
                                        <Text style={styles.tag}>{selectedStrategy.code}</Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Scan Results */}
                        <View style={styles.resultsHeader}>
                            <Text style={[styles.resultsTitle, { color: colors.text }]}>Scan Results</Text>
                            {scanResult?.date && (
                                <Text style={[styles.resultsDate, { color: colors.tabIconDefault }]}>
                                    {scanResult.date}
                                </Text>
                            )}
                        </View>

                        {scanning ? (
                            <View style={styles.centerContainer}>
                                <ActivityIndicator size="small" color="#3b82f6" />
                                <Text style={[styles.scanningText, { color: colors.tabIconDefault }]}>Scanning for signals...</Text>
                            </View>
                        ) : !scanResult || scanResult.signals.length === 0 ? (
                            <View style={[styles.emptyCard, { borderColor: colors.border }]}>
                                <FontAwesome name="info-circle" size={40} color={colors.tabIconDefault} />
                                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Signals Found</Text>
                                <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
                                    {scanResult?.message || "No signals generated for the latest trading session."}
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.signalList}>
                                {scanResult.signals.map((sig, idx) => (
                                    <View key={idx} style={[styles.signalCard, { backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#fff', borderColor: colors.border }]}>
                                        <View style={styles.signalMain}>
                                            <View>
                                                <Text style={[styles.signalSymbol, { color: colors.text }]}>{sig.stock_symbol}</Text>
                                                <Text style={[styles.signalName, { color: colors.tabIconDefault }]} numberOfLines={1}>{sig.stock_name}</Text>
                                            </View>
                                            <View style={[
                                                styles.directionBadge,
                                                { backgroundColor: sig.direction === 'UP' ? '#dcfce7' : '#fee2e2' }
                                            ]}>
                                                <FontAwesome
                                                    name={sig.direction === 'UP' ? "arrow-up" : "arrow-down"}
                                                    size={12}
                                                    color={sig.direction === 'UP' ? '#15803d' : '#b91c1c'}
                                                />
                                                <Text style={[
                                                    styles.directionText,
                                                    { color: sig.direction === 'UP' ? '#15803d' : '#b91c1c' }
                                                ]}>
                                                    {sig.direction}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.signalPrices}>
                                            <View style={styles.priceRow}>
                                                <Text style={[styles.priceLabel, { color: colors.tabIconDefault }]}>Reference Price</Text>
                                                <Text style={[styles.priceValue, { color: colors.text }]}>₹{parseFloat(sig.entry_price as any || 0).toFixed(2)}</Text>
                                            </View>
                                            <View style={styles.priceRow}>
                                                <Text style={[styles.priceLabel, { color: colors.tabIconDefault }]}>Expected Price</Text>
                                                <Text style={[styles.priceValue, styles.expectedValue, { color: colors.text }]}>₹{parseFloat(sig.expected_value as any || 0).toFixed(2)}</Text>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 16,
    },
    card: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 24,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    strategyScroll: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    strategyButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 8,
    },
    strategyButtonActive: {
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6',
    },
    strategyText: {
        fontSize: 14,
        fontWeight: '600',
    },
    descriptionBox: {
        padding: 12,
        borderRadius: 8,
    },
    description: {
        fontSize: 13,
        lineHeight: 18,
    },
    tagRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
    },
    tag: {
        fontSize: 10,
        fontWeight: 'bold',
        backgroundColor: '#e5e7eb',
        color: '#4b5563',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    resultsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    resultsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    resultsDate: {
        fontSize: 12,
    },
    centerContainer: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    scanningText: {
        marginTop: 12,
        fontSize: 14,
    },
    emptyCard: {
        alignItems: 'center',
        padding: 40,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 16,
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
    },
    signalList: {
        gap: 12,
    },
    signalCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    signalMain: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    signalSymbol: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    signalName: {
        fontSize: 12,
        marginTop: 2,
        maxWidth: 200,
    },
    directionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    directionText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    signalPrices: {
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        paddingTop: 12,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    priceLabel: {
        fontSize: 12,
    },
    priceValue: {
        fontSize: 12,
        fontWeight: '600',
    },
    expectedValue: {
        fontSize: 14,
        color: '#000',
    }
});
