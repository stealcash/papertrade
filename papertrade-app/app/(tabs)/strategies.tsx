import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import apiClient from '@/services/api';
import { strategiesAPI } from '@/services/strategies';
import { subscriptionsAPI } from '@/services/subscriptions';

interface Strategy {
    id: number;
    name: string;
    code?: string;
    description: string;
    type: string;
    status: 'active' | 'inactive';
    performance?: number;
}

export default function StrategiesScreen() {
    const colorScheme = useColorScheme();
    const router = useRouter();
    const colors = Colors[colorScheme ?? 'light'];
    const [refreshing, setRefreshing] = useState(false);
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'system' | 'my'>('system');
    const [subscription, setSubscription] = useState<any>(null);

    const fetchStrategies = async () => {
        setLoading(true);
        try {
            let res;
            if (activeTab === 'system') {
                res = await strategiesAPI.getAll();
            } else {
                res = await strategiesAPI.getRuleBased();
            }

            const data = res.data?.data || res.data || [];
            if (activeTab === 'my') {
                setStrategies(Array.isArray(data) ? data : []);
            } else {
                // Filter system strategies: MANUAL type without rule_based_strategy
                const filtered = Array.isArray(data)
                    ? data.filter((s: any) => s.type === 'MANUAL' && !s.rule_based_strategy)
                    : [];
                setStrategies(filtered);
            }
        } catch (e) {
            console.error('Error fetching strategies:', e);
            setStrategies([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchSubscription = async () => {
        try {
            const res = await subscriptionsAPI.getCurrent();
            setSubscription(res.data?.data || res.data);
        } catch (error) {
            console.log("Failed to fetch subscription");
        }
    };

    useEffect(() => {
        fetchStrategies();
        fetchSubscription();
    }, [activeTab]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchStrategies();
        fetchSubscription();
    }, [activeTab]);

    const handleDelete = (id: number) => {
        Alert.alert(
            "Delete Strategy",
            "Are you sure you want to delete this strategy? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await strategiesAPI.deleteRuleBased(id);
                            fetchStrategies();
                        } catch (e) {
                            Alert.alert("Error", "Failed to delete strategy");
                        }
                    }
                }
            ]
        );
    };

    const UsageIndicator = () => {
        if (!subscription) return null;

        const limit = subscription.plan?.features?.STRATEGY_CREATE?.limit || 0;
        const used = subscription.usage?.STRATEGY_CREATE || 0;
        const unlimited = limit === -1;

        return (
            <View style={styles.usageContainer}>
                <Text style={styles.usageText}>
                    Strategies: <Text style={{ fontWeight: 'bold' }}>{used}</Text> / {unlimited ? '∞' : limit}
                </Text>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ title: 'Strategies', headerShown: true }} />

            <View style={styles.headerContainer}>
                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'system' && styles.activeTab, { borderColor: colors.tint }]}
                        onPress={() => setActiveTab('system')}
                    >
                        <Text style={[styles.tabText, activeTab === 'system' && styles.activeTabText, { color: activeTab === 'system' ? '#fff' : colors.text }]}>System Strategies</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'my' && styles.activeTab, { borderColor: colors.tint }]}
                        onPress={() => setActiveTab('my')}
                    >
                        <Text style={[styles.tabText, activeTab === 'my' && styles.activeTabText, { color: activeTab === 'my' ? '#fff' : colors.text }]}>My Strategies</Text>
                    </TouchableOpacity>
                </View>
                {activeTab === 'my' && <UsageIndicator />}
            </View>

            <ScrollView
                style={styles.container}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
                }
            >
                <View style={styles.content}>
                    <Text style={[styles.title, { color: colors.text }]}>
                        {activeTab === 'system' ? 'System Strategies' : 'My Strategies'}
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
                        {activeTab === 'system'
                            ? 'Explore expert strategies'
                            : 'Manage your custom strategies'}
                    </Text>

                    {activeTab === 'my' && (
                        <TouchableOpacity
                            style={[styles.createButton, { backgroundColor: colors.tint }]}
                            onPress={() => router.push('/strategies/create' as any)}
                        >
                            <FontAwesome name="plus" size={16} color="#fff" />
                            <Text style={styles.createButtonText}>Create New Strategy</Text>
                        </TouchableOpacity>
                    )}

                    {loading ? (
                        <View style={styles.emptyState}>
                            <ActivityIndicator color={colors.tint} />
                            <Text style={{ color: colors.tabIconDefault, marginTop: 10 }}>Loading...</Text>
                        </View>
                    ) : strategies.map((strategy) => (
                        <TouchableOpacity
                            key={strategy.id}
                            style={[styles.strategyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={() => {
                                if (activeTab === 'system') {
                                    router.push({ pathname: `/strategies/${strategy.id}`, params: { isCustom: 'false' } } as any);
                                }
                            }}
                            activeOpacity={activeTab === 'system' ? 0.7 : 1}
                        >
                            <View style={styles.strategyHeader}>
                                <View style={styles.strategyInfo}>
                                    <Text style={[styles.strategyName, { color: colors.text }]}>{strategy.name || strategy.code}</Text>
                                    <Text style={[styles.strategyType, { color: colors.tabIconDefault }]}>
                                        {strategy.type || 'Rule Based'}
                                    </Text>
                                </View>
                                {activeTab === 'my' ? (
                                    <View style={styles.actionButtons}>
                                        <TouchableOpacity
                                            style={styles.editButton}
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                router.push({ pathname: '/strategies/edit', params: { id: strategy.id } } as any);
                                            }}
                                        >
                                            <FontAwesome name="pencil" size={16} color="#3b82f6" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.deleteButton}
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                handleDelete(strategy.id);
                                            }}
                                        >
                                            <FontAwesome name="trash" size={16} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={[
                                        styles.statusBadge,
                                        { backgroundColor: strategy.status === 'active' || !strategy.status ? '#10b981' : '#6b7280' }
                                    ]}>
                                        <Text style={styles.statusText}>
                                            {strategy.status === 'active' || !strategy.status ? 'Active' : 'Inactive'}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <Text style={[styles.strategyDescription, { color: colors.tabIconDefault }]} numberOfLines={2}>
                                {strategy.description || 'No description available.'}
                            </Text>

                            {strategy.performance !== undefined && (
                                <View style={styles.performanceContainer}>
                                    <FontAwesome
                                        name={strategy.performance >= 0 ? 'arrow-up' : 'arrow-down'}
                                        size={14}
                                        color={strategy.performance >= 0 ? '#10b981' : '#ef4444'}
                                    />
                                    <Text
                                        style={[
                                            styles.performanceText,
                                            { color: strategy.performance >= 0 ? '#10b981' : '#ef4444' }
                                        ]}
                                    >
                                        {strategy.performance > 0 ? '+' : ''}{strategy.performance}%
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}

                    {!loading && strategies.length === 0 && (
                        <View style={styles.emptyState}>
                            <FontAwesome name="flash" size={48} color={colors.tabIconDefault} />
                            <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
                                No strategies found
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerContainer: {
        paddingTop: 16,
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingBottom: 0,
        gap: 12,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    activeTab: {
        backgroundColor: '#007AFF', // Will be overridden by dynamic color tint
        borderColor: 'transparent',
    },
    tabText: {
        fontWeight: '600',
        fontSize: 14,
    },
    activeTabText: {
        color: '#fff',
    },
    usageContainer: {
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    usageText: {
        fontSize: 12,
        color: '#666',
        backgroundColor: '#f3f4f6',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        overflow: 'hidden'
    },
    content: {
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        marginBottom: 20,
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        gap: 8,
    },
    createButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    strategyCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
    },
    strategyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    strategyInfo: {
        flex: 1,
        paddingRight: 10,
    },
    strategyName: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    strategyType: {
        fontSize: 12,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '600',
    },
    deleteButton: {
        padding: 8,
        backgroundColor: '#fee2e2',
        borderRadius: 8,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    editButton: {
        padding: 8,
        backgroundColor: '#dbeafe',
        borderRadius: 8,
    },
    strategyDescription: {
        fontSize: 14,
        marginBottom: 12,
        lineHeight: 20,
    },
    performanceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    performanceText: {
        fontSize: 14,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 12,
    },
});
