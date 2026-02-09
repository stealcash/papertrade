import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { paymentsAPI, WalletTransaction } from '@/services/wallet';
import { authAPI } from '@/services/auth';
import { FontAwesome } from '@expo/vector-icons';

export default function WalletScreen() {
    const [balance, setBalance] = useState(0);
    const [history, setHistory] = useState<WalletTransaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [amount, setAmount] = useState('');
    const [refilling, setRefilling] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Get Balance
            const profileRes = await authAPI.profile();
            const profileData = profileRes.data?.data || profileRes.data;
            setBalance(Number(profileData.wallet_balance) || 0);

            // 2. Get History
            const histRes = await paymentsAPI.getRecords();
            const historyData = histRes.data?.data || histRes.data || [];
            setHistory(historyData);
        } catch (e) {
            console.error('Error fetching wallet data:', e);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const handleRefill = async () => {
        const val = parseFloat(amount);
        if (!val || val <= 0) {
            Alert.alert("Invalid Amount");
            return;
        }

        setRefilling(true);
        try {
            const res = await paymentsAPI.refillWallet(val);
            if (res.data?.status === 'success' || res.status === 200) {
                Alert.alert("Success", "Wallet refilled!");
                setAmount('');
                fetchData();
            } else {
                Alert.alert("Error", res.data?.message || "Refill failed");
            }
        } catch (e: any) {
            const status = e.response?.status;
            const msg = e.response?.data?.message || e.message || "Refill failed";
            Alert.alert(`Error (${status || 'N/A'})`, msg);
            console.error('Refill error details:', {
                status,
                data: e.response?.data,
                message: e.message
            });
        } finally {
            setRefilling(false);
        }
    };

    const renderItem = ({ item }: { item: WalletTransaction }) => (
        <View style={styles.item}>
            <View style={styles.iconContainer}>
                <FontAwesome
                    name={item.transaction_type === 'CREDIT' ? 'arrow-down' : 'arrow-up'}
                    size={16}
                    color={item.transaction_type === 'CREDIT' ? '#28a745' : '#dc3545'}
                />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.desc}>{item.description || 'Transaction'}</Text>
                <Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text>
            </View>
            <Text style={[styles.amount, item.transaction_type === 'CREDIT' ? styles.green : styles.red]}>
                {item.transaction_type === 'CREDIT' ? '+' : '-'}₹{Number(item.amount || 0).toFixed(2)}
            </Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Wallet', headerBackTitle: 'Profile' }} />

            <View style={styles.card}>
                <Text style={styles.label}>Total Balance</Text>
                <Text style={styles.balance}>₹{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>

                <View style={styles.refillRow}>
                    <TextInput
                        style={styles.input}
                        placeholder="Amount"
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                    />
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={handleRefill}
                        disabled={refilling}
                    >
                        {refilling ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.btnText}>Add Funds</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <Text style={styles.sectionTitle}>Transaction History</Text>

            <FlatList
                data={history}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.list}
                refreshing={loading}
                onRefresh={fetchData}
                ListEmptyComponent={<Text style={styles.empty}>No transactions yet.</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5', padding: 15 },
    card: {
        backgroundColor: '#0a7ea4', padding: 20, borderRadius: 12, marginBottom: 20,
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3
    },
    label: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
    balance: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginVertical: 10 },

    refillRow: { flexDirection: 'row', gap: 10 },
    input: {
        flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 10, fontSize: 16
    },
    addButton: {
        backgroundColor: '#005f7f', justifyContent: 'center', paddingHorizontal: 20, borderRadius: 8
    },
    btnText: { color: '#fff', fontWeight: 'bold' },

    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
    list: { paddingBottom: 20 },

    item: {
        backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10,
        flexDirection: 'row', alignItems: 'center',
    },
    iconContainer: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: '#f0f0f0',
        justifyContent: 'center', alignItems: 'center'
    },
    desc: { fontSize: 14, fontWeight: '600', color: '#333' },
    date: { fontSize: 12, color: '#999' },
    amount: { fontSize: 16, fontWeight: 'bold' },

    green: { color: '#28a745' },
    red: { color: '#dc3545' },
    empty: { textAlign: 'center', color: '#999', marginTop: 20 },
});
