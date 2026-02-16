import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Text, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { portfolioApi, PortfolioItem } from '@/services/portfolio';
import { FontAwesome } from '@expo/vector-icons';

// Component for History List
const HistoryList = () => {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await portfolioApi.getHistory();
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

    const renderItem = ({ item }: { item: any }) => {
        const isBuy = item.type === 'BUY';
        return (
            <View style={styles.historyCard}>
                <View style={styles.row}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.symbol}>{item.stock_symbol}</Text>
                        <View style={[styles.badge, { backgroundColor: isBuy ? '#dcfce7' : '#fee2e2' }]}>
                            <Text style={[styles.badgeText, { color: isBuy ? '#16a34a' : '#dc2626' }]}>{item.type}</Text>
                        </View>
                    </View>
                    <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
                </View>
                <View style={[styles.row, { marginTop: 8 }]}>
                    <Text style={styles.historyDetail}>{item.quantity} @ ₹{Number(item.price).toFixed(2)}</Text>
                    <Text style={styles.historyAmount}>₹{Number(item.amount).toLocaleString()}</Text>
                </View>
            </View>
        );
    };

    if (loading) return <ActivityIndicator style={{ marginTop: 20 }} color="#0a7ea4" />;

    return (
        <FlatList
            data={transactions}
            renderItem={renderItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchHistory} />}
            ListEmptyComponent={
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No trade history found</Text>
                </View>
            }
        />
    );
};

export default function PortfolioScreen() {
    const [activeTab, setActiveTab] = useState<'holdings' | 'history'>('holdings');
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
            if (activeTab === 'holdings') {
                fetchPortfolio();
            }
        }, [activeTab])
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

            {/* Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'holdings' && styles.activeTab]}
                    onPress={() => setActiveTab('holdings')}
                >
                    <Text style={[styles.tabText, activeTab === 'holdings' && styles.activeTabText]}>Holdings</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'history' && styles.activeTab]}
                    onPress={() => setActiveTab('history')}
                >
                    <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>History</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'holdings' ? (
                <>
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
                </>
            ) : (
                <HistoryList />
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

    // Tabs
    tabContainer: { flexDirection: 'row', backgroundColor: '#fff', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
    tab: { flex: 1, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: '#0a7ea4' },
    tabText: { fontSize: 16, fontWeight: '500', color: '#666' },
    activeTabText: { color: '#0a7ea4', fontWeight: 'bold' },

    // History Card
    historyCard: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    badgeText: { fontSize: 10, fontWeight: 'bold' },
    date: { fontSize: 12, color: '#999' },
    historyDetail: { color: '#444', fontSize: 14 },
    historyAmount: { fontSize: 14, fontWeight: 'bold', color: '#1f2937' }
});
