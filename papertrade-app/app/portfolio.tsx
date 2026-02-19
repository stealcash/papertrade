import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Text, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { portfolioApi, PortfolioItem } from '@/services/portfolio';
import { FontAwesome } from '@expo/vector-icons';

export default function PortfolioScreen() {
    const router = useRouter();
    const [holdings, setHoldings] = useState<PortfolioItem[]>([]);
    const [summary, setSummary] = useState<any>({});
    const [loading, setLoading] = useState(false);

    // Trade Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedHolding, setSelectedHolding] = useState<PortfolioItem | null>(null);
    const [quantity, setQuantity] = useState('');
    const [tradeLoading, setTradeLoading] = useState(false);

    const fetchPortfolio = async () => {
        setLoading(true);
        try {
            console.log('Fetching Portfolio...');
            const response = await portfolioApi.getHoldings();
            console.log('Portfolio response status:', response.status);
            const body = response.data || {};

            // Handle nested data structures if compatible with Dashboard logic changes
            const holdingsData = body.data?.holdings || body.holdings || [];
            const summaryData = body.data?.summary || body.summary || {};

            setHoldings(holdingsData);
            setSummary(summaryData);
            console.log('Portfolio fetched successfully, count:', holdingsData.length);
        } catch (e: any) {
            console.error('Error fetching portfolio:', e.message);
            // Graceful degradation: showing empty state is better than crashing or infinite loading
            setHoldings([]);
            setSummary({});
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchPortfolio();
        }, [])
    );

    const initiateSell = (item: PortfolioItem) => {
        setSelectedHolding(item);
        setQuantity(item.quantity.toString());
        setModalVisible(true);
    };

    const handleSell = async () => {
        if (!selectedHolding || !quantity) return;

        const qty = parseInt(quantity);
        if (isNaN(qty) || qty <= 0 || qty > selectedHolding.quantity) {
            Alert.alert("Invalid Quantity", "Please enter a valid quantity to sell.");
            return;
        }

        setTradeLoading(true);
        try {
            // Assuming portfolioApi.trade method exists (added in previous step)
            await portfolioApi.trade({
                stock_id: selectedHolding.stock_details.id || selectedHolding.stock,
                // Note: Backend expects 'stock_id'. Holding object has 'stock' as ID usually, or stock_details.id
                // Let's check model: Portfolio.stock is ForeignKey.
                // Serializer: stock = PrimaryKeyRelatedField (ID), stock_details = Nested
                // So payload should use stock_details.id or item.stock if it's the ID.
                // Based on Web Dashboard: stock_id: selectedStock.stock
                quantity: qty,
                action: 'SELL'
            });

            Alert.alert("Success", "Order executed successfully!");
            setModalVisible(false);
            fetchPortfolio(); // Refresh
        } catch (error: any) {
            const msg = error.response?.data?.message || "Trade failed";
            Alert.alert("Error", msg);
        } finally {
            setTradeLoading(false);
        }
    };

    const renderHoldingItem = ({ item }: { item: PortfolioItem }) => {
        const isProfit = item.pnl >= 0;

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.symbol}>{item.stock_details.symbol}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={styles.quantityBadge}>
                            <Text style={styles.quantityText}>{item.quantity} Qty</Text>
                        </View>
                        <TouchableOpacity style={styles.sellButton} onPress={() => initiateSell(item)}>
                            <Text style={styles.sellButtonText}>Exit</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.row}>
                    <View>
                        <Text style={styles.label}>Invested</Text>
                        <Text style={styles.value}>₹{parseFloat(item.invested_value as any || 0).toFixed(2)}</Text>
                    </View>
                    <View>
                        <Text style={styles.label}>Avg Price</Text>
                        <Text style={styles.value}>₹{parseFloat(item.average_buy_price as any || 0).toFixed(2)}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.row}>
                    <View>
                        <Text style={styles.label}>Current</Text>
                        <Text style={styles.value}>₹{parseFloat(item.current_value as any || 0).toFixed(2)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.label}>P&L</Text>
                        <Text style={[styles.pnlValue, isProfit ? styles.green : styles.red]}>
                            {isProfit ? '+' : ''}{parseFloat(item.pnl as any || 0).toFixed(2)}
                            ({parseFloat(item.pnl_percentage as any || 0).toFixed(2)}%)
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Portfolio</Text>
            </View>

            {/* Trade History Link */}
            <TouchableOpacity
                style={styles.historyLink}
                onPress={() => router.push('/trade-history')}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <FontAwesome name="history" size={16} color="#0a7ea4" />
                    <Text style={styles.historyLinkText}>View Trade History</Text>
                </View>
                <FontAwesome name="chevron-right" size={14} color="#999" />
            </TouchableOpacity>

            <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                    <View>
                        <Text style={styles.summaryLabel}>Total Invested</Text>
                        <Text style={styles.summaryValue}>₹{(Number(summary.total_invested) || 0).toFixed(2)}</Text>
                    </View>
                </View>
            </View>

            {loading && <ActivityIndicator style={{ marginTop: 20 }} color="#0a7ea4" />}

            {!loading && holdings.length === 0 ? (
                <View style={styles.emptyState}>
                    <FontAwesome name="briefcase" size={48} color="#ddd" />
                    <Text style={styles.emptyText}>No positions found</Text>
                </View>
            ) : (
                <FlatList
                    data={holdings}
                    renderItem={renderHoldingItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchPortfolio} />}
                />
            )}

            {/* Sell Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Sell {selectedHolding?.stock_details.symbol}</Text>

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Available Qty:</Text>
                            <Text style={styles.infoValue}>{selectedHolding?.quantity}</Text>
                        </View>

                        <Text style={styles.inputLabel}>Quantity to Sell</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={quantity}
                            onChangeText={setQuantity}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={handleSell}
                                disabled={tradeLoading}
                            >
                                {tradeLoading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.confirmButtonText}>Confirm Sell</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        padding: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingTop: 50,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    summaryCard: {
        backgroundColor: '#0a7ea4',
        padding: 20,
        margin: 15,
        borderRadius: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 5 },
    summaryValue: { color: '#fff', fontSize: 24, fontWeight: 'bold' },

    list: { padding: 15 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    symbol: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    quantityBadge: { backgroundColor: '#eef2ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
    quantityText: { color: '#4f46e5', fontSize: 12, fontWeight: '600' },

    sellButton: {
        backgroundColor: '#ffebee',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#ffcdd2',
    },
    sellButtonText: { color: '#c62828', fontSize: 12, fontWeight: '600' },

    row: { flexDirection: 'row', justifyContent: 'space-between' },
    label: { fontSize: 11, color: '#888', marginBottom: 2 },
    value: { fontSize: 14, fontWeight: '500', color: '#333' },

    divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 12 },

    pnlValue: { fontSize: 14, fontWeight: 'bold' },
    green: { color: '#28a745' },
    red: { color: '#dc3545' },

    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyText: { color: '#999', marginTop: 10 },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, padding: 10, backgroundColor: '#f9f9f9', borderRadius: 8 },
    infoLabel: { color: '#666' },
    infoValue: { fontWeight: 'bold' },

    inputLabel: { fontSize: 12, color: '#666', marginBottom: 5 },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 16, marginBottom: 20 },

    modalButtons: { flexDirection: 'row', gap: 10 },
    modalButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
    cancelButton: { backgroundColor: '#f5f5f5' },
    confirmButton: { backgroundColor: '#dc3545' },

    cancelButtonText: { color: '#333', fontWeight: '600' },
    confirmButtonText: { color: '#fff', fontWeight: 'bold' },

    // Trade History Link
    historyLink: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    historyLinkText: { fontSize: 15, fontWeight: '600', color: '#0a7ea4' },
});
