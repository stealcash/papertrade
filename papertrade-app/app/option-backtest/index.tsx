
import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { optionBacktestAPI, OptionBacktestRun } from '@/services/option-backtest';

export default function OptionBacktestScreen() {
    const router = useRouter();
    const [runs, setRuns] = useState<OptionBacktestRun[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchRuns = async () => {
        try {
            const response = await optionBacktestAPI.getAll();
            const list = response.data?.data?.results || response.data?.data || [];
            setRuns(Array.isArray(list) ? list : []);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to fetch backtest runs');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchRuns();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchRuns();
    };

    const handleDelete = (id: number) => {
        Alert.alert(
            'Delete Backtest',
            'Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await optionBacktestAPI.delete(id);
                            fetchRuns();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete backtest');
                        }
                    }
                }
            ]
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return '#dcfce7'; // green-100
            case 'failed': return '#fee2e2'; // red-100
            case 'running': return '#dbeafe'; // blue-100
            default: return '#f3f4f6'; // gray-100
        }
    };

    const getStatusTextColor = (status: string) => {
        switch (status) {
            case 'completed': return '#166534'; // green-800
            case 'failed': return '#991b1b'; // red-800
            case 'running': return '#1e40af'; // blue-800
            default: return '#374151'; // gray-700
        }
    };

    const renderItem = ({ item }: { item: OptionBacktestRun }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/option-backtest/${item.id}` as any)}
        >
            <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                    <Text style={styles.cardTitle}>{item.run_id}</Text>
                    <Text style={styles.strategyName} numberOfLines={1}>{item.strategy_name}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={[styles.badgeText, { color: getStatusTextColor(item.status) }]}>
                        {item.status.toUpperCase()}
                    </Text>
                </View>
            </View>

            <View style={styles.cardBody}>
                <View style={styles.row}>
                    <Text style={styles.label}>Symbol:</Text>
                    <Text style={styles.value}>{item.underlying_symbol}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Win Rate:</Text>
                    <Text style={[styles.value, {
                        color: parseFloat(item.win_rate) >= 50 ? 'green' : 'red',
                        fontWeight: 'bold'
                    }]}>
                        {item.win_rate}%
                    </Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Trades:</Text>
                    <Text style={styles.value}>{item.total_trades}</Text>
                </View>
            </View>

            <View style={styles.cardFooter}>
                <Text style={styles.dateText}>
                    {new Date(item.created_at).toLocaleDateString()}
                </Text>
                <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleDelete(item.id); }}>
                    <FontAwesome name="trash" size={16} color="#ef4444" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <FontAwesome name="arrow-left" size={20} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Option Backtests</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#0a7ea4" />
                </View>
            ) : (
                <FlatList
                    data={runs}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <FontAwesome name="history" size={48} color="#ccc" />
                            <Text style={styles.emptyText}>No backtests found</Text>
                            <Text style={styles.emptySubText}>Run a backtest to see results here</Text>
                        </View>
                    }
                />
            )}

            <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push('/option-backtest/create')}
            >
                <FontAwesome name="plus" size={20} color="#fff" />
            </TouchableOpacity>
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
    listContent: {
        padding: 16,
        paddingBottom: 80,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    headerLeft: {
        flex: 1,
        marginRight: 8,
    },
    cardTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#666',
        marginBottom: 4,
    },
    strategyName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    cardBody: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
        backgroundColor: '#f9fafb',
        padding: 8,
        borderRadius: 8,
    },
    row: {
        alignItems: 'center',
    },
    label: {
        fontSize: 10,
        color: '#666',
        marginBottom: 2,
    },
    value: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    dateText: {
        fontSize: 12,
        color: '#999',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
        padding: 20,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#666',
        marginTop: 16,
    },
    emptySubText: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        marginTop: 8,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#0a7ea4',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
    },
});
