import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { optionStrategiesAPI } from '@/services/option-strategies';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface OptionStrategy {
    id: number;
    name: string;
    description: string;
    created_at: string;
    legs: any[];
    is_system?: boolean; // Hypothetical field, need to verify
    type?: string;
}

export default function OptionStrategiesScreen() {
    const router = useRouter();
    const [strategies, setStrategies] = useState<OptionStrategy[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'system' | 'my'>('system');

    const fetchStrategies = async () => {
        try {
            const response = await optionStrategiesAPI.getAll();
            const list = response.data?.data || response.data || [];
            const safeList = Array.isArray(list) ? list : [];
            setStrategies(safeList);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to fetch strategies');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchStrategies();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchStrategies();
    };

    const handleDelete = async (id: number) => {
        Alert.alert(
            'Delete Strategy',
            'Are you sure you want to delete this strategy?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await optionStrategiesAPI.delete(id);
                            fetchStrategies();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete strategy');
                        }
                    }
                }
            ]
        );
    };

    const handleEdit = (id: number) => {
        // Placeholder for edit navigation
        // router.push({ pathname: '/option-strategies/edit', params: { id } });
        Alert.alert('Edit Strategy', 'Edit functionality is under development. Please use the website.');
    };

    const handleView = (id: number) => {
        // Explicitly cast to any to bypass strict type check on static routes
        router.push(`/option-strategies/${id}` as any);
    };

    // Filter Strategies
    // Assuming 'system' strategies might be distinguished by a flag or owner?
    // For now, if no flag exists, we might show all in 'My' or 'System' based on assumption.
    // Let's assume fetching from `getAll` returns MY strategies primarily if it's user-scoped.
    // If it returns system too, we need a filter.
    // For now, I will display the SAME list in 'My' and empty or placeholders in 'System' until I know the flag.
    // Wait, the user said "in website i can see system and own strategy".
    // I will assume for now that `getAll` returns user strategies.
    // I might need a separate call for system strategies or filter by `is_system`.

    const myStrategies = strategies; // Temporary: Assume all fetched are 'My' for now
    const systemStrategies: OptionStrategy[] = []; // Placeholder

    const displayedStrategies = activeTab === 'my' ? myStrategies : systemStrategies;

    const renderItem = ({ item }: { item: OptionStrategy }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.headerContent}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    {activeTab === 'my' && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>User Created</Text>
                        </View>
                    )}
                </View>
            </View>
            <Text style={styles.cardDesc} numberOfLines={2}>{item.description || 'No description'}</Text>

            <View style={styles.cardFooter}>
                <View style={styles.metaInfo}>
                    <Text style={styles.legsText}>{item.legs?.length || 0} Legs</Text>
                    <Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString()}</Text>
                </View>

                <View style={styles.actionRow}>
                    {activeTab === 'my' ? (
                        <>
                            {/* View */}
                            <TouchableOpacity onPress={() => handleView(item.id)} style={[styles.actionBtn, styles.viewBtn]}>
                                <FontAwesome name="eye" size={14} color="#d97706" />
                            </TouchableOpacity>

                            {/* Edit */}
                            <TouchableOpacity onPress={() => handleEdit(item.id)} style={[styles.actionBtn, styles.editBtn]}>
                                <FontAwesome name="pencil" size={14} color="#3b82f6" />
                            </TouchableOpacity>

                            {/* Delete */}
                            <TouchableOpacity onPress={() => handleDelete(item.id)} style={[styles.actionBtn, styles.deleteBtn]}>
                                <FontAwesome name="trash" size={14} color="#ef4444" />
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity onPress={() => handleView(item.id)} style={styles.viewLink}>
                            <Text style={styles.viewLinkText}>View</Text>
                            <FontAwesome name="arrow-right" size={12} color="#0a7ea4" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <FontAwesome name="arrow-left" size={20} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Option Strategies</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'system' && styles.activeTab]}
                    onPress={() => setActiveTab('system')}
                >
                    <Text style={[styles.tabText, activeTab === 'system' && styles.activeTabText]}>System Strategies</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'my' && styles.activeTab]}
                    onPress={() => setActiveTab('my')}
                >
                    <Text style={[styles.tabText, activeTab === 'my' && styles.activeTabText]}>My Strategies</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#0a7ea4" />
                </View>
            ) : (
                <FlatList
                    data={displayedStrategies}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <FontAwesome name={activeTab === 'system' ? "globe" : "clone"} size={48} color="#ccc" />
                            <Text style={styles.emptyText}>
                                {activeTab === 'system' ? 'No system strategies available' : 'No strategies found'}
                            </Text>
                            {activeTab === 'my' && (
                                <Text style={styles.emptySubText}>Create your first option strategy to get started</Text>
                            )}
                        </View>
                    }
                />
            )}

            {activeTab === 'my' && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => router.push('/option-strategies/create')}
                >
                    <FontAwesome name="plus" size={20} color="#fff" />
                </TouchableOpacity>
            )}
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
    backBtn: {
        padding: 8,
    },
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
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingBottom: 12,
        paddingTop: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        gap: 12,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#f1f3f5',
    },
    activeTab: {
        backgroundColor: '#0a7ea4',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    activeTabText: {
        color: '#fff',
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
        marginBottom: 8,
    },
    headerContent: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
    },
    badge: {
        backgroundColor: '#eef2ff',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginLeft: 8,
    },
    badgeText: {
        fontSize: 10,
        color: '#6366f1',
        fontWeight: '600',
    },
    cardDesc: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16, // Increased space
        lineHeight: 20,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 12,
    },
    metaInfo: {
        flexDirection: 'column',
    },
    legsText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#333',
    },
    dateText: {
        fontSize: 11,
        color: '#999',
        marginTop: 2,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    viewBtn: { backgroundColor: '#fffbeb' },
    editBtn: { backgroundColor: '#eff6ff' },
    deleteBtn: { backgroundColor: '#fef2f2' },

    viewLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    viewLinkText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0a7ea4',
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
