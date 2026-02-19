import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function MoreScreen() {
    const colorScheme = useColorScheme();
    const router = useRouter();
    const colors = Colors[colorScheme ?? 'light'];

    const menuItems = [
        { title: 'Market', icon: 'line-chart', route: '/market', description: 'Browse all markets', color: '#3b82f6', bg: '#eff6ff' },
        { title: 'Compare Charts', icon: 'area-chart', route: '/compare-charts', description: 'Compare historical stock data', color: '#8b5cf6', bg: '#f5f3ff' },
        { title: 'Scanner', icon: 'crosshairs', route: '/scanner', description: 'Scan market signals', color: '#06b6d4', bg: '#ecfeff', strategy: true },
        { title: 'Multi Strategy Scanner', icon: 'search', route: '/stock-finder', description: 'Find stocks across strategies', color: '#f59e0b', bg: '#fffbeb', strategy: true },
        { title: 'Strategy Analysis', icon: 'bar-chart', route: '/market-analysis', description: 'Market technical analysis', color: '#10b981', bg: '#ecfdf5', strategy: true },
        { title: 'Strategies', icon: 'compass', route: '/strategies', description: 'Master trading strategies', color: '#6366f1', bg: '#eef2ff', strategy: true },
        { title: 'Backtest', icon: 'flask', route: '/backtest', description: 'Test your strategies', color: '#ec4899', bg: '#fdf2f8', strategy: true },
        { title: 'Options', icon: 'bolt', route: '/options', description: 'Options trading chain', color: '#f97316', bg: '#fff7ed', isOption: true },
        { title: 'Option Strategies', icon: 'clone', route: '/option-strategies', description: 'Custom & System Strategies', color: '#8b5cf6', bg: '#f5f3ff', isOption: true },
        { title: 'Option Backtest', icon: 'flask', route: '/option-backtest', description: 'Backtest option strategies', color: '#ec4899', bg: '#fdf2f8', isOption: true },

        { title: 'Pattern Finder', icon: 'search', route: '/pattern-finder', description: 'Find similar historical price patterns', color: '#3b82f6', bg: '#eff6ff' },

        { title: 'Wallet', icon: 'credit-card', route: '/wallet', description: 'Wallet records & refill', color: '#14b8a6', bg: '#f0fdfa' },
        { title: 'Notifications', icon: 'bell', route: '/notifications', description: 'Recent alerts & signals', color: '#ef4444', bg: '#fef2f2' },
    ];

    const getRowBackground = (item: any) => {
        if (item.isOption) return '#eff6ff'; // Light blue for options
        if (item.strategy) return '#fffef2'; // Light yellow for strategies
        return undefined;
    };

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.section}>
                        {menuItems.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.menuItem,
                                    {
                                        borderBottomColor: colors.border,
                                        backgroundColor: getRowBackground(item)
                                    }
                                ]}
                                onPress={() => router.push(item.route as any)}
                            >
                                <View style={styles.menuItemLeft}>
                                    <View style={[styles.iconContainer, { backgroundColor: item.bg }]}>
                                        <FontAwesome name={item.icon as any} size={18} color={item.color} />
                                    </View>
                                    <View style={styles.menuItemText}>
                                        <Text style={[styles.menuItemTitle, { color: colors.text }]}>{item.title}</Text>
                                        <Text style={[styles.menuItemDescription, { color: colors.tabIconDefault }]}>
                                            {item.description}
                                        </Text>
                                    </View>
                                </View>
                                <FontAwesome name="chevron-right" size={14} color={colors.tabIconDefault} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingVertical: 0,
        paddingBottom: 20,
    },
    section: {
        paddingHorizontal: 0, // Full width for backgrounds
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16, // Content padding
        borderBottomWidth: 1,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 38,
        height: 38,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    menuItemText: {
        flex: 1,
    },
    menuItemTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    menuItemDescription: {
        fontSize: 12,
    },
});
