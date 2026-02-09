import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { stocksAPI } from '@/services/stocks';
import { watchlistAPI } from '@/services/watchlist';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/Colors';
import PredictionModal from '@/components/PredictionModal';

export default function StocksScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [stocks, setStocks] = useState<any[]>([]);
    const [watchlistIds, setWatchlistIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'equity' | 'index'>('all');

    const fetchWatchlistIds = async () => {
        try {
            const res = await watchlistAPI.getAll();
            const data = res.data?.data || res.data || [];
            const items = data.stocks || (Array.isArray(data) ? data : []);
            setWatchlistIds(items.map((item: any) => item.stock_details.id));
        } catch (e) {
            console.error("Failed to fetch watchlist IDs", e);
        }
    };

    const fetchStocks = async (pageNum = 1, isRefresh = false) => {
        if (pageNum === 1) setLoading(true);
        else setLoadingMore(true);

        try {
            const params = {
                page: pageNum,
                page_size: 20,
                search: searchQuery,
                is_index: filterType === 'all' ? undefined : (filterType === 'index')
            };

            const response = await stocksAPI.getAll(params);
            const responseData = response.data?.data || response.data;
            const stockList = responseData.stocks || responseData.results || [];
            const meta = responseData.pagination || {};

            if (pageNum === 1) {
                setStocks(stockList);
            } else {
                setStocks(prev => [...prev, ...stockList]);
            }

            setTotalPages(meta.total_pages || 1);
            setPage(pageNum);
        } catch (error) {
            console.error('Failed to fetch stocks', error);
            Alert.alert("Error", "Failed to load stocks.");
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchWatchlistIds();
        fetchStocks(1);
    }, [filterType]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchStocks(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchWatchlistIds();
        fetchStocks(1, true);
    };

    const handleLoadMore = () => {
        if (!loadingMore && page < totalPages) {
            fetchStocks(page + 1);
        }
    };

    const toggleWatchlist = async (stock: any) => {
        const isInWatchlist = watchlistIds.includes(stock.id);
        setLoading(true); // Show loading while toggling
        try {
            if (isInWatchlist) {
                // Find watchlist item ID
                const res = await watchlistAPI.getAll();
                const data = res.data?.data || res.data || [];
                const items = data.stocks || (Array.isArray(data) ? data : []);
                const item = items.find((i: any) => i.stock_details.id === stock.id);
                if (item) {
                    await watchlistAPI.remove(item.id);
                    setWatchlistIds(prev => prev.filter(id => id !== stock.id));
                }
            } else {
                await watchlistAPI.add(stock.id);
                setWatchlistIds(prev => [...prev, stock.id]);
            }
        } catch (e) {
            console.error("Watchlist toggle failed:", e);
            Alert.alert("Error", "Action failed.");
        } finally {
            setLoading(false);
        }
    };

    const [selectedStock, setSelectedStock] = useState<any>(null);
    const [predictionModalVisible, setPredictionModalVisible] = useState(false);

    const handleAddPrediction = (stock: any) => {
        setSelectedStock(stock);
        setPredictionModalVisible(true);
    };

    const renderStockItem = ({ item }: { item: any }) => {
        const isInWatchlist = watchlistIds.includes(item.id);
        const isPositive = (item.price_change || 0) >= 0;

        return (
            <View style={[styles.stockCard, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <TouchableOpacity
                    style={styles.stockInfo}
                    onPress={() => router.push(`/stocks/${item.id}` as any)}
                >
                    <Text style={[styles.stockSymbol, { color: colors.text }]}>{item.symbol}</Text>
                    <Text style={[styles.stockName, { color: colors.tabIconDefault }]}>{item.name}</Text>
                </TouchableOpacity>
                <View style={styles.stockValues}>
                    <Text style={[styles.stockPrice, { color: colors.text }]}>₹{parseFloat(item.last_price as any || 0).toFixed(2)}</Text>
                    <View style={styles.changeContainer}>
                        <FontAwesome
                            name={isPositive ? "caret-up" : "caret-down"}
                            size={12}
                            color={isPositive ? '#10b981' : '#ef4444'}
                        />
                        <Text style={[styles.stockChange, { color: isPositive ? '#10b981' : '#ef4444' }]}>
                            {Math.abs(item.price_change || 0).toFixed(2)}%
                        </Text>
                    </View>
                </View>

                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={styles.predictBtn}
                        onPress={() => handleAddPrediction(item)}
                    >
                        <FontAwesome name="bullseye" size={18} color="#8b5cf6" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => toggleWatchlist(item)}
                    >
                        <FontAwesome
                            name={isInWatchlist ? "star" : "star-o"}
                            size={20}
                            color={isInWatchlist ? '#f59e0b' : colors.tabIconDefault}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ title: 'Stocks', headerShown: true }} />

            {/* Search & Filter Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <View style={[styles.searchBar, { backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#f3f4f6' }]}>
                    <FontAwesome name="search" size={16} color={colors.tabIconDefault} style={styles.searchIcon} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Search stocks..."
                        placeholderTextColor={colors.tabIconDefault}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                <View style={styles.filterRow}>
                    {(['all', 'equity', 'index'] as const).map((type) => (
                        <TouchableOpacity
                            key={type}
                            style={[
                                styles.filterButton,
                                filterType === type && styles.filterButtonActive,
                                { borderColor: colors.border }
                            ]}
                            onPress={() => setFilterType(type)}
                        >
                            <Text style={[
                                styles.filterText,
                                { color: filterType === type ? '#fff' : colors.tabIconDefault }
                            ]}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                </View>
            ) : (
                <FlatList
                    data={stocks}
                    renderItem={renderStockItem}
                    keyExtractor={(item) => item.id.toString()}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListFooterComponent={
                        loadingMore ? (
                            <ActivityIndicator size="small" color="#3b82f6" style={{ marginVertical: 20 }} />
                        ) : null
                    }
                    ListEmptyComponent={
                        <View style={styles.centerContainer}>
                            <Text style={{ color: colors.tabIconDefault }}>No stocks found</Text>
                        </View>
                    }
                />
            )}

            <PredictionModal
                stock={selectedStock}
                visible={predictionModalVisible}
                onClose={() => setPredictionModalVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 40,
        borderRadius: 20,
        marginBottom: 12,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
    },
    filterRow: {
        flexDirection: 'row',
        gap: 8,
    },
    filterButton: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
    },
    filterButtonActive: {
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6',
    },
    filterText: {
        fontSize: 12,
        fontWeight: '600',
    },
    stockCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    stockInfo: {
        flex: 1,
    },
    stockSymbol: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    stockName: {
        fontSize: 12,
        marginTop: 2,
    },
    stockValues: {
        alignItems: 'flex-end',
        marginRight: 16,
    },
    stockPrice: {
        fontSize: 16,
        fontWeight: '600',
    },
    changeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    stockChange: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    actionButton: {
        padding: 8,
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    predictBtn: {
        padding: 8,
        backgroundColor: '#f3e8ff',
        borderRadius: 8,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 50,
    },
});
