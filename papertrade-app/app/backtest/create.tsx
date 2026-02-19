
import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { strategiesAPI } from '@/services/strategies';
import { stocksAPI } from '@/services/stocks';
import { backtestAPI } from '@/services/backtest';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function NewBacktestScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const insets = useSafeAreaInsets();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);

    // Data
    const [strategies, setStrategies] = useState<any[]>([]);
    const [stocks, setStocks] = useState<any[]>([]);
    const [sectors, setSectors] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    // UI State
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'search' | 'watchlist' | 'sector' | 'category'>('search');
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        strategy_id: '',
        is_system_strategy: false,
        scope_type: 'indices', // indices, stocks
        selection_ids: [] as number[],
        backend_selection_mode: 'stock',
        backend_context_id: '' as string | number,
        criteria_type: 'direction',
        magnitude_threshold: 50,
        start_date: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        pnl_enabled: false,
        initial_wallet: '100000',
        trade_strategy: 're_entry'
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [resSys, resUser, resStocks, resCats] = await Promise.all([
                strategiesAPI.getAll(),
                strategiesAPI.getRuleBased(),
                stocksAPI.getAll({ page_size: 2000 }),
                stocksAPI.getCategories()
            ]);

            const sysStrats = (resSys.data.data.results || resSys.data.data || []).map((s: any) => ({ ...s, is_system: true }));
            const linkedRuleIds = sysStrats.map((s: any) => s.rule_based_strategy).filter(Boolean);
            const userStrats = (resUser.data.data.results || resUser.data.data || [])
                .filter((s: any) => !linkedRuleIds.includes(s.id))
                .map((s: any) => ({ ...s, is_system: false }));

            setStrategies([...sysStrats, ...userStrats]);
            setStocks(resStocks.data.data.stocks || resStocks.data.data.results || []);
            setCategories(resCats.data.data || []);
            // Sectors usually come from a different endpoint or embedded in stocks, 
            // but for now we'll simulate or skip if no endpoint available in mobile service
            // strict implementation would need sectorsAPI.getAll()

        } catch (e) {
            Alert.alert("Error", "Failed to load initial data");
            console.error(e);
        } finally {
            setInitializing(false);
        }
    };

    // Helper: Filtered Stocks
    const filteredStocks = useMemo(() => {
        if (formData.scope_type === 'indices') {
            return stocks.filter(s => s.is_index);
        }

        if (activeTab === 'search') {
            if (!searchQuery) return [];
            return stocks.filter(s =>
                !s.is_index &&
                (s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    s.name.toLowerCase().includes(searchQuery.toLowerCase()))
            ).slice(0, 50);
        }
        if (activeTab === 'watchlist') {
            return stocks.filter(s => s.is_in_watchlist && !s.is_index);
        }
        // Sector/Category simplified for mobile (would need sector dropdown logic)
        return [];
    }, [stocks, formData.scope_type, activeTab, searchQuery]);

    const toggleSelection = (id: number) => {
        const exists = formData.selection_ids.includes(id);
        const newIds = exists
            ? formData.selection_ids.filter(x => x !== id)
            : [...formData.selection_ids, id];

        setFormData(prev => ({
            ...prev,
            selection_ids: newIds,
            backend_selection_mode: 'stock',
            backend_context_id: ''
        }));
    };

    const handleRun = async () => {
        if (!formData.strategy_id) return Alert.alert("Error", "Select a strategy");
        if (formData.selection_ids.length === 0) return Alert.alert("Error", "Select at least one stock/index");

        setLoading(true);
        try {
            const selectedStrat = strategies.find(s => s.id === Number(formData.strategy_id));
            if (!selectedStrat) throw new Error("Strategy not found");

            const payload: any = {
                selection_mode: formData.scope_type === 'indices' ? 'stock' : formData.backend_selection_mode,
                criteria_type: formData.criteria_type,
                magnitude_threshold: formData.criteria_type === 'magnitude' ? formData.magnitude_threshold : undefined,
                start_date: formData.start_date,
                end_date: formData.end_date,
                initial_wallet: formData.pnl_enabled ? Number(formData.initial_wallet) : 0,
                trade_strategy: formData.pnl_enabled ? formData.trade_strategy : null,
                selection_config: { ids: formData.selection_ids }
            };

            if (selectedStrat.is_system) {
                payload.strategy_id = selectedStrat.id;
            } else {
                payload.strategy_rule_based = selectedStrat.id;
            }

            await backtestAPI.run(payload);
            Alert.alert("Success", "Backtest started successfully", [
                { text: "OK", onPress: () => router.back() }
            ]);
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to start backtest");
        } finally {
            setLoading(false);
        }
    };

    if (initializing) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={colors.tint} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.customHeader}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="arrow-left" size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>New Backtest</Text>
                <View style={{ width: 20 }} />
            </View>

            {/* Steps Indicator */}
            <View style={styles.stepsRow}>
                {[1, 2, 3].map(i => (
                    <View key={i} style={[styles.stepDot, step >= i && { backgroundColor: colors.tint }]} />
                ))}
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>

                {/* STEP 1: STRATEGY */}
                {step === 1 && (
                    <View>
                        <Text style={[styles.heading, { color: colors.text }]}>Select Strategy</Text>

                        <Text style={styles.subHeading}>My Strategies</Text>
                        {strategies.filter(s => !s.is_system).map(s => (
                            <TouchableOpacity
                                key={s.id}
                                style={[styles.card, Number(formData.strategy_id) === s.id && styles.selectedCard, { borderColor: colors.border }]}
                                onPress={() => setFormData({ ...formData, strategy_id: s.id, is_system_strategy: false })}
                            >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View>
                                        <Text style={[styles.cardTitle, { color: colors.text }]}>{s.name}</Text>
                                        <Text style={styles.cardDesc}>{s.description || 'Custom Strategy'}</Text>
                                    </View>
                                    {Number(formData.strategy_id) === s.id && !formData.is_system_strategy && (
                                        <FontAwesome name="check-circle" size={24} color={colors.tint} />
                                    )}
                                </View>
                            </TouchableOpacity>
                        ))}

                        <Text style={styles.subHeading}>System Strategies</Text>
                        {strategies.filter(s => s.is_system).map(s => (
                            <TouchableOpacity
                                key={s.id}
                                style={[styles.card, Number(formData.strategy_id) === s.id && styles.selectedCard, { borderColor: colors.border }]}
                                onPress={() => setFormData({ ...formData, strategy_id: s.id, is_system_strategy: true })}
                            >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View>
                                        <Text style={[styles.cardTitle, { color: colors.text }]}>{s.name}</Text>
                                        <Text style={styles.cardDesc}>{s.type}</Text>
                                    </View>
                                    {Number(formData.strategy_id) === s.id && formData.is_system_strategy && (
                                        <FontAwesome name="check-circle" size={24} color={colors.tint} />
                                    )}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* STEP 2: SCOPE */}
                {step === 2 && (
                    <View>
                        <Text style={[styles.heading, { color: colors.text }]}>Select Scope</Text>

                        <View style={styles.tabRow}>
                            <TouchableOpacity
                                style={[styles.tab, formData.scope_type === 'indices' && styles.activeTab]}
                                onPress={() => setFormData({ ...formData, scope_type: 'indices', selection_ids: [] })}
                            >
                                <Text style={[styles.tabText, formData.scope_type === 'indices' && styles.activeTabText]}>Indices</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, formData.scope_type === 'stocks' && styles.activeTab]}
                                onPress={() => setFormData({ ...formData, scope_type: 'stocks', selection_ids: [] })}
                            >
                                <Text style={[styles.tabText, formData.scope_type === 'stocks' && styles.activeTabText]}>Stocks</Text>
                            </TouchableOpacity>
                        </View>

                        {formData.scope_type === 'stocks' && (
                            <View style={styles.searchContainer}>
                                <TextInput
                                    style={[styles.searchInput, { color: colors.text, borderColor: colors.border }]}
                                    placeholder="Search Stocks..."
                                    placeholderTextColor="#999"
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                            </View>
                        )}

                        <View style={styles.listContainer}>
                            {filteredStocks.map(item => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[styles.stockItem, { borderBottomColor: colors.border }]}
                                    onPress={() => toggleSelection(item.id)}
                                >
                                    <View>
                                        <Text style={[styles.stockSymbol, { color: colors.text }]}>{item.symbol}</Text>
                                        <Text style={styles.stockName}>{item.name}</Text>
                                    </View>
                                    {formData.selection_ids.includes(item.id) && (
                                        <FontAwesome name="check-circle" size={20} color={colors.tint} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.selectionCount}>{formData.selection_ids.length} Selected</Text>
                    </View>
                )}

                {/* STEP 3: CONFIGURE */}
                {step === 3 && (
                    <View>
                        <Text style={[styles.heading, { color: colors.text }]}>Configuration</Text>

                        <Text style={[styles.label, { color: colors.text }]}>Date Range</Text>
                        <View style={styles.row}>
                            <TouchableOpacity onPress={() => setShowStartPicker(true)} style={[styles.dateBtn, { borderColor: colors.border }]}>
                                <Text style={{ color: colors.text }}>Start: {formData.start_date}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowEndPicker(true)} style={[styles.dateBtn, { borderColor: colors.border }]}>
                                <Text style={{ color: colors.text }}>End: {formData.end_date}</Text>
                            </TouchableOpacity>
                        </View>

                        {showStartPicker && (
                            <DateTimePicker
                                value={new Date(formData.start_date)}
                                mode="date"
                                display="default"
                                onChange={(event, date) => {
                                    setShowStartPicker(false);
                                    if (date) setFormData({ ...formData, start_date: date.toISOString().split('T')[0] });
                                }}
                            />
                        )}
                        {showEndPicker && (
                            <DateTimePicker
                                value={new Date(formData.end_date)}
                                mode="date"
                                display="default"
                                onChange={(event, date) => {
                                    setShowEndPicker(false);
                                    if (date) setFormData({ ...formData, end_date: date.toISOString().split('T')[0] });
                                }}
                            />
                        )}

                        <Text style={[styles.label, { color: colors.text, marginTop: 20 }]}>PnL Tracking</Text>
                        <View style={styles.row}>
                            <Text style={{ color: colors.text, flex: 1 }}>Enable PnL</Text>
                            <TouchableOpacity onPress={() => setFormData({ ...formData, pnl_enabled: !formData.pnl_enabled })}>
                                <FontAwesome name={formData.pnl_enabled ? "toggle-on" : "toggle-off"} size={30} color={formData.pnl_enabled ? colors.tint : "#ccc"} />
                            </TouchableOpacity>
                        </View>

                        {formData.pnl_enabled && (
                            <View style={styles.pnlContainer}>
                                <Text style={[styles.label, { fontSize: 12 }]}>Initial Wallet (₹)</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                                    value={formData.initial_wallet}
                                    onChangeText={v => setFormData({ ...formData, initial_wallet: v })}
                                    keyboardType="numeric"
                                />
                            </View>
                        )}

                    </View>
                )}

            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 16) }]}>
                {step > 1 && (
                    <TouchableOpacity onPress={() => setStep(step - 1)} style={styles.backBtn}>
                        <Text style={{ color: '#666' }}>Back</Text>
                    </TouchableOpacity>
                )}

                {step < 3 ? (
                    <TouchableOpacity
                        onPress={() => {
                            if (step === 1 && !formData.strategy_id) return Alert.alert("Select a strategy");
                            if (step === 2 && formData.selection_ids.length === 0) return Alert.alert("Select at least one item");
                            setStep(step + 1);
                        }}
                        style={[styles.nextBtn, { backgroundColor: colors.tint }]}
                    >
                        <Text style={styles.btnText}>Next</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        onPress={handleRun}
                        disabled={loading}
                        style={[styles.nextBtn, { backgroundColor: colors.tint, opacity: loading ? 0.7 : 1 }]}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Run Backtest</Text>}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { justifyContent: 'center', alignItems: 'center' },
    customHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    stepsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, padding: 16 },
    stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ddd' },
    scroll: { padding: 16, paddingBottom: 100 },
    heading: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    subHeading: { fontSize: 14, fontWeight: 'bold', color: '#888', marginTop: 16, marginBottom: 8, textTransform: 'uppercase' },
    card: { padding: 16, borderWidth: 1, borderRadius: 12, marginBottom: 10 },
    selectedCard: { borderColor: '#000', borderWidth: 2, backgroundColor: '#f9f9f9' },
    cardTitle: { fontSize: 16, fontWeight: 'bold' },
    cardDesc: { fontSize: 12, color: '#666', marginTop: 4 },

    tabRow: { flexDirection: 'row', backgroundColor: '#eee', borderRadius: 8, padding: 4, marginBottom: 16 },
    tab: { flex: 1, padding: 10, borderRadius: 6, alignItems: 'center' },
    activeTab: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2 },
    tabText: { fontWeight: '600', color: '#666' },
    activeTabText: { color: '#000' },

    searchContainer: { marginBottom: 10 },
    searchInput: { borderWidth: 1, borderRadius: 8, padding: 10 },
    listContainer: { maxHeight: 400 },
    stockItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1 },
    stockSymbol: { fontWeight: 'bold' },
    stockName: { fontSize: 12, color: '#666' },
    selectionCount: { textAlign: 'center', marginTop: 10, color: '#666' },

    label: { fontWeight: '600', marginBottom: 8 },
    row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    dateBtn: { flex: 1, padding: 12, borderWidth: 1, borderRadius: 8, alignItems: 'center' },
    pnlContainer: { marginTop: 10, padding: 10, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 8 },
    input: { borderWidth: 1, borderRadius: 8, padding: 10, backgroundColor: '#fff' },

    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    backBtn: { padding: 10 },
    nextBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
    btnText: { color: '#fff', fontWeight: 'bold' }
});
