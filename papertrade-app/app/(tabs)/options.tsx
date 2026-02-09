import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, SafeAreaView, Alert, TouchableOpacity, ScrollView, Modal, TextInput, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { InstrumentSelector } from '@/components/InstrumentSelector';
import { ExpirySelector } from '@/components/ExpirySelector';
import { OptionChainTable, VisibleColumns } from '@/components/OptionChainTable';
import { optionsAPI, Instrument } from '@/services/options';
import { FontAwesome } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

type ViewMode = 'CE' | 'PE' | 'BOTH';

export default function TradeScreen() {
    const [instruments, setInstruments] = useState<Instrument[]>([]);
    const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
    const [selectedExpiry, setSelectedExpiry] = useState<string>('');
    const [viewMode, setViewMode] = useState<ViewMode>('BOTH');

    const [chainData, setChainData] = useState<any[]>([]);
    const [spotPrice, setSpotPrice] = useState<number>(0);

    const [loadingInstruments, setLoadingInstruments] = useState(false);
    const [loadingChain, setLoadingChain] = useState(false);

    // Advanced Filters
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [fromDate, setFromDate] = useState<Date | null>(null);
    const [toDate, setToDate] = useState<Date | null>(null);
    const [minStrike, setMinStrike] = useState('');
    const [maxStrike, setMaxStrike] = useState('');
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    // Column Filters
    const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>({
        oi: true,
        oiChange: true,
        volume: true,
        open: true,
        high: true,
        low: true,
        close: true,
        ltp: true,
        priceChange: false
    });

    // Fetch instruments on mount
    useEffect(() => {
        fetchInstruments();
    }, []);

    const toggleColumn = (key: keyof VisibleColumns) => {
        setVisibleColumns(prev => {
            const isCurrentlyActive = prev[key];
            const activeCount = Object.values(prev).filter(v => v).length;

            if (!isCurrentlyActive && viewMode === 'BOTH' && activeCount >= 4) {
                Alert.alert('Limit Reached', 'In BOTH mode, you can select up to 4 columns only to maintain readability.');
                return prev;
            }
            return { ...prev, [key]: !isCurrentlyActive };
        });
    };

    const handleViewModeChange = (mode: ViewMode) => {
        setViewMode(mode);
        if (mode === 'BOTH') {
            // Ensure we don't have more than 4 columns active when switching to BOTH
            setVisibleColumns(prev => {
                const activeKeys = (Object.keys(prev) as (keyof VisibleColumns)[]).filter(k => prev[k]);
                if (activeKeys.length > 4) {
                    const newVisible = { ...prev };
                    // Keep first 4, disable others
                    activeKeys.slice(4).forEach(k => { newVisible[k] = false; });
                    return newVisible;
                }
                return prev;
            });
        }
    };

    const fetchInstruments = async () => {
        setLoadingInstruments(true);
        try {
            const response = await optionsAPI.getInstruments();
            const list = response.data?.data || response.data || [];
            setInstruments(list);

            // Default to NIFTY (Index) if available
            const nifty = list.find((i: Instrument) => i.symbol === 'NIFTY' || i.symbol === 'NIFTY 50');
            if (nifty) {
                setSelectedInstrument(nifty);
            } else if (list.length > 0) {
                setSelectedInstrument(list[0]);
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to fetch instruments');
        } finally {
            setLoadingInstruments(false);
        }
    };

    const fetchOptionChain = async () => {
        if (!selectedInstrument || !selectedExpiry) return;

        setLoadingChain(true);
        try {
            const params: any = {
                symbol: selectedInstrument.symbol,
                expiry: selectedExpiry,
                type: viewMode
            };

            if (fromDate) params.from_date = fromDate.toISOString().split('T')[0];
            if (toDate) params.to_date = toDate.toISOString().split('T')[0];

            const response = await optionsAPI.getOptionChain(params);

            let data = response.data?.data || response.data || [];

            // Local filtering for strike range
            if (minStrike || maxStrike) {
                data = data.filter((item: any) => {
                    const strike = Number(item.strike_price);
                    const min = minStrike ? Number(minStrike) : 0;
                    const max = maxStrike ? Number(maxStrike) : Infinity;
                    return strike >= min && strike <= max;
                });
            }

            setChainData(data);

            // Calculate Spot Price from first record
            if (data.length > 0) {
                const spot = Number(data[0].underlying_value) || 0;
                setSpotPrice(spot);
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to fetch option chain');
        } finally {
            setLoadingChain(false);
        }
    };

    // Fetch chain when instrument, expiry or viewMode changes
    useEffect(() => {
        if (selectedInstrument && selectedExpiry) {
            fetchOptionChain();
        }
    }, [selectedInstrument, selectedExpiry, viewMode, fromDate, toDate]);

    // Reset expiry when instrument changes
    const handleInstrumentChange = (item: Instrument) => {
        setSelectedInstrument(item);
        setSelectedExpiry('');
        setChainData([]);
    };

    const clearFilters = () => {
        setFromDate(null);
        setToDate(null);
        setMinStrike('');
        setMaxStrike('');
        setViewMode('BOTH');
        setVisibleColumns({
            oi: true,
            oiChange: false,
            volume: false,
            open: false,
            high: false,
            low: false,
            close: false,
            ltp: true,
            priceChange: false
        });
        setIsFilterOpen(false);
    };

    const hasActiveFilters = fromDate || toDate || minStrike || maxStrike;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <Text style={styles.headerTitle}>Option Chain</Text>
                    <TouchableOpacity
                        style={styles.headerFilterBtn}
                        onPress={() => setIsFilterOpen(true)}
                    >
                        <FontAwesome name="sliders" size={18} color="#0a7ea4" />
                        <Text style={styles.headerFilterBtnText}>Filters</Text>
                        {hasActiveFilters && <View style={styles.badgeSmall} />}
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.controls}>
                <InstrumentSelector
                    label="Instrument"
                    value={selectedInstrument?.symbol || ''}
                    items={instruments}
                    onSelect={handleInstrumentChange}
                    loading={loadingInstruments}
                />

                {selectedInstrument && (
                    <ExpirySelector
                        symbol={selectedInstrument.symbol}
                        selectedExpiry={selectedExpiry}
                        onSelectExpiry={setSelectedExpiry}
                    />
                )}
            </View>

            <View style={styles.viewModeTabs}>
                {(['CE', 'BOTH', 'PE'] as ViewMode[]).map((mode) => (
                    <TouchableOpacity
                        key={mode}
                        style={[styles.modeTab, viewMode === mode && styles.modeTabActive]}
                        onPress={() => handleViewModeChange(mode)}
                    >
                        <Text style={[styles.modeTabText, viewMode === mode && styles.modeTabTextActive]}>{mode}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.content}>
                {loadingChain ? (
                    <ActivityIndicator size="large" color="#0a7ea4" style={{ marginTop: 50 }} />
                ) : (
                    <OptionChainTable
                        data={chainData}
                        spotPrice={spotPrice}
                        viewMode={viewMode}
                        visibleColumns={visibleColumns}
                    />
                )}
            </View>

            <View style={styles.fabContainer}>
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => setIsFilterOpen(true)}
                >
                    <FontAwesome name="filter" size={20} color="#fff" />
                    <Text style={styles.fabText}>More Filters</Text>
                    {hasActiveFilters && (
                        <View style={styles.badge} />
                    )}
                </TouchableOpacity>
            </View>

            {spotPrice > 0 && (
                <View style={styles.footer}>
                    <Text style={styles.spotText}>Spot Price: {spotPrice.toFixed(2)}</Text>
                </View>
            )}

            {/* Advanced Filters Modal */}
            <Modal
                visible={isFilterOpen}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsFilterOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Table Configuration</Text>
                            <TouchableOpacity onPress={() => setIsFilterOpen(false)}>
                                <FontAwesome name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <Text style={styles.sectionLabel}>Display Mode</Text>
                            <View style={styles.modalToggleWrapper}>
                                {(['CE', 'BOTH', 'PE'] as ViewMode[]).map((mode) => (
                                    <TouchableOpacity
                                        key={mode}
                                        style={[styles.modalToggleBtn, viewMode === mode && styles.modalToggleBtnActive]}
                                        onPress={() => handleViewModeChange(mode)}
                                    >
                                        <Text style={[styles.modalToggleText, viewMode === mode && styles.modalToggleTextActive]}>
                                            {mode}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionLabel}>Table Columns</Text>
                                {viewMode === 'BOTH' && (
                                    <Text style={styles.limitNote}>(Max 4 for BOTH mode)</Text>
                                )}
                            </View>
                            <View style={styles.columnGrid}>
                                {(Object.keys(visibleColumns) as (keyof VisibleColumns)[]).map((col) => (
                                    <TouchableOpacity
                                        key={col}
                                        style={[styles.columnItem, visibleColumns[col] && styles.columnItemActive]}
                                        onPress={() => toggleColumn(col)}
                                    >
                                        <FontAwesome
                                            name={visibleColumns[col] ? "check-square" : "square-o"}
                                            size={16}
                                            color={visibleColumns[col] ? "#0a7ea4" : "#999"}
                                        />
                                        <Text style={[styles.columnText, visibleColumns[col] && styles.columnTextActive]}>
                                            {col === 'priceChange' ? 'PRICE CHG' : col.toUpperCase().replace('CHANGE', ' CHG')}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.sectionLabel}>Historic Data (Optional)</Text>
                            <View style={styles.dateRow}>
                                <TouchableOpacity
                                    style={styles.dateInput}
                                    onPress={() => setShowStartPicker(true)}
                                >
                                    <Text style={styles.dateLabel}>FROM</Text>
                                    <Text style={styles.dateValue}>{fromDate ? fromDate.toLocaleDateString() : 'Select Start'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.dateInput}
                                    onPress={() => setShowEndPicker(true)}
                                >
                                    <Text style={styles.dateLabel}>TO</Text>
                                    <Text style={styles.dateValue}>{toDate ? toDate.toLocaleDateString() : 'Select End'}</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.sectionLabel}>Strike Price Range</Text>
                            <View style={styles.inputRow}>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>MIN STRIKE</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="0"
                                        keyboardType="numeric"
                                        value={minStrike}
                                        onChangeText={setMinStrike}
                                    />
                                </View>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>MAX STRIKE</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="100000"
                                        keyboardType="numeric"
                                        value={maxStrike}
                                        onChangeText={setMaxStrike}
                                    />
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
                                <Text style={styles.clearBtnText}>Clear All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.applyBtn} onPress={() => setIsFilterOpen(false)}>
                                <Text style={styles.applyBtnText}>Apply Filters</Text>
                            </TouchableOpacity>
                        </View>

                        {showStartPicker && (
                            <DateTimePicker
                                value={fromDate || new Date()}
                                mode="date"
                                onChange={(e, d) => {
                                    setShowStartPicker(Platform.OS === 'ios');
                                    if (d) setFromDate(d);
                                }}
                            />
                        )}
                        {showEndPicker && (
                            <DateTimePicker
                                value={toDate || new Date()}
                                mode="date"
                                onChange={(e, d) => {
                                    setShowEndPicker(Platform.OS === 'ios');
                                    if (d) setToDate(d);
                                }}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: '#fff',
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    headerFilterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f8fa',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#0a7ea422',
        position: 'relative',
    },
    headerFilterBtnText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#0a7ea4',
        marginLeft: 6,
    },
    badgeSmall: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ff4444',
        borderWidth: 1,
        borderColor: '#fff',
    },
    controls: {
        padding: 15,
        paddingBottom: 0,
    },
    viewModeTabs: {
        flexDirection: 'row',
        backgroundColor: '#f1f3f5',
        marginHorizontal: 15,
        marginBottom: 10,
        borderRadius: 10,
        padding: 4,
    },
    modeTab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
    },
    modeTabActive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    modeTabText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#888',
    },
    modeTabTextActive: {
        color: '#0a7ea4',
    },
    content: {
        flex: 1,
    },
    fabContainer: {
        position: 'absolute',
        bottom: 80,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 10,
    },
    fab: {
        backgroundColor: '#0a7ea4',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 30,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
    },
    fabText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 8,
        fontSize: 14,
    },
    badge: {
        position: 'absolute',
        top: -5,
        right: -5,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#ff4444',
        borderWidth: 2,
        borderColor: '#fff',
    },
    footer: {
        padding: 10,
        backgroundColor: '#f8f9fa',
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        alignItems: 'center'
    },
    spotText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#0a7ea4'
    },

    // Column Filter Styles
    columnGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 24,
    },
    columnItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#eee',
        minWidth: '30%',
    },
    columnItemActive: {
        backgroundColor: '#eef6f9',
        borderColor: '#0a7ea4',
    },
    columnText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#666',
        marginLeft: 6,
    },
    columnTextActive: {
        color: '#0a7ea4',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        maxHeight: '85%',
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalBody: {
        padding: 20,
    },
    modalToggleWrapper: {
        flexDirection: 'row',
        backgroundColor: '#f1f3f5',
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
    },
    modalToggleBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    modalToggleBtnActive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    modalToggleText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#888',
    },
    modalToggleTextActive: {
        color: '#0a7ea4',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#999',
        textTransform: 'uppercase',
    },
    limitNote: {
        fontSize: 10,
        color: '#ff4444',
        fontWeight: 'bold',
    },
    dateRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    dateInput: {
        flex: 1,
        height: 50,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        paddingHorizontal: 15,
        justifyContent: 'center',
        backgroundColor: '#f9f9f9',
    },
    dateLabel: {
        fontSize: 9,
        color: '#999',
        fontWeight: 'bold',
    },
    dateValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#333',
    },
    inputRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    inputContainer: {
        flex: 1,
    },
    inputLabel: {
        fontSize: 10,
        color: '#999',
        fontWeight: 'bold',
        marginBottom: 4,
    },
    textInput: {
        height: 50,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        paddingHorizontal: 15,
        fontSize: 15,
        backgroundColor: '#f9f9f9',
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    clearBtn: {
        flex: 1,
        height: 50,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
    },
    clearBtnText: {
        fontWeight: 'bold',
        color: '#666',
    },
    applyBtn: {
        flex: 2,
        height: 50,
        backgroundColor: '#0a7ea4',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    applyBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    }
});
