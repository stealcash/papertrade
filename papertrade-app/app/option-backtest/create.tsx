
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Platform, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { optionStrategiesAPI } from '@/services/option-strategies';
import { optionBacktestAPI } from '@/services/option-backtest';
import apiClient from '@/services/api';

export default function CreateBacktestScreen() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Data
    const [strategies, setStrategies] = useState<any[]>([]);
    const [stocks, setStocks] = useState<any[]>([]);
    const [indices, setIndices] = useState<any[]>([]);

    // Form State
    const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
    const [underlyingType, setUnderlyingType] = useState<'index' | 'stock'>('index');
    const [underlyingSymbol, setUnderlyingSymbol] = useState('');
    const [lotSize, setLotSize] = useState('50');
    const [startDate, setStartDate] = useState(new Date(new Date().setMonth(new Date().getMonth() - 1))); // 1 month ago
    const [endDate, setEndDate] = useState(new Date());

    // Date Pickers
    const [showStartDate, setShowStartDate] = useState(false);
    const [showEndDate, setShowEndDate] = useState(false);

    // Defaults
    const lotSizeDefaults: Record<string, number> = {
        'NIFTY50': 50,
        'NIFTY': 50,
        'BANKNIFTY': 25,
        'FINNIFTY': 40,
        'MIDCPNIFTY': 75,
    };

    // Tabs
    const [activeTab, setActiveTab] = useState<'my' | 'system'>('my');

    const filteredStrategies = strategies.filter(s => {
        const isSystem = s.is_system || s.name.toLowerCase().startsWith('system'); // Fallback if is_system not present
        return activeTab === 'system' ? isSystem : !isSystem;
    });

    useEffect(() => {
        fetchStrategies();
        fetchIndices();
        fetchStocks();
    }, []);

    const fetchStrategies = async () => {
        try {
            const res = await optionStrategiesAPI.getAll();
            const list = res.data?.data?.results || res.data?.data || [];
            setStrategies(Array.isArray(list) ? list : []);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchIndices = async () => {
        try {
            const res = await apiClient.get('/stocks/?is_index=true&is_option_enable=true');
            const list = res.data?.data?.stocks || res.data?.data?.results || [];
            setIndices(list);
            if (list.length > 0 && !underlyingSymbol) {
                setUnderlyingSymbol(list[0].symbol);
                setLotSize(String(lotSizeDefaults[list[0].symbol] || 50));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchStocks = async () => {
        try {
            const res = await apiClient.get('/stocks/?is_index=false&is_option_enable=true&page_size=200');
            const list = res.data?.data?.stocks || res.data?.data?.results || [];
            setStocks(list);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSymbolChange = (symbol: string) => {
        setUnderlyingSymbol(symbol);
        if (lotSizeDefaults[symbol]) {
            setLotSize(String(lotSizeDefaults[symbol]));
        } else if (underlyingType === 'stock') {
            setLotSize('1'); // Default for stocks if unknown
        }
    };

    const handleSubmit = async () => {
        if (!selectedStrategyId) {
            Alert.alert("Error", "Please select a strategy");
            return;
        }
        if (!underlyingSymbol) {
            Alert.alert("Error", "Please select an underlying asset");
            return;
        }

        setLoading(true);
        try {
            await optionBacktestAPI.run({
                strategy_id: Number(selectedStrategyId),
                underlying_symbol: underlyingSymbol,
                lot_size: parseInt(lotSize) || 50,
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0],
            });
            Alert.alert("Success", "Backtest started successfully", [
                { text: "OK", onPress: () => router.replace('/option-backtest') }
            ]);
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.message || "Failed to start backtest";
            Alert.alert("Error", typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setLoading(false);
        }
    };

    const renderStrategyItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.strategyCard, selectedStrategyId === String(item.id) && styles.selectedStrategy]}
            onPress={() => setSelectedStrategyId(String(item.id))}
        >
            <View style={styles.strategyRow}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.strategyName}>{item.name}</Text>
                    <Text style={styles.strategyDesc} numberOfLines={2}>{item.description || 'No description'}</Text>
                </View>
                {selectedStrategyId === String(item.id) && (
                    <View style={styles.checkIcon}>
                        <FontAwesome name="check" size={12} color="#fff" />
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => step === 1 ? router.back() : setStep(1)} style={styles.backBtn}>
                    <FontAwesome name="arrow-left" size={20} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Backtest</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.stepIndicator}>
                <View style={[styles.stepDot, step >= 1 && styles.stepActive]} />
                <View style={[styles.stepLine, step >= 2 && styles.stepActive]} />
                <View style={[styles.stepDot, step >= 2 && styles.stepActive]} />
            </View>
            <Text style={styles.stepText}>Step {step}: {step === 1 ? 'Select Strategy' : 'Configuration'}</Text>

            {step === 1 ? (
                <View style={styles.content}>
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'my' && styles.activeTab]}
                            onPress={() => setActiveTab('my')}
                        >
                            <Text style={[styles.tabText, activeTab === 'my' && styles.activeTabText]}>My Strategies</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'system' && styles.activeTab]}
                            onPress={() => setActiveTab('system')}
                        >
                            <Text style={[styles.tabText, activeTab === 'system' && styles.activeTabText]}>System Strategies</Text>
                        </TouchableOpacity>
                    </View>

                    {strategies.length === 0 ? (
                        <View style={styles.center}>
                            <ActivityIndicator size="large" color="#0a7ea4" />
                        </View>
                    ) : (
                        <ScrollView contentContainerStyle={styles.scrollContent}>
                            <Text style={styles.sectionTitle}>
                                {activeTab === 'my' ? 'My Custom Strategies' : 'Pre-built System Strategies'}
                            </Text>
                            {filteredStrategies.length === 0 ? (
                                <Text style={styles.emptyText}>No strategies found.</Text>
                            ) : (
                                filteredStrategies.map(item => (
                                    <View key={item.id}>
                                        {renderStrategyItem({ item })}
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    )}

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.btn, !selectedStrategyId && styles.btnDisabled]}
                            disabled={!selectedStrategyId}
                            onPress={() => setStep(2)}
                        >
                            <Text style={styles.btnText}>Next</Text>
                            <FontAwesome name="arrow-right" size={16} color="#fff" style={{ marginLeft: 8 }} />
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <View style={styles.content}>
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <View style={styles.card}>
                            <Text style={styles.label}>Underlying Asset</Text>
                            <View style={styles.segmentContainer}>
                                <TouchableOpacity
                                    style={[styles.segment, underlyingType === 'index' && styles.segmentActive]}
                                    onPress={() => { setUnderlyingType('index'); setUnderlyingSymbol(indices[0]?.symbol || ''); }}
                                >
                                    <Text style={[styles.segmentText, underlyingType === 'index' && styles.segmentTextActive]}>Index</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.segment, underlyingType === 'stock' && styles.segmentActive]}
                                    onPress={() => { setUnderlyingType('stock'); setUnderlyingSymbol(stocks[0]?.symbol || ''); }}
                                >
                                    <Text style={[styles.segmentText, underlyingType === 'stock' && styles.segmentTextActive]}>Stock</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={underlyingSymbol}
                                    onValueChange={handleSymbolChange}
                                    style={Platform.OS === 'ios' ? { height: 200 } : { height: 50, width: '100%' }}
                                    itemStyle={{ fontSize: 14, height: 120 }}
                                >
                                    {(underlyingType === 'index' ? indices : stocks).map(asset => (
                                        <Picker.Item key={asset.id} label={`${asset.symbol} ${asset.name ? `- ${asset.name}` : ''}`} value={asset.symbol} />
                                    ))}
                                </Picker>
                            </View>
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.label}>Lot Size</Text>
                            <TextInput
                                style={styles.input}
                                value={lotSize}
                                onChangeText={setLotSize}
                                keyboardType="numeric"
                            />
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.label}>Date Range</Text>

                            <TouchableOpacity style={styles.dateRow} onPress={() => setShowStartDate(true)}>
                                <Text style={styles.dateLabel}>Start Date</Text>
                                <Text style={styles.dateValue}>{startDate.toLocaleDateString()}</Text>
                                <FontAwesome name="calendar" size={16} color="#666" />
                            </TouchableOpacity>

                            <View style={styles.divider} />

                            <TouchableOpacity style={styles.dateRow} onPress={() => setShowEndDate(true)}>
                                <Text style={styles.dateLabel}>End Date</Text>
                                <Text style={styles.dateValue}>{endDate.toLocaleDateString()}</Text>
                                <FontAwesome name="calendar" size={16} color="#666" />
                            </TouchableOpacity>

                            {/* Date Pickers */}
                            {showStartDate && (
                                <DateTimePicker
                                    value={startDate}
                                    mode="date"
                                    display="default"
                                    onChange={(event, date) => {
                                        setShowStartDate(false);
                                        if (date) setStartDate(date);
                                    }}
                                />
                            )}
                            {showEndDate && (
                                <DateTimePicker
                                    value={endDate}
                                    mode="date"
                                    display="default"
                                    onChange={(event, date) => {
                                        setShowEndDate(false);
                                        if (date) setEndDate(date);
                                    }}
                                />
                            )}
                        </View>
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.btn, loading && styles.btnDisabled]}
                            disabled={loading}
                            onPress={handleSubmit}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.btnText}>Run Backtest</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
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
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    stepIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        marginBottom: 8,
    },
    stepDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#ddd',
    },
    stepLine: {
        width: 40,
        height: 2,
        backgroundColor: '#ddd',
        marginHorizontal: 4,
    },
    stepActive: {
        backgroundColor: '#0a7ea4',
    },
    stepText: {
        textAlign: 'center',
        fontSize: 12,
        color: '#666',
        marginBottom: 16,
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    strategyCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#eee',
    },
    selectedStrategy: {
        borderColor: '#0a7ea4',
        backgroundColor: '#f0f9ff',
    },
    strategyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    strategyName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    strategyDesc: {
        fontSize: 12,
        color: '#666',
    },
    checkIcon: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#0a7ea4',
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#666',
        marginBottom: 12,
    },
    segmentContainer: {
        flexDirection: 'row',
        backgroundColor: '#f1f3f5',
        borderRadius: 8,
        padding: 4,
        marginBottom: 12,
    },
    segment: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
    },
    segmentActive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
    },
    segmentText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    segmentTextActive: {
        color: '#0a7ea4',
        fontWeight: 'bold',
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 8,
        backgroundColor: '#f9f9f9',
        overflow: 'hidden',
    },
    input: {
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#f9f9f9',
        color: '#333',
    },
    dateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    divider: {
        height: 1,
        backgroundColor: '#f0f0f0',
    },
    dateLabel: {
        fontSize: 14,
        color: '#333',
    },
    dateValue: {
        fontSize: 16,
        fontWeight: '500',
        color: '#0a7ea4',
        marginRight: 8,
    },
    footer: {
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    btn: {
        backgroundColor: '#0a7ea4',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
        borderRadius: 12,
    },
    btnDisabled: {
        backgroundColor: '#a5d8eb',
    },
    btnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 8,
        gap: 12,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#0a7ea4',
    },
    tabText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
    },
    activeTabText: {
        color: '#0a7ea4',
        fontWeight: 'bold',
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        fontSize: 14,
        marginTop: 20,
    }
});
