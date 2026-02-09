import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { stocksAPI } from '@/services/stocks';
import { watchlistAPI } from '@/services/watchlist';
import { portfolioAPI } from '@/services/portfolio';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/Colors';
import PredictionModal from '@/components/PredictionModal';

export default function StockDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [stock, setStock] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isInWatchlist, setIsInWatchlist] = useState(false);
    const [watchlistId, setWatchlistId] = useState<number | null>(null);

    // Trade Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [quantity, setQuantity] = useState('1');
    const [tradeLoading, setTradeLoading] = useState(false);

    // Prediction Modal
    const [predictionVisible, setPredictionVisible] = useState(false);

    useEffect(() => {
        fetchDetails();
        checkWatchlist();
    }, [id]);

    const fetchDetails = async () => {
        try {
            const res = await stocksAPI.getById(Number(id));
            setStock(res.data?.data || res.data);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to load stock details");
        } finally {
            setLoading(false);
        }
    };

    const checkWatchlist = async () => {
        try {
            const res = await watchlistAPI.getAll();
            const data = res.data?.data || res.data || [];
            const items = data.stocks || (Array.isArray(data) ? data : []);
            const found = items.find((i: any) => i.stock_details.id === Number(id));
            if (found) {
                setIsInWatchlist(true);
                setWatchlistId(found.id);
            } else {
                setIsInWatchlist(false);
                setWatchlistId(null);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const toggleWatchlist = async () => {
        try {
            if (isInWatchlist && watchlistId) {
                await watchlistAPI.remove(watchlistId);
                setIsInWatchlist(false);
                setWatchlistId(null);
            } else {
                const res = await watchlistAPI.add(Number(id));
                setIsInWatchlist(true);
                // Assuming res returns the created item or we re-fetch
                checkWatchlist();
            }
        } catch (e) {
            Alert.alert("Error", "Failed to update watchlist");
        }
    };

    const handleBuy = async () => {
        const qty = parseInt(quantity);
        if (isNaN(qty) || qty <= 0) {
            Alert.alert("Invalid Quantity", "Please enter a valid quantity.");
            return;
        }

        setTradeLoading(true);
        try {
            await portfolioAPI.trade({
                stock_id: Number(id),
                quantity: qty,
                action: 'BUY'
            });
            Alert.alert("Success", "Buy order executed!", [
                { text: "OK", onPress: () => setModalVisible(false) }
            ]);
            fetchDetails(); // Refresh params if needed
        } catch (error: any) {
            const msg = error.response?.data?.message || "Trade failed";
            Alert.alert("Error", msg);
        } finally {
            setTradeLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={colors.tint} />
            </View>
        );
    }

    if (!stock) {
        return (
            <View style={[styles.container, styles.center]}>
                <Text>Stock not found</Text>
            </View>
        );
    }

    const isPositive = (stock.price_change || 0) >= 0;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ title: stock.symbol, headerShown: true }} />

            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.topRow}>
                        <View>
                            <Text style={[styles.symbol, { color: colors.text }]}>{stock.symbol}</Text>
                            <Text style={[styles.name, { color: colors.tabIconDefault }]}>{stock.name}</Text>
                        </View>
                        <TouchableOpacity onPress={toggleWatchlist}>
                            <FontAwesome
                                name={isInWatchlist ? "star" : "star-o"}
                                size={24}
                                color={isInWatchlist ? "#f59e0b" : colors.tabIconDefault}
                            />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.priceRow}>
                        <Text style={[styles.price, { color: colors.text }]}>₹{stock.last_price}</Text>
                        <View style={[styles.badge, { backgroundColor: isPositive ? '#dcfce7' : '#fee2e2' }]}>
                            <FontAwesome name={isPositive ? "caret-up" : "caret-down"} size={14} color={isPositive ? "#15803d" : "#b91c1c"} />
                            <Text style={[styles.changeText, { color: isPositive ? "#15803d" : "#b91c1c" }]}>
                                {Math.abs(stock.price_change || 0).toFixed(2)}%
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsContainer}>
                    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={styles.statLabel}>Open</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>₹{stock.open || '--'}</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={styles.statLabel}>High</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>₹{stock.high || '--'}</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={styles.statLabel}>Low</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>₹{stock.low || '--'}</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={styles.statLabel}>Close</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>₹{stock.close || '--'}</Text>
                    </View>
                </View>

                <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
                    <Text style={[styles.description, { color: colors.tabIconDefault }]}>
                        {stock.description || 'No description available for this stock.'}
                    </Text>
                </View>

            </ScrollView>

            <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                <TouchableOpacity
                    style={[styles.predictButton, { borderColor: colors.tint }]}
                    onPress={() => setPredictionVisible(true)}
                >
                    <FontAwesome name="bullseye" size={18} color={colors.tint} />
                    <Text style={[styles.predictButtonText, { color: colors.tint }]}>Predict</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.buyButton} onPress={() => setModalVisible(true)}>
                    <Text style={styles.buyButtonText}>Buy {stock.symbol}</Text>
                </TouchableOpacity>
            </View>

            <PredictionModal
                stock={stock}
                visible={predictionVisible}
                onClose={() => setPredictionVisible(false)}
            />

            {/* Buy Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Buy {stock.symbol}</Text>

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Current Price:</Text>
                            <Text style={styles.infoValue}>₹{stock.last_price}</Text>
                        </View>

                        <Text style={styles.inputLabel}>Quantity</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={quantity}
                            onChangeText={setQuantity}
                        />

                        <View style={styles.totalRow}>
                            <Text>Total Cost:</Text>
                            <Text style={{ fontWeight: 'bold' }}>₹{(parseFloat(stock.last_price) * parseInt(quantity || '0')).toFixed(2)}</Text>
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={handleBuy}
                                disabled={tradeLoading}
                            >
                                {tradeLoading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.confirmButtonText}>Confirm Buy</Text>
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
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    scroll: {
        padding: 16,
        paddingBottom: 100,
    },
    headerCard: {
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        marginBottom: 16,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    symbol: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    name: {
        fontSize: 14,
        marginTop: 4,
    },
    priceRow: {
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    price: {
        fontSize: 32,
        fontWeight: 'bold',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
    },
    changeText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    statsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
    },
    statCard: {
        width: '48%',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
    },
    statLabel: {
        fontSize: 12,
        color: '#888',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '600',
    },
    infoCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        lineHeight: 20,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        borderTopWidth: 1,
        flexDirection: 'row',
        gap: 12,
    },
    buyButton: {
        backgroundColor: '#10b981',
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        flex: 2,
    },
    buyButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    predictButton: {
        height: 50,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
        flexDirection: 'row',
        gap: 8,
    },
    predictButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },

    // Modal
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
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 16, marginBottom: 10 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    modalButtons: { flexDirection: 'row', gap: 10 },
    modalButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
    cancelButton: { backgroundColor: '#f5f5f5' },
    confirmButton: { backgroundColor: '#10b981' },
    cancelButtonText: { color: '#333', fontWeight: '600' },
    confirmButtonText: { color: '#fff', fontWeight: 'bold' },
});
