import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, RefreshControl, Modal, ScrollView, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { stocksAPI } from '@/services/stocks';
import { sectorsAPI } from '@/services/sectors';
import { watchlistAPI } from '@/services/watchlist';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/Colors';
import PredictionModal from '@/components/PredictionModal';

export default function MarketScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [stocks, setStocks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filter Data
    const [categories, setCategories] = useState<any[]>([]);
    const [sectors, setSectors] = useState<any[]>([]);
    const [filterModalVisible, setFilterModalVisible] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);

    // Filters & Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'equity' | 'index'>('all');
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [selectedSector, setSelectedSector] = useState<number | null>(null);
    const [sortBy, setSortBy] = useState('symbol');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [quickSort, setQuickSort] = useState<string>('a_to_z'); // a_to_z, z_to_a, top_gainers, top_losers

    const fetchFilters = async () => {
        try {
            const [catRes, secRes] = await Promise.all([
                stocksAPI.getCategories(),
                sectorsAPI.getAll()
            ]);
            const catData = catRes.data?.data || catRes.data || [];
            setCategories(Array.isArray(catData) ? catData : []);

            const secData = secRes.data?.data?.sectors || secRes.data?.data || secRes.data?.results || [];
            if (Array.isArray(secData)) {
                setSectors(secData);
            } else if (secData && typeof secData === 'object') {
                // handle paginated response if sectors api returns pagination
                setSectors(secData.results || []);
            } else {
                setSectors([]);
            }
        } catch (e) {
            console.error("Failed to fetch filters", e);
        }
    };


    const fetchStocks = async (pageNum = 1) => {
        if (pageNum === 1) setLoading(true);
        else setLoadingMore(true);

        try {
            const params: any = {
                page: pageNum,
                page_size: 20,
                search: searchQuery,
                is_index: filterType === 'all' ? undefined : (filterType === 'index'),
                category_id: selectedCategory,
                sector_id: selectedSector,
                sort_by: sortBy,
                order: sortOrder
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
        fetchFilters();
    }, []);

    useEffect(() => {
        fetchStocks(1);
    }, [filterType, selectedCategory, selectedSector, sortBy, sortOrder]);

    const handleQuickSort = (type: string) => {
        setQuickSort(type);
        if (type === 'a_to_z') {
            setSortBy('symbol');
            setSortOrder('asc');
        } else if (type === 'z_to_a') {
            setSortBy('symbol');
            setSortOrder('desc');
        } else if (type === 'top_gainers') {
            setSortBy('price_change');
            setSortOrder('desc');
        } else if (type === 'top_losers') {
            setSortBy('price_change');
            setSortOrder('asc');
        }
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchStocks(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchStocks(1);
    };

    const handleLoadMore = () => {
        if (!loadingMore && page < totalPages) {
            fetchStocks(page + 1);
        }
    };

    const [selectedStock, setSelectedStock] = useState<any>(null);
    const [predictionModalVisible, setPredictionModalVisible] = useState(false);

    const handleAddPrediction = (stock: any) => {
        setSelectedStock(stock);
        setPredictionModalVisible(true);
    };

    const clearFilters = () => {
        setSelectedCategory(null);
        setSelectedSector(null);
        setFilterType('all');
        setSearchQuery('');
        handleQuickSort('a_to_z');
        setFilterModalVisible(false);
    };

    const activeFiltersCount = (selectedCategory ? 1 : 0) + (selectedSector ? 1 : 0) + (filterType !== 'all' ? 1 : 0);

    const renderStockItem = ({ item }: { item: any }) => {
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

                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ title: 'Market', headerShown: true }} />

            {/* Header with Search and Filter Button */}
            <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
                <View style={[styles.searchRow]}>
                    <View style={[styles.searchBar, { backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#f3f4f6', flex: 1 }]}>
                        <FontAwesome name="search" size={16} color={colors.tabIconDefault} style={styles.searchIcon} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.text }]}
                            placeholder="Search..."
                            placeholderTextColor={colors.tabIconDefault}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    <TouchableOpacity
                        style={[styles.filterBtn, activeFiltersCount > 0 && { backgroundColor: colors.tint }]}
                        onPress={() => setFilterModalVisible(true)}
                    >
                        <FontAwesome name="filter" size={18} color={activeFiltersCount > 0 ? '#fff' : colors.text} />
                        {activeFiltersCount > 0 && <View style={styles.badge} />}
                    </TouchableOpacity>
                </View>

                {/* Horizontal Sort Options */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickSortRow} contentContainerStyle={{ paddingRight: 16 }}>
                    <TouchableOpacity onPress={() => handleQuickSort('a_to_z')} style={[styles.chip, quickSort === 'a_to_z' && { backgroundColor: colors.text }]}>
                        <Text style={[styles.chipText, quickSort === 'a_to_z' && { color: colors.background }]}>A-Z</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleQuickSort('z_to_a')} style={[styles.chip, quickSort === 'z_to_a' && { backgroundColor: colors.text }]}>
                        <Text style={[styles.chipText, quickSort === 'z_to_a' && { color: colors.background }]}>Z-A</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleQuickSort('top_gainers')} style={[styles.chip, quickSort === 'top_gainers' && { backgroundColor: '#10b981', borderColor: '#10b981' }]}>
                        <Text style={[styles.chipText, quickSort === 'top_gainers' && { color: '#fff' }]}>Gainers</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleQuickSort('top_losers')} style={[styles.chip, quickSort === 'top_losers' && { backgroundColor: '#ef4444', borderColor: '#ef4444' }]}>
                        <Text style={[styles.chipText, quickSort === 'top_losers' && { color: '#fff' }]}>Losers</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            {/* Main List */}
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

            {/* Filter Modal */}
            <Modal
                visible={filterModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setFilterModalVisible(false)}
            >
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Filters</Text>
                        <TouchableOpacity onPress={clearFilters}>
                            <Text style={{ color: '#ef4444' }}>Reset</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        <Text style={[styles.sectionTitle, { color: colors.tabIconDefault }]}>TYPE</Text>
                        <View style={styles.modalRow}>
                            {(['all', 'equity', 'index'] as const).map(t => (
                                <TouchableOpacity
                                    key={t}
                                    onPress={() => setFilterType(t)}
                                    style={[styles.modalChip, filterType === t && { backgroundColor: colors.tint, borderColor: colors.tint }]}
                                >
                                    <Text style={[styles.modalChipText, filterType === t && { color: '#fff' }]}>{t.toUpperCase()}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.sectionTitle, { color: colors.tabIconDefault }]}>CATEGORY</Text>
                        <View style={styles.modalRowWrap}>
                            <TouchableOpacity
                                onPress={() => setSelectedCategory(null)}
                                style={[styles.modalChip, selectedCategory === null && { backgroundColor: colors.tint, borderColor: colors.tint }]}
                            >
                                <Text style={[styles.modalChipText, selectedCategory === null && { color: '#fff' }]}>All Categories</Text>
                            </TouchableOpacity>
                            {categories.map(cat => (
                                <TouchableOpacity
                                    key={cat.id}
                                    onPress={() => setSelectedCategory(cat.id)}
                                    style={[styles.modalChip, selectedCategory === cat.id && { backgroundColor: colors.tint, borderColor: colors.tint }]}
                                >
                                    <Text style={[styles.modalChipText, selectedCategory === cat.id && { color: '#fff' }]}>{cat.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.sectionTitle, { color: colors.tabIconDefault }]}>SECTOR</Text>
                        <View style={styles.modalRowWrap}>
                            <TouchableOpacity
                                onPress={() => setSelectedSector(null)}
                                style={[styles.modalChip, selectedSector === null && { backgroundColor: colors.tint, borderColor: colors.tint }]}
                            >
                                <Text style={[styles.modalChipText, selectedSector === null && { color: '#fff' }]}>All Sectors</Text>
                            </TouchableOpacity>
                            {sectors.map(sec => (
                                <TouchableOpacity
                                    key={sec.id}
                                    onPress={() => setSelectedSector(sec.id)}
                                    style={[styles.modalChip, selectedSector === sec.id && { backgroundColor: colors.tint, borderColor: colors.tint }]}
                                >
                                    <Text style={[styles.modalChipText, selectedSector === sec.id && { color: '#fff' }]}>{sec.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
                        <TouchableOpacity
                            style={[styles.modalApplyBtn, { backgroundColor: colors.tint }]}
                            onPress={() => setFilterModalVisible(false)}
                        >
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>See Results</Text>
                        </TouchableOpacity>
                    </View>
                    {Platform.OS === 'ios' && <View style={{ height: 20 }} />}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    searchRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 44,
        borderRadius: 12,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        height: '100%',
    },
    filterBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ef4444',
        borderWidth: 1,
        borderColor: '#fff',
    },
    quickSortRow: {
        flexDirection: 'row',
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginRight: 8,
    },
    chipText: {
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
    modalContainer: {
        flex: 1,
        paddingTop: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    modalContent: {
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 10,
        opacity: 0.7,
    },
    modalRow: {
        flexDirection: 'row',
        gap: 10,
    },
    modalRowWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    modalChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    modalChipText: {
        fontSize: 14,
        fontWeight: '500',
    },
    modalFooter: {
        padding: 20,
        borderTopWidth: 1,
    },
    modalApplyBtn: {
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
