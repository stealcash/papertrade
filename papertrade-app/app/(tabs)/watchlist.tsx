import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert, RefreshControl, Platform } from 'react-native';
import { useFocusEffect, Link, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { watchlistAPI, WatchlistItem } from '@/services/watchlist';
import { stocksAPI } from '@/services/stocks';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/Colors';
import PredictionModal from '@/components/PredictionModal';

export default function WatchlistScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const router = useRouter();

    const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Reorder State
    const [hasUnsavedOrder, setHasUnsavedOrder] = useState(false);
    const [isSavingOrder, setIsSavingOrder] = useState(false);

    // Search Modal
    const [searchVisible, setSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    // Prediction Modal
    const [selectedStock, setSelectedStock] = useState<any>(null);
    const [predictionVisible, setPredictionVisible] = useState(false);

    const fetchWatchlist = async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        try {
            const response = await watchlistAPI.getAll();
            const data = response.data?.data || response.data || response;
            const stocks = data.stocks || (Array.isArray(data) ? data : []);
            // Sort by order initially
            setWatchlist(stocks.sort((a: any, b: any) => (a.order || 0) - (b.order || 0)));
            setHasUnsavedOrder(false);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (!hasUnsavedOrder) {
                fetchWatchlist();
            }
        }, [hasUnsavedOrder])
    );

    const handleRefresh = () => {
        setRefreshing(true);
        fetchWatchlist(true);
    };

    const handleSaveOrder = async () => {
        setIsSavingOrder(true);
        try {
            const items = watchlist.map((item, index) => ({
                id: item.id,
                order: index
            }));
            await watchlistAPI.reorder(items);
            setHasUnsavedOrder(false);
            Alert.alert("Success", "Watchlist order saved.");
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to save order.");
        } finally {
            setIsSavingOrder(false);
        }
    };

    const handleSearch = async (text: string) => {
        setSearchQuery(text);
        if (text.length < 2) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        try {
            const response = await stocksAPI.getAll({ search: text });
            const data = response.data?.data || response.data || response;
            const stocks = data.stocks || (Array.isArray(data) ? data : []);
            setSearchResults(stocks);
        } catch (e) {
            console.error(e);
        } finally {
            setSearching(false);
        }
    };

    const addToWatchlist = async (stock: any) => {
        try {
            await watchlistAPI.add(stock.id);
            setSearchVisible(false);
            setSearchQuery('');
            setSearchResults([]);
            fetchWatchlist();
        } catch (e) {
            Alert.alert("Error", "Failed to add stock.");
        }
    };

    const removeFromWatchlist = async (item: WatchlistItem) => {
        Alert.alert(
            "Remove",
            `Remove ${item.stock_details.symbol} from watchlist?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove", style: 'destructive',
                    onPress: async () => {
                        try {
                            await watchlistAPI.remove(item.id);
                            fetchWatchlist();
                        } catch (e) {
                            Alert.alert("Error", "Failed to remove stock.");
                        }
                    }
                }
            ]
        );
    };

    const handlePredict = (stock: any) => {
        setSelectedStock({
            id: stock.stock_details.id,
            symbol: stock.stock_details.symbol,
            name: stock.stock_details.name
        });
        setPredictionVisible(true);
    };

    const renderItem = ({ item, drag, isActive }: RenderItemParams<WatchlistItem>) => {
        const isPositive = (item.stock_details.change_percent || 0) >= 0;

        return (
            <ScaleDecorator>
                <TouchableOpacity
                    activeOpacity={1}
                    onLongPress={drag}
                    disabled={isActive}
                    style={[
                        styles.card,
                        {
                            backgroundColor: colors.card,
                            borderColor: isActive ? colors.tint : colors.border,
                            opacity: isActive ? 0.9 : 1
                        }
                    ]}
                >
                    <TouchableOpacity
                        style={styles.dragHandle}
                        onPressIn={drag}
                    >
                        <FontAwesome name="navicon" size={16} color={colors.tabIconDefault} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.stockInfo}
                        onPress={() => router.push(`/stocks/${item.stock_details.id}` as any)}
                    >
                        <Text style={[styles.symbol, { color: colors.text }]}>{item.stock_details.symbol}</Text>
                        <Text style={[styles.name, { color: colors.tabIconDefault }]} numberOfLines={1}>{item.stock_details.name}</Text>
                    </TouchableOpacity>

                    <View style={styles.stockValues}>
                        <Text style={[styles.price, { color: colors.text }]}>₹{parseFloat(item.stock_details.last_price as any || 0).toFixed(2)}</Text>
                        <Text style={[styles.change, { color: isPositive ? '#10b981' : '#ef4444' }]}>
                            {isPositive ? '+' : ''}{parseFloat(item.stock_details.change_percent as any || 0).toFixed(2)}%
                        </Text>
                    </View>

                    <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => handlePredict(item)}>
                            <FontAwesome name="bullseye" size={18} color="#8b5cf6" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => removeFromWatchlist(item)}>
                            <FontAwesome name="trash-o" size={18} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </ScaleDecorator>
        );
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Watchlist</Text>

                    <View style={styles.headerActions}>
                        {hasUnsavedOrder && (
                            <TouchableOpacity
                                style={[styles.saveBtn, { backgroundColor: '#10b981' }]}
                                onPress={handleSaveOrder}
                                disabled={isSavingOrder}
                            >
                                {isSavingOrder ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.saveBtnText}>Save Order</Text>
                                )}
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.addBtn} onPress={() => setSearchVisible(true)}>
                            <FontAwesome name="plus" size={18} color={colors.tint} />
                        </TouchableOpacity>
                    </View>
                </View>

                {loading && !refreshing ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={colors.tint} />
                    </View>
                ) : (
                    <DraggableFlatList
                        data={watchlist}
                        onDragEnd={({ data }) => {
                            setWatchlist(data);
                            setHasUnsavedOrder(true);
                        }}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderItem}
                        contentContainerStyle={styles.list}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.tint} />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <FontAwesome name="star-o" size={64} color={colors.tabIconDefault} />
                                <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>Your watchlist is empty</Text>
                                <TouchableOpacity style={[styles.emptyAddBtn, { borderColor: colors.tint }]} onPress={() => setSearchVisible(true)}>
                                    <Text style={[styles.emptyAddBtnText, { color: colors.tint }]}>Add Stocks</Text>
                                </TouchableOpacity>
                            </View>
                        }
                    />
                )}

                {/* Prediction Modal */}
                <PredictionModal
                    stock={selectedStock}
                    visible={predictionVisible}
                    onClose={() => setPredictionVisible(false)}
                />

                {/* Search Modal */}
                <Modal visible={searchVisible} animationType="slide">
                    <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                            <TouchableOpacity onPress={() => setSearchVisible(false)} style={styles.modalCloseBtn}>
                                <FontAwesome name="arrow-left" size={20} color={colors.text} />
                            </TouchableOpacity>
                            <TextInput
                                style={[styles.searchInput, { color: colors.text }]}
                                placeholder="Search stocks..."
                                placeholderTextColor={colors.tabIconDefault}
                                autoFocus
                                value={searchQuery}
                                onChangeText={handleSearch}
                            />
                            {searching && <ActivityIndicator size="small" color={colors.tint} style={{ marginRight: 10 }} />}
                        </View>

                        <FlatList
                            data={searchResults}
                            renderItem={({ item }: { item: any }) => (
                                <TouchableOpacity
                                    style={[styles.searchItem, { borderBottomColor: colors.border }]}
                                    onPress={() => addToWatchlist(item)}
                                >
                                    <View>
                                        <Text style={[styles.searchSymbol, { color: colors.text }]}>{item.symbol}</Text>
                                        <Text style={[styles.searchName, { color: colors.tabIconDefault }]}>{item.name}</Text>
                                    </View>
                                    <View style={styles.searchAddIcon}>
                                        <FontAwesome name="plus" size={16} color="#fff" />
                                    </View>
                                </TouchableOpacity>
                            )}
                            keyExtractor={(item: any) => item.id.toString()}
                            contentContainerStyle={styles.searchList}
                            ListEmptyComponent={!searching && searchQuery.length >= 2 ? (
                                <View style={styles.emptyState}>
                                    <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>No stocks found matching "{searchQuery}"</Text>
                                </View>
                            ) : null}
                        />
                    </View>
                </Modal>
            </View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 15,
        borderBottomWidth: 1,
    },
    headerTitle: { fontSize: 24, fontWeight: 'bold' },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    addBtn: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(59, 130, 246, 0.1)',
        justifyContent: 'center', alignItems: 'center'
    },
    saveBtn: {
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    },
    saveBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },

    list: { padding: 16 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },

    card: {
        padding: 12, borderRadius: 16, marginBottom: 12, borderWidth: 1,
        flexDirection: 'row', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
    },
    dragHandle: { padding: 10, marginRight: 5 },
    stockInfo: { flex: 1 },
    symbol: { fontSize: 16, fontWeight: 'bold' },
    name: { fontSize: 12, marginTop: 2 },
    stockValues: { alignItems: 'flex-end', marginRight: 15 },
    price: { fontSize: 16, fontWeight: '600' },
    change: { fontSize: 12, fontWeight: 'bold', marginTop: 2 },

    actionButtons: { flexDirection: 'row', gap: 5 },
    actionBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)' },

    emptyState: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
    emptyText: { fontSize: 16, marginTop: 16, marginBottom: 24, textAlign: 'center' },
    emptyAddBtn: { paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24, borderWidth: 1 },
    emptyAddBtnText: { fontSize: 16, fontWeight: 'bold' },

    // Modal
    modalContainer: { flex: 1 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 15, paddingTop: Platform.OS === 'ios' ? 60 : 40, borderBottomWidth: 1 },
    modalCloseBtn: { padding: 10 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 17, paddingVertical: 8 },
    searchList: { padding: 15 },
    searchItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 15, borderBottomWidth: 1,
    },
    searchSymbol: { fontSize: 16, fontWeight: 'bold' },
    searchName: { fontSize: 12, marginTop: 2 },
    searchAddIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' },
});

