import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { notificationsAPI, Notification } from '@/services/notifications';
import { useFocusEffect } from 'expo-router';

export default function NotificationsScreen() {
    const colorScheme = useColorScheme();
    const router = useRouter();
    const colors = Colors[colorScheme ?? 'light'];
    const [refreshing, setRefreshing] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        try {
            const res = await notificationsAPI.getAll();
            const data = res.data?.data || res.data || [];
            setNotifications(data);
        } catch (e) {
            console.error('Error fetching notifications:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchNotifications();
        }, [])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchNotifications();
    }, []);

    const getTypeColor = (type: Notification['type']) => {
        switch (type) {
            case 'success': return '#10b981';
            case 'error': return '#ef4444';
            case 'warning': return '#f59e0b';
            default: return colors.tint;
        }
    };

    const getTypeIcon = (type: Notification['type']) => {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    };

    return (
        <>
            <Stack.Screen options={{ title: 'Notifications', headerShown: true }} />
            <ScrollView
                style={[styles.container, { backgroundColor: colors.background }]}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
                }
            >
                <View style={styles.content}>
                    {notifications.map((notification) => (
                        <TouchableOpacity
                            key={notification.id}
                            style={[
                                styles.notificationCard,
                                {
                                    backgroundColor: notification.is_read ? colors.background : colors.card,
                                    borderColor: colors.border,
                                }
                            ]}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: getTypeColor(notification.type) + '20' }]}>
                                <FontAwesome
                                    name={getTypeIcon(notification.type) as any}
                                    size={20}
                                    color={getTypeColor(notification.type)}
                                />
                            </View>
                            <View style={styles.notificationContent}>
                                <Text style={[styles.notificationTitle, { color: colors.text }]}>
                                    {notification.title}
                                </Text>
                                <Text style={[styles.notificationMessage, { color: colors.tabIconDefault }]}>
                                    {notification.message}
                                </Text>
                                <Text style={[styles.notificationTime, { color: colors.tabIconDefault }]}>
                                    {new Date(notification.created_at).toLocaleString()}
                                </Text>
                            </View>
                            {!notification.is_read && <View style={[styles.unreadBadge, { backgroundColor: colors.tint }]} />}
                        </TouchableOpacity>
                    ))}

                    {notifications.length === 0 && (
                        <View style={styles.emptyState}>
                            <FontAwesome name="bell-o" size={48} color={colors.tabIconDefault} />
                            <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
                                No notifications
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 16,
    },
    notificationCard: {
        flexDirection: 'row',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 10,
        position: 'relative',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    notificationContent: {
        flex: 1,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    notificationMessage: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 4,
    },
    notificationTime: {
        fontSize: 12,
    },
    unreadBadge: {
        position: 'absolute',
        top: 14,
        right: 14,
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 12,
    },
});
