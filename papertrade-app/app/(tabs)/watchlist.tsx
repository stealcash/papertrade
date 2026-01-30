import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { watchlistApi, WatchlistItem } from '@/services/watchlist';

export default function WatchlistScreen() {
    const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
    const [loading, setLoading] = useState(false);

    // Search Modal
    const [searchVisible, setSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    const fetchWatchlist = async () => {
        setLoading(true);
        try {
            const response = await watchlistApi.getWatchlist();
            // Response structure: { data: { stocks: [], pagination: {} } } usually, or unwrapped
            const data = response.data || response;
            setWatchlist(data.stocks || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchWatchlist();
        }, [])
    );

    const handleSearch = async (text: string) => {
        setSearchQuery(text);
        if (text.length < 2) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        try {
            const response = await watchlistApi.searchStocks(text);
            const data = response.data || response;
            setSearchResults(data.stocks || []);
        } catch (e) {
            console.error(e);
        } finally {
            setSearching(false);
        }
    };

    const addToWatchlist = async (stock: any) => {
        try {
            await watchlistApi.addToWatchlist(stock.id);
            Alert.alert("Added", `${stock.symbol} added to watchlist.`);
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
                            await watchlistApi.removeFromWatchlist(item.stock_details.id);
                            fetchWatchlist();
                        } catch (e) {
                            Alert.alert("Error", "Failed to remove stock.");
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: WatchlistItem }) => {
        const isPositive = (item.stock_details.change_percent || 0) >= 0;
        return (
            <TouchableOpacity style={styles.card} onLongPress={() => removeFromWatchlist(item)}>
                <View>
                    <Text style={styles.symbol}>{item.stock_details.symbol}</Text>
                    <Text style={styles.name}>{item.stock_details.name}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.price}>₹{item.stock_details.last_price || '0.00'}</Text>
                    <Text style={[styles.change, isPositive ? styles.green : styles.red]}>
                        {isPositive ? '+' : ''}{item.stock_details.change_percent?.toFixed(2)}%
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderSearchItem = ({ item }: { item: any }) => (
        <TouchableOpacity style={styles.searchItem} onPress={() => addToWatchlist(item)}>
            <View>
                <Text style={styles.searchSymbol}>{item.symbol}</Text>
                <Text style={styles.searchName}>{item.name}</Text>
            </View>
            <FontAwesome name="plus-circle" size={24} color="#0a7ea4" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Watchlist</Text>
                <TouchableOpacity onPress={() => setSearchVisible(true)}>
                    <FontAwesome name="plus" size={20} color="#0a7ea4" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={watchlist}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchWatchlist} />}
                ListEmptyComponent={!loading ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>Watchlist is empty</Text>
                        <TouchableOpacity onPress={() => setSearchVisible(true)}>
                            <Text style={styles.addLink}>Add Stocks</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}
            />

            {/* Search Modal */}
            <Modal visible={searchVisible} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setSearchVisible(false)}>
                            <FontAwesome name="arrow-left" size={20} color="#333" />
                        </TouchableOpacity>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search stocks..."
                            autoFocus
                            value={searchQuery}
                            onChangeText={handleSearch}
                        />
                        {searching && <ActivityIndicator size="small" color="#0a7ea4" />}
                    </View>

                    <FlatList
                        data={searchResults}
                        renderItem={renderSearchItem}
                        keyExtractor={item => item.id.toString()}
                        contentContainerStyle={styles.searchList}
                    />
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 15, paddingTop: 50, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee'
    },
    headerTitle: { fontSize: 24, fontWeight: 'bold' },
    list: { padding: 15 },

    card: {
        backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 2
    },
    symbol: { fontSize: 16, fontWeight: 'bold' },
    name: { fontSize: 12, color: '#888', marginTop: 2 },
    price: { fontSize: 16, fontWeight: '600' },
    change: { fontSize: 12, fontWeight: 'bold', marginTop: 2 },
    green: { color: '#28a745' },
    red: { color: '#dc3545' },

    emptyState: { alignItems: 'center', marginTop: 50 },
    emptyText: { color: '#888', marginBottom: 10 },
    addLink: { color: '#0a7ea4', fontWeight: 'bold' },

    // Modal
    modalContainer: { flex: 1, backgroundColor: '#fff', paddingTop: 50 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
    searchInput: { flex: 1, marginLeft: 15, fontSize: 16, padding: 5 },
    searchList: { padding: 15 },
    searchItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f9f9f9'
    },
    searchSymbol: { fontSize: 16, fontWeight: 'bold' },
    searchName: { fontSize: 12, color: '#888' },
});
