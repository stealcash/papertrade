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
                            : 'Manage and view trading strategies.'}
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
                            {/* Corner Accent */}
                            <View style={[styles.cornerAccent, { backgroundColor: activeTab === 'my' ? '#eff6ff' : '#fffbeb' }]}>
                                <View style={[styles.cornerCurve, { backgroundColor: colors.card }]} />
                            </View>

                            <View style={styles.strategyHeader}>
                                <View style={styles.strategyInfo}>
                                    <Text style={[styles.strategyName, { color: colors.text }]}>{strategy.name || strategy.code}</Text>
                                    <Text style={[styles.strategyDescription, { color: colors.tabIconDefault }]} numberOfLines={3}>
                                        {strategy.description || 'No description available.'}
                                    </Text>
                                </View>
                            </View>

                            <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                                {activeTab === 'my' ? (
                                    <>
                                        <View style={[styles.badge, { backgroundColor: '#eff6ff' }]}>
                                            <Text style={[styles.badgeText, { color: '#1d4ed8' }]}>User Created</Text>
                                        </View>

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
                                    </>
                                ) : (
                                    <>
                                        <View style={[styles.badge, { backgroundColor: '#fffbeb' }]}>
                                            <Text style={[styles.badgeText, { color: '#b45309' }]}>System</Text>
                                        </View>

                                        <View style={styles.viewLink}>
                                            <Text style={[styles.viewLinkText, { color: '#d97706' }]}>View</Text>
                                            <FontAwesome name="arrow-right" size={12} color="#d97706" />
                                        </View>
                                    </>
                                )}
                            </View>
                        </TouchableOpacity>
                    ))}

                    {!loading && strategies.length === 0 && (
                        <View style={styles.emptyState}>
                            <FontAwesome name="flash" size={48} color={colors.tabIconDefault} />
                            <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
                                {activeTab === 'my' ? "You haven't created any strategies yet." : "No system strategies available."}
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
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
        overflow: 'hidden',
        position: 'relative',
    },
    cornerAccent: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 48,
        height: 48,
    },
    cornerCurve: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: 48,
        height: 48,
        borderTopRightRadius: 12, // Match card radius - DOES NOT WORK WELL WITH ABSOLUTE, BETTER TO USE BORDER RADIUS ON PARENT
    },
    strategyHeader: {
        padding: 16,
        paddingBottom: 8,
    },
    strategyInfo: {
        flex: 1,
    },
    strategyName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        zIndex: 10,
    },
    strategyDescription: {
        fontSize: 14,
        lineHeight: 20,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        marginTop: 8,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '500',
    },
    viewLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    viewLinkText: {
        fontSize: 14,
        fontWeight: '500',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    editButton: {
        padding: 6,
        backgroundColor: '#eff6ff', // Light Blue
        borderRadius: 8,
    },
    deleteButton: {
        padding: 6,
        backgroundColor: '#fef2f2', // Light Red
        borderRadius: 8,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 12,
        textAlign: 'center',
    },
});
