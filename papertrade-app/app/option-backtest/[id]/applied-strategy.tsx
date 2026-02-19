
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { optionBacktestAPI, OptionBacktestRun } from '@/services/option-backtest';

export default function AppliedStrategyScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [run, setRun] = useState<OptionBacktestRun | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchDetail();
    }, [id]);

    const fetchDetail = async () => {
        try {
            const response = await optionBacktestAPI.get(id as string);
            const data = response.data?.data || response.data;
            setRun(data);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to fetch strategy details');
        } finally {
            setLoading(false);
        }
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
                <Text>Strategy details not found</Text>
            </View>
        );
    }

    const config = run.snapshot_config || {};
    const { legs = [], entry = {}, exit = {} } = config;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <FontAwesome name="arrow-left" size={20} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Applied Strategy</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.infoBox}>
                    <FontAwesome name="info-circle" size={16} color="#d97706" style={{ marginRight: 8 }} />
                    <Text style={styles.infoText}>
                        This view represents the exact configuration used for this backtest run.
                    </Text>
                </View>

                {/* Strategy Info */}
                <View style={styles.section}>
                    <Text style={styles.strategyName}>{run.snapshot_name || run.strategy_name}</Text>
                    <Text style={styles.runInfo}>#{run.run_id} • {new Date(run.created_at).toLocaleDateString()}</Text>
                </View>

                {/* Legs Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <FontAwesome name="bars" size={14} color="#333" />
                        <Text style={styles.sectionTitle}>Legs ({legs.length})</Text>
                    </View>

                    {legs.map((leg: any, index: number) => (
                        <View key={index} style={styles.card}>
                            <View style={styles.legHeader}>
                                <View style={styles.legBadges}>
                                    <View style={[styles.badge, leg.action === 'BUY' ? styles.bgGreen : styles.bgRed]}>
                                        <Text style={styles.badgeTextWhite}>{leg.action}</Text>
                                    </View>
                                    <View style={[styles.badge, leg.type === 'CE' ? styles.bgBlue : styles.bgPurple]}>
                                        <Text style={styles.badgeTextWhite}>{leg.type}</Text>
                                    </View>
                                    <Text style={styles.legStrike}>
                                        {leg.strikeSelection === 'ATM' ? 'ATM' :
                                            leg.strikeSelection === 'ATM_PLUS' ? `ATM + ${leg.strikeOffset}` :
                                                `ATM - ${leg.strikeOffset}`}
                                    </Text>
                                </View>
                                <View style={styles.slotBadge}>
                                    <Text style={styles.slotText}>x{leg.lotMultiplier || 1}</Text>
                                </View>
                            </View>

                            <View style={styles.grid}>
                                <View style={styles.gridItem}>
                                    <Text style={styles.label}>Selection</Text>
                                    <Text style={styles.value}>{leg.selectBy === 'PREMIUM' ? 'Target Premium' : 'Strike'}</Text>
                                </View>
                                {leg.selectBy === 'PREMIUM' && (
                                    <View style={styles.gridItem}>
                                        <Text style={styles.label}>Range</Text>
                                        <Text style={styles.value}>₹{leg.minPremium} - ₹{leg.maxPremium}</Text>
                                    </View>
                                )}
                                <View style={styles.gridItem}>
                                    <Text style={styles.label}>Rounding</Text>
                                    <Text style={styles.value}>{leg.strikeRounding || 'Nearest'}</Text>
                                </View>
                            </View>

                            {/* Leg Risk Management */}
                            {(leg.stopLoss?.enabled || leg.takeProfit?.enabled || leg.trailingStopLoss?.enabled) && (
                                <View style={styles.riskRow}>
                                    {leg.stopLoss?.enabled && (
                                        <View style={[styles.riskBadge, styles.bgRedLight]}>
                                            <Text style={styles.riskTextRed}>SL: {leg.stopLoss.value}{leg.stopLoss.type}</Text>
                                        </View>
                                    )}
                                    {leg.takeProfit?.enabled && (
                                        <View style={[styles.riskBadge, styles.bgGreenLight]}>
                                            <Text style={styles.riskTextGreen}>TP: {leg.takeProfit.value}{leg.takeProfit.type}</Text>
                                        </View>
                                    )}
                                    {leg.trailingStopLoss?.enabled && (
                                        <View style={[styles.riskBadge, styles.bgBlueLight]}>
                                            <Text style={styles.riskTextBlue}>TSL: {leg.trailingStopLoss.value}{leg.trailingStopLoss.type}</Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    ))}
                </View>

                {/* Entry Settings */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <FontAwesome name="sign-in" size={14} color="#333" />
                        <Text style={styles.sectionTitle}>Entry Criteria</Text>
                    </View>

                    <View style={styles.card}>
                        <View style={styles.row}>
                            <Text style={styles.label}>Pricing Mode</Text>
                            <Text style={styles.value}>{entry.mode || 'Daily'}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Time</Text>
                            <Text style={styles.value}>{entry.entryTime?.time || 'Market Open'}</Text>
                        </View>

                        {entry.waitAndTrade?.enabled && (
                            <View style={styles.waitTradeBox}>
                                <Text style={styles.waitTradeTitle}>Wait & Trade Active</Text>
                                <Text style={styles.waitTradeText}>
                                    Wait for {entry.waitAndTrade.value}% {entry.waitAndTrade.type?.toLowerCase()} from {entry.waitAndTrade.ref?.replace(/_/g, ' ')}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Exit Settings */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <FontAwesome name="sign-out" size={14} color="#333" />
                        <Text style={styles.sectionTitle}>Exit Criteria</Text>
                    </View>

                    <View style={styles.card}>
                        <View style={styles.row}>
                            <Text style={styles.label}>Primary Exit</Text>
                            <Text style={styles.value}>{exit.type?.replace(/_/g, ' ') || 'None'}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Exit Time</Text>
                            <Text style={styles.value}>{exit.exitTime?.time || 'Market Close'}</Text>
                        </View>

                        {/* Global Risk */}
                        {(exit.stopLoss?.enabled || exit.takeProfit?.enabled || exit.trailingStopLoss?.enabled) && (
                            <View style={styles.globalRisk}>
                                <Text style={styles.globalRiskTitle}>Global Risk Guards</Text>
                                {exit.stopLoss?.enabled && (
                                    <View style={styles.riskRowItem}>
                                        <Text style={styles.riskLabelRed}>TOTAL STOP LOSS</Text>
                                        <Text style={styles.riskValueRed}>{exit.stopLoss.value}{exit.stopLoss.type}</Text>
                                    </View>
                                )}
                                {exit.takeProfit?.enabled && (
                                    <View style={styles.riskRowItem}>
                                        <Text style={styles.riskLabelGreen}>TOTAL TAKE PROFIT</Text>
                                        <Text style={styles.riskValueGreen}>{exit.takeProfit.value}{exit.takeProfit.type}</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                </View>

            </ScrollView>
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
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#fffbeb',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#fcd34d',
    },
    infoText: {
        fontSize: 12,
        color: '#92400e',
        flex: 1,
    },
    section: {
        marginBottom: 24,
    },
    strategyName: {
        fontSize: 22,
        fontWeight: '800',
        color: '#111',
        marginBottom: 4,
    },
    runInfo: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#333',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        borderWidth: 1,
        borderColor: '#eee',
    },
    legHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    legBadges: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    bgGreen: { backgroundColor: '#22c55e' },
    bgRed: { backgroundColor: '#ef4444' },
    bgBlue: { backgroundColor: '#2563eb' },
    bgPurple: { backgroundColor: '#9333ea' },
    badgeTextWhite: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    legStrike: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    slotBadge: {
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    slotText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#666',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 12,
    },
    gridItem: {
        width: '30%',
    },
    label: {
        fontSize: 10,
        color: '#999',
        fontWeight: 'bold',
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    value: {
        fontSize: 12,
        fontWeight: '600',
        color: '#333',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    riskRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    riskBadge: {
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
    },
    bgRedLight: { backgroundColor: '#fef2f2', borderColor: '#fee2e2' },
    bgGreenLight: { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' },
    bgBlueLight: { backgroundColor: '#eff6ff', borderColor: '#dbeafe' },
    riskTextRed: { fontSize: 10, fontWeight: 'bold', color: '#dc2626' },
    riskTextGreen: { fontSize: 10, fontWeight: 'bold', color: '#16a34a' },
    riskTextBlue: { fontSize: 10, fontWeight: 'bold', color: '#2563eb' },

    waitTradeBox: {
        marginTop: 12,
        padding: 12,
        backgroundColor: '#eff6ff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#dbeafe',
    },
    waitTradeTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#2563eb',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    waitTradeText: {
        fontSize: 12,
        color: '#1e40af',
        fontWeight: '500',
    },
    globalRisk: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    globalRiskTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#ea580c', // orange-600
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    riskRowItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    riskLabelRed: { fontSize: 10, fontWeight: 'bold', color: '#dc2626' },
    riskValueRed: { fontSize: 12, fontWeight: 'bold', color: '#b91c1c' },
    riskLabelGreen: { fontSize: 10, fontWeight: 'bold', color: '#16a34a' },
    riskValueGreen: { fontSize: 12, fontWeight: 'bold', color: '#15803d' },
});
