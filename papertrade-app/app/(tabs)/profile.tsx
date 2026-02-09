import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { FontAwesome } from '@expo/vector-icons';
import { authAPI } from '@/services/auth';
import { subscriptionsAPI } from '@/services/subscriptions';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/Colors';

export default function ProfileScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const [user, setUser] = useState<any>(null);
    const [subscription, setSubscription] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        current_password: '',
        new_password: '',
        confirm_password: '',
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [profileRes, subRes] = await Promise.all([
                authAPI.profile(),
                subscriptionsAPI.getCurrent()
            ]);

            const userData = profileRes.data?.data || profileRes.data;
            setUser(userData);
            setSubscription(subRes.data?.data || subRes.data);

            setFormData(prev => ({
                ...prev,
                first_name: userData.first_name || '',
                last_name: userData.last_name || '',
                email: userData.email || '',
            }));

            await SecureStore.setItemAsync('userData', JSON.stringify(userData));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async () => {
        if (formData.new_password && formData.new_password !== formData.confirm_password) {
            Alert.alert("Error", "New passwords do not match");
            return;
        }

        setSaving(true);
        try {
            const data: any = {
                first_name: formData.first_name,
                last_name: formData.last_name,
                email: formData.email,
            };

            if (formData.new_password) {
                // Backend might require current_password or just new password
                // Web uses 'password' field for new password
                data.password = formData.new_password;
            }

            await authAPI.updateProfile(data);
            Alert.alert("Success", "Profile updated successfully");

            // Clear passwords
            setFormData(prev => ({
                ...prev,
                current_password: '',
                new_password: '',
                confirm_password: '',
            }));

            loadData(); // Refresh
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.message || "Failed to update profile";
            Alert.alert("Error", msg);
        } finally {
            setSaving(false);
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

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#0a7ea4" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Profile Settings', headerBackTitle: 'Back' }} />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{user?.first_name?.charAt(0) || user?.email?.charAt(0) || 'U'}</Text>
                    </View>
                    <Text style={styles.name}>{user?.first_name} {user?.last_name}</Text>
                    <Text style={styles.emailText}>{user?.email}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>{user?.role || 'Trader'}</Text>
                    </View>
                </View>

                {/* Personal Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Personal Information</Text>
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>First Name</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.first_name}
                            onChangeText={(val) => setFormData({ ...formData, first_name: val })}
                            placeholder="First Name"
                        />
                    </View>
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Last Name</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.last_name}
                            onChangeText={(val) => setFormData({ ...formData, last_name: val })}
                            placeholder="Last Name"
                        />
                    </View>
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Email Address</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.email}
                            onChangeText={(val) => setFormData({ ...formData, email: val })}
                            placeholder="Email"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>
                </View>

                {/* Change Password */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Security</Text>
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>New Password</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.new_password}
                            onChangeText={(val) => setFormData({ ...formData, new_password: val })}
                            placeholder="Leave blank to keep same"
                            secureTextEntry
                        />
                    </View>
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Confirm New Password</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.confirm_password}
                            onChangeText={(val) => setFormData({ ...formData, confirm_password: val })}
                            placeholder="Confirm New Password"
                            secureTextEntry
                        />
                    </View>
                </View>

                {/* Subscription Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Subscription</Text>
                    <View style={styles.subscriptionCard}>
                        <View style={styles.subInfo}>
                            <Text style={styles.planName}>{subscription?.plan?.name || 'No Active Plan'}</Text>
                            <Text style={[styles.subStatus, { color: (subscription?.is_active || subscription?.status === 'active') ? '#16a34a' : '#dc2626' }]}>
                                {(subscription?.is_active || subscription?.status === 'active') ? 'Active' : 'Inactive'} • {subscription?.end_date ? `Expires ${new Date(subscription.end_date).toLocaleDateString()}` : 'No expiry'}
                            </Text>

                            {subscription?.plan?.features && (
                                <View style={styles.subFeatures}>
                                    {Object.entries(subscription.plan.features).map(([key, config]: any) => {
                                        if (!config.enabled) return null;
                                        const label = key.replace(/_/g, ' ').toLowerCase();
                                        return (
                                            <View key={key} style={styles.subFeatureItem}>
                                                <FontAwesome name="check-circle" size={10} color="#10b981" />
                                                <Text style={styles.subFeatureText}>
                                                    <Text style={{ fontWeight: '600', textTransform: 'capitalize' }}>{label}</Text>
                                                    {config.limit > 0 ? `: ${config.limit}` : config.limit === -1 ? ': Unlimited' : ''}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                        <TouchableOpacity
                            style={styles.upgradeBtn}
                            onPress={() => router.push('/subscription')}
                        >
                            <Text style={styles.upgradeBtnText}>Upgrade</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.saveButton, saving && { opacity: 0.7 }]}
                        onPress={handleUpdateProfile}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <FontAwesome name="save" size={18} color="#fff" />
                                <Text style={styles.saveButtonText}>Save Changes</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Support & Legal Section */}
                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Support & Legal</Text>

                    <TouchableOpacity style={styles.menuItem} onPress={() => { }}>
                        <FontAwesome name="envelope-o" size={20} color={colors.text} style={styles.menuIcon} />
                        <Text style={[styles.menuText, { color: colors.text }]}>Contact Support</Text>
                        <FontAwesome name="angle-right" size={20} color={colors.tabIconDefault} />
                    </TouchableOpacity>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/privacy')}>
                        <FontAwesome name="lock" size={20} color={colors.text} style={styles.menuIcon} />
                        <Text style={[styles.menuText, { color: colors.text }]}>Privacy Policy</Text>
                        <FontAwesome name="angle-right" size={20} color={colors.tabIconDefault} />
                    </TouchableOpacity>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/terms')}>
                        <FontAwesome name="file-text-o" size={20} color={colors.text} style={styles.menuIcon} />
                        <Text style={[styles.menuText, { color: colors.text }]}>Terms of Service</Text>
                        <FontAwesome name="angle-right" size={20} color={colors.tabIconDefault} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={styles.version}>Version 1.2.0 (Stable)</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    header: {
        backgroundColor: '#fff',
        alignItems: 'center',
        paddingVertical: 30,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#0a7ea4',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatarText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        textTransform: 'uppercase',
    },
    name: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 4,
    },
    emailText: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 12,
    },
    roleBadge: {
        backgroundColor: '#eff6ff',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 16,
    },
    roleText: {
        color: '#2563eb',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
    },

    section: {
        marginTop: 20,
        backgroundColor: '#fff',
        padding: 20,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#f1f5f9',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 16,
    },
    formGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748b',
        marginBottom: 6,
    },
    input: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
        color: '#1e293b',
    },

    subscriptionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    subInfo: {
        flex: 1,
    },
    planName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    subStatus: {
        fontSize: 12,
        marginTop: 4,
    },
    upgradeBtn: {
        backgroundColor: '#0a7ea4',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    upgradeBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 13,
    },
    subFeatures: {
        marginTop: 12,
        gap: 6,
    },
    subFeatureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    subFeatureText: {
        fontSize: 11,
        color: '#475569',
    },

    actions: {
        padding: 20,
        gap: 12,
    },
    saveButton: {
        backgroundColor: '#1e293b',
        borderRadius: 8,
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    logoutButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ef4444',
        borderRadius: 8,
        padding: 15,
        alignItems: 'center',
    },
    logoutText: {
        color: '#ef4444',
        fontWeight: 'bold',
        fontSize: 16,
    },
    footer: {
        marginTop: 10,
        alignItems: 'center',
    },
    version: {
        color: '#94a3b8',
        fontSize: 11,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    menuIcon: {
        width: 24,
        marginRight: 12,
    },
    menuText: {
        flex: 1,
        fontSize: 16,
    },
    divider: {
        height: 1,
        marginVertical: 4,
        marginLeft: 36, // align with text
    },
});
