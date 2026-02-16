import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert, RefreshControl, Platform } from 'react-native';
import { useFocusEffect, Link, useRouter } from 'expo-router';
import { FontAwesome, Feather } from '@expo/vector-icons';
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
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);

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

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        if (text.length < 2) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        searchTimeout.current = setTimeout(async () => {
            try {
                const response = await stocksAPI.getAll({ search: text, limit: 20 });
                const data = response.data?.data || response.data || response;
                const stocks = data.stocks || (Array.isArray(data) ? data : []);
                setSearchResults(stocks);
            } catch (e) {
                console.error(e);
            } finally {
                setSearching(false);
            }
        }, 500); // 500ms debounce
    };

    const addToWatchlist = async (stock: any) => {
        try {
            // Check if already in watchlist to prevent duplicates locally first
            if (watchlist.some(w => w.stock_details.id === stock.id)) {
                Alert.alert("Info", `${stock.symbol} is already in the watchlist.`);
                return;
            }

            await watchlistAPI.add(stock.id);
            // Optimistically add to UI or refresh
            fetchWatchlist();
            // Optional: Close modal or show success feedback
            // setSearchVisible(false);
            Alert.alert("Success", `${stock.symbol} added to watchlist.`);
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
                        styles.row,
                        {
                            backgroundColor: isActive ? colors.tint + '10' : colors.background, // Highlight on drag
                            borderBottomColor: colors.border
                        }
                    ]}
                >
                    <View style={styles.rowLeft}>
                        <TouchableOpacity onPressIn={drag} style={styles.dragHandle}>
                            <FontAwesome name="bars" size={14} color={colors.tabIconDefault} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.stockInfo}
                            onPress={() => router.push(`/stocks/${item.stock_details.id}` as any)}
                        >
                            <Text style={[styles.symbol, { color: colors.text }]}>{item.stock_details.symbol}</Text>
                            <Text style={[styles.name, { color: colors.tabIconDefault }]} numberOfLines={1}>{item.stock_details.name}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.rowRight}>
                        <View style={styles.priceInfo}>
                            <Text style={[styles.price, { color: colors.text }]}>₹{parseFloat(item.stock_details.last_price as any || 0).toFixed(2)}</Text>
                            <View style={styles.changeContainer}>
                                <Feather
                                    name={isPositive ? "trending-up" : "trending-down"}
                                    size={12}
                                    color={isPositive ? '#16a34a' : '#dc2626'}
                                    style={{ marginRight: 2 }}
                                />
                                <Text style={[styles.change, { color: isPositive ? '#16a34a' : '#dc2626' }]}>
                                    {parseFloat(item.stock_details.change_percent as any || 0).toFixed(2)}%
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.predictBtn}
                            onPress={() => handlePredict(item)}
                        >
                            <Feather name="trending-up" size={14} color="#7c3aed" />
                            <Text style={styles.predictText}>Predict</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.removeBtn}
                            onPress={() => removeFromWatchlist(item)}
                        >
                            <Feather name="trash-2" size={16} color={colors.tabIconDefault} />
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
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>My Watchlist</Text>

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
                                    <Text style={styles.saveBtnText}>Save</Text>
                                )}
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.addBtn, { backgroundColor: colors.tint }]}
                            onPress={() => setSearchVisible(true)}
                        >
                            <Feather name="plus" size={20} color="#fff" />
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
                                <Feather name="list" size={48} color={colors.tabIconDefault} />
                                <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>Your watchlist is empty.</Text>
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
                <Modal visible={searchVisible} animationType="slide" presentationStyle="pageSheet">
                    <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                            <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                <Feather name="search" size={18} color={colors.tabIconDefault} style={{ marginLeft: 10 }} />
                                <TextInput
                                    style={[styles.searchInput, { color: colors.text }]}
                                    placeholder="Search stocks..."
                                    placeholderTextColor={colors.tabIconDefault}
                                    autoFocus
                                    value={searchQuery}
                                    onChangeText={handleSearch}
                                    clearButtonMode="while-editing"
                                />
                                {searching && <ActivityIndicator size="small" color={colors.tint} style={{ marginRight: 10 }} />}
                            </View>
                            <TouchableOpacity onPress={() => setSearchVisible(false)} style={styles.modalCancelBtn}>
                                <Text style={{ color: colors.tint, fontSize: 16 }}>Cancel</Text>
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={searchResults}
                            renderItem={({ item }: { item: any }) => {
                                const isInWatchlist = watchlist.some(w => w.stock_details.id === item.id);
                                return (
                                    <TouchableOpacity
                                        style={[styles.searchItem, { borderBottomColor: colors.border }]}
                                        onPress={() => !isInWatchlist && addToWatchlist(item)}
                                        disabled={isInWatchlist}
                                    >
                                        <View>
                                            <Text style={[styles.searchSymbol, { color: colors.text }]}>{item.symbol}</Text>
                                            <Text style={[styles.searchName, { color: colors.tabIconDefault }]}>{item.name}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            {item.last_price && (
                                                <Text style={[styles.searchPrice, { color: colors.tabIconDefault }]}>₹{item.last_price}</Text>
                                            )}
                                            {isInWatchlist ? (
                                                <View style={styles.addedBadge}>
                                                    <Feather name="check" size={14} color="#16a34a" />
                                                    <Text style={styles.addedText}>Added</Text>
                                                </View>
                                            ) : (
                                                <View style={[styles.addIcon, { backgroundColor: colors.tint + '10' }]}>
                                                    <Feather name="plus" size={16} color={colors.tint} />
                                                </View>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                            keyExtractor={(item: any) => item.id.toString()}
                            contentContainerStyle={styles.searchList}
                            ListEmptyComponent={!searching && searchQuery.length >= 2 ? (
                                <View style={styles.emptyState}>
                                    <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>No stocks found.</Text>
                                </View>
                            ) : null}
                            keyboardShouldPersistTaps="handled"
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
        paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 15,
        borderBottomWidth: 1,
    },
    headerTitle: { fontSize: 28, fontWeight: 'bold' },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    addBtn: {
        width: 36, height: 36, borderRadius: 18,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3
    },
    saveBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
    saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

    list: { paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Row Styles
    row: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 14, paddingHorizontal: 20,
        borderBottomWidth: 1,
    },
    rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    dragHandle: { paddingRight: 15, paddingVertical: 5 },
    stockInfo: { flex: 1 },
    symbol: { fontSize: 16, fontWeight: '700' },
    name: { fontSize: 12, marginTop: 2 },

    rowRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    priceInfo: { alignItems: 'flex-end', minWidth: 70 },
    price: { fontSize: 15, fontWeight: '600' },
    changeContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    change: { fontSize: 12, fontWeight: '500' },

    predictBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#7c3aed10', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8
    },
    predictText: { fontSize: 12, fontWeight: '600', color: '#7c3aed' },

    removeBtn: { padding: 6 },

    emptyState: { alignItems: 'center', marginTop: 100 },
    emptyText: { fontSize: 16, marginTop: 16, marginBottom: 24 },
    emptyAddBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
    emptyAddBtnText: { fontSize: 14, fontWeight: '600' },

    // Modal
    modalContainer: { flex: 1 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, paddingTop: Platform.OS === 'ios' ? 20 : 16 },
    searchBar: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        borderWidth: 1, borderRadius: 12, height: 44, marginRight: 12
    },
    searchInput: { flex: 1, marginHorizontal: 10, fontSize: 16, height: '100%' },
    modalCancelBtn: { padding: 4 },

    searchList: { paddingHorizontal: 16 },
    searchItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 16, borderBottomWidth: 1,
    },
    searchSymbol: { fontSize: 16, fontWeight: 'bold' },
    searchName: { fontSize: 13, marginTop: 2, maxWidth: 200 },
    searchPrice: { fontSize: 13, marginRight: 10 },

    addIcon: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    addedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    addedText: { fontSize: 12, fontWeight: '600', color: '#16a34a' }
});

