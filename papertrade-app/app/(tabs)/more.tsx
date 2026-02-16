import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function MoreScreen() {
    const colorScheme = useColorScheme();
    const router = useRouter();
    const colors = Colors[colorScheme ?? 'light'];

    const menuItems = [
        { title: 'Market', icon: 'line-chart', route: '/market', description: 'Browse all markets' },
        { title: 'Scanner', icon: 'search', route: '/scanner', description: 'Advanced stock scanner' },
        { title: 'Stock Finder', icon: 'binoculars', route: '/stock-finder', description: 'Find high-potential stocks' },
        { title: 'Compare Charts', icon: 'line-chart', route: '/compare-charts', description: 'Compare historical stock data' },
        { title: 'Trade History', icon: 'history', route: '/trade-history', description: 'Your trade transaction history' },
        { title: 'Options', icon: 'exchange', route: '/options', description: 'Options trading chain' },
        { title: 'Analysis', icon: 'bar-chart', route: '/market-analysis', description: 'Market technical analysis' },
        { title: 'Backtest', icon: 'flask', route: '/backtest', description: 'Test your strategies' },
        { title: 'Wallet', icon: 'credit-card', route: '/wallet', description: 'Wallet records & refill' },
        { title: 'Notifications', icon: 'bell', route: '/notifications', description: 'Recent alerts & signals' },
        { title: 'Strategies', icon: 'flash', route: '/strategies', description: 'Master trading strategies' },
    ];

    return (
        <>
            <Stack.Screen options={{ title: 'More', headerShown: true }} />
            <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.section}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[styles.menuItem, { borderBottomColor: colors.border }]}
                            onPress={() => router.push(item.route as any)}
                        >
                            <View style={styles.menuItemLeft}>
                                <View style={[styles.iconContainer]}>
                                    <FontAwesome name={item.icon as any} size={22} color={colors.tint} />
                                </View>
                                <View style={styles.menuItemText}>
                                    <Text style={[styles.menuItemTitle, { color: colors.text }]}>{item.title}</Text>
                                    <Text style={[styles.menuItemDescription, { color: colors.tabIconDefault }]}>
                                        {item.description}
                                    </Text>
                                </View>
                            </View>
                            <FontAwesome name="chevron-right" size={16} color={colors.tabIconDefault} />
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    menuItemText: {
        flex: 1,
    },
    menuItemTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    menuItemDescription: {
        fontSize: 13,
    },
});
