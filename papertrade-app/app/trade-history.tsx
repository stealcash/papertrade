import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, RefreshControl, SafeAreaView } from 'react-native';
import { Stack } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { portfolioAPI } from '@/services/portfolio';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Transaction {
    id: number;
    stock_symbol: string;
    type: 'BUY' | 'SELL';
    quantity: number;
    price: string | number;
    amount: string | number;
    created_at: string;
}

export default function TradeHistoryScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await portfolioAPI.getHistory();
            // Match web frontend unwrapping logic
            const list = res.data?.results || res.data?.data || res.data || [];
            setTransactions(Array.isArray(list) ? list : []);
        } catch (error) {
            console.error("Failed to fetch history", error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchHistory();
        }, [])
    );

    const renderItem = ({ item }: { item: Transaction }) => {
        const isBuy = item.type === 'BUY';
        return (
            <View style={[styles.item, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <View style={styles.itemHeader}>
                    <View style={styles.stockInfo}>
                        <Text style={[styles.symbol, { color: colors.text }]}>{item.stock_symbol}</Text>
                        <View style={[
                            styles.typeBadge,
                            { backgroundColor: isBuy ? '#10b98120' : '#ef444420' }
                        ]}>
                            <Text style={[
                                styles.typeText,
                                { color: isBuy ? '#10b981' : '#ef4444' }
                            ]}>
                                {item.type}
                            </Text>
                        </View>
                    </View>
                    <Text style={[styles.amount, { color: colors.text }]}>
                        ₹{Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </Text>
                </View>

                <View style={styles.itemDetails}>
                    <View style={styles.detailCol}>
                        <Text style={styles.detailLabel}>Quantity</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{item.quantity}</Text>
                    </View>
                    <View style={styles.detailCol}>
                        <Text style={styles.detailLabel}>Price</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                            ₹{Number(item.price || 0).toFixed(2)}
                        </Text>
                    </View>
                    <View style={[styles.detailCol, { alignItems: 'flex-end' }]}>
                        <Text style={styles.detailLabel}>Date</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                            {new Date(item.created_at).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short'
                            })}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ title: 'Trade History', headerShown: true }} />

            <FlatList
                data={transactions}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={fetchHistory} tintColor={colors.tint} />
                }
                ListEmptyComponent={!loading ? (
                    <View style={styles.emptyState}>
                        <FontAwesome name="history" size={48} color={colors.tabIconDefault} />
                        <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
                            No trade history found.
                        </Text>
                    </View>
                ) : null}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    list: {
        padding: 16,
    },
    item: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'transparent', // Will use colors.border if needed
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    stockInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    symbol: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    typeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    amount: {
        fontSize: 16,
        fontWeight: '600',
    },
    itemDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 12,
    },
    detailCol: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 11,
        color: '#999',
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '500',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 12,
    },
});
