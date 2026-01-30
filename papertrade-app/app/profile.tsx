import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { FontAwesome } from '@expo/vector-icons';
import apiClient from '@/services/api';

export default function ProfileScreen() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const userData = await SecureStore.getItemAsync('userData');
            if (userData) {
                setUser(JSON.parse(userData));
            }
            // Refresh
            const res = await apiClient.get('auth/profile');
            setUser(res.data.data);
            await SecureStore.setItemAsync('userData', JSON.stringify(res.data.data));
        } catch (e) {
            console.error(e);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to logout?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Logout",
                    style: 'destructive',
                    onPress: async () => {
                        await SecureStore.deleteItemAsync('authToken');
                        await SecureStore.deleteItemAsync('userData');
                        router.replace('/login');
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Profile', headerBackTitle: 'Back' }} />

            <ScrollView>
                <View style={styles.header}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
                    </View>
                    <Text style={styles.name}>{user?.name || 'User'}</Text>
                    <Text style={styles.email}>{user?.email || 'user@example.com'}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>{user?.role || 'Trader'}</Text>
                    </View>
                </View>

                <View style={styles.menu}>
                    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/wallet')}>
                        <View style={styles.menuIcon}>
                            <FontAwesome name="google-wallet" size={20} color="#0a7ea4" />
                        </View>
                        <Text style={styles.menuText}>Wallet</Text>
                        <FontAwesome name="angle-right" size={20} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Coming Soon', 'Strategies feature is coming soon!')}>
                        <View style={styles.menuIcon}>
                            <FontAwesome name="bolt" size={20} color="#0a7ea4" />
                        </View>
                        <Text style={styles.menuText}>Strategies</Text>
                        <FontAwesome name="angle-right" size={20} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Coming Soon', 'Backtest feature is coming soon!')}>
                        <View style={styles.menuIcon}>
                            <FontAwesome name="flask" size={20} color="#0a7ea4" />
                        </View>
                        <Text style={styles.menuText}>Backtest</Text>
                        <FontAwesome name="angle-right" size={20} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Coming Soon', 'Analysis feature is coming soon!')}>
                        <View style={styles.menuIcon}>
                            <FontAwesome name="bar-chart" size={20} color="#0a7ea4" />
                        </View>
                        <Text style={styles.menuText}>Market Analysis</Text>
                        <FontAwesome name="angle-right" size={20} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Coming Soon', 'Scanner feature is coming soon!')}>
                        <View style={styles.menuIcon}>
                            <FontAwesome name="search" size={20} color="#0a7ea4" />
                        </View>
                        <Text style={styles.menuText}>Scanner</Text>
                        <FontAwesome name="angle-right" size={20} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={styles.menuIcon}>
                            <FontAwesome name="user" size={20} color="#0a7ea4" />
                        </View>
                        <Text style={styles.menuText}>Edit Profile</Text>
                        <FontAwesome name="angle-right" size={20} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={styles.menuIcon}>
                            <FontAwesome name="cog" size={20} color="#0a7ea4" />
                        </View>
                        <Text style={styles.menuText}>Settings</Text>
                        <FontAwesome name="angle-right" size={20} color="#ccc" />
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>
                    <Text style={styles.version}>Version 1.1.0</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#fff',
        alignItems: 'center',
        paddingVertical: 40,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#0a7ea4',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
    },
    name: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    email: {
        fontSize: 14,
        color: '#666',
        marginBottom: 10,
    },
    roleBadge: {
        backgroundColor: '#eef2ff',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    roleText: {
        color: '#4f46e5',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
    },

    menu: {
        marginTop: 20,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#eee',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f9f9f9',
    },
    menuIcon: {
        width: 30,
        alignItems: 'center',
        marginRight: 10,
    },
    menuText: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },

    footer: {
        padding: 20,
        marginTop: 20,
    },
    logoutButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ff4444',
        borderRadius: 8,
        padding: 15,
        alignItems: 'center',
        marginBottom: 20,
    },
    logoutText: {
        color: '#ff4444',
        fontWeight: 'bold',
        fontSize: 16,
    },
    version: {
        textAlign: 'center',
        color: '#999',
        fontSize: 12,
    },
});
