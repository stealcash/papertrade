import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { optionStrategiesAPI } from '@/services/option-strategies';
import { SafeAreaView } from 'react-native-safe-area-context';

interface StrategyLeg {
    id: number;
    type: 'CE' | 'PE';
    action: 'BUY' | 'SELL';
    strike_price?: number;
    expiry_date?: string;
    option_type?: string; // fallback
    transaction_type?: string; // fallback
}

interface OptionStrategyDetail {
    id: number;
    name: string;
    description: string;
    created_at: string;
    legs: StrategyLeg[];
}

export default function OptionStrategyDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [strategy, setStrategy] = useState<OptionStrategyDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDetail();
    }, [id]);

    const fetchDetail = async () => {
        try {
            const response = await optionStrategiesAPI.get(id as string);
            const data = response.data?.data || response.data;
            setStrategy(data);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to fetch strategy details');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
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
                            await optionStrategiesAPI.delete(id as string);
                            router.back();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete strategy');
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0a7ea4" />
            </View>
        );
    }

    if (!strategy) {
        return (
            <View style={styles.center}>
                <Text>Strategy not found</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <FontAwesome name="arrow-left" size={20} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Strategy Details</Text>
                <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
                    <FontAwesome name="trash" size={20} color="#ef4444" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.title}>{strategy.name}</Text>
                    <Text style={styles.description}>{strategy.description || 'No description'}</Text>
                    <Text style={styles.date}>Created: {new Date(strategy.created_at).toLocaleDateString()}</Text>
                </View>

                <Text style={styles.sectionTitle}>Legs ({strategy.legs?.length || 0})</Text>

                {strategy.legs && strategy.legs.map((leg, index) => (
                    <View key={index} style={styles.legCard}>
                        <View style={[styles.badge, leg.action === 'BUY' ? styles.buyBadge : styles.sellBadge]}>
                            <Text style={[styles.badgeText, leg.action === 'BUY' ? styles.buyText : styles.sellText]}>
                                {leg.action || leg.transaction_type}
                            </Text>
                        </View>
                        <View style={styles.legInfo}>
                            <Text style={styles.strikeText}>
                                {leg.strike_price} {leg.type || leg.option_type}
                            </Text>
                            <Text style={styles.expiryText}>{leg.expiry_date}</Text>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    deleteBtn: { padding: 8 },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    content: {
        padding: 16,
    },
    card: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    description: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 12,
    },
    date: {
        fontSize: 12,
        color: '#999',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#333',
        marginLeft: 4,
    },
    legCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#eee',
    },
    legInfo: {
        marginLeft: 16,
    },
    strikeText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    expiryText: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        minWidth: 50,
        alignItems: 'center',
    },
    buyBadge: {
        backgroundColor: '#dcfce7',
    },
    sellBadge: {
        backgroundColor: '#fee2e2',
    },
    badgeText: {
        fontWeight: 'bold',
        fontSize: 12,
    },
    buyText: { color: '#166534' },
    sellText: { color: '#991b1b' },
});
