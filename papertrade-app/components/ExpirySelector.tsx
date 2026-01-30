import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, FlatList, Modal } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { optionsApi } from '@/services/options';

interface ExpirySelectorProps {
    symbol: string;
    selectedExpiry: string;
    onSelectExpiry: (expiry: string) => void;
}

export function ExpirySelector({ symbol, selectedExpiry, onSelectExpiry }: ExpirySelectorProps) {
    const [years, setYears] = useState<number[]>([]);
    const [expiries, setExpiries] = useState<string[]>([]);

    const [selectedYear, setSelectedYear] = useState<number | null>(null);

    const [loadingYears, setLoadingYears] = useState(false);
    const [loadingExpiries, setLoadingExpiries] = useState(false);

    // Modal State
    const [modalType, setModalType] = useState<'YEAR' | 'EXPIRY' | null>(null);

    useEffect(() => {
        if (symbol) {
            fetchYears();
        }
    }, [symbol]);

    useEffect(() => {
        if (symbol && selectedYear) {
            fetchExpiries(selectedYear);
        }
    }, [symbol, selectedYear]);

    const fetchYears = async () => {
        setLoadingYears(true);
        try {
            // API currently requires symbol to fetch available years
            // Using a fallback current year if API is empty/fails for now to allow progress
            const data = await optionsApi.getYears(symbol);
            const yearList = data?.data || [];
            if (yearList.length > 0) {
                setYears(yearList);
                setSelectedYear(yearList[0]); // Default to first (usually current)
            } else {
                // Fallback
                const currentYear = new Date().getFullYear();
                setYears([currentYear, currentYear + 1]);
                setSelectedYear(currentYear);
            }
        } catch (e) {
            console.error(e);
            // Fallback
            const currentYear = new Date().getFullYear();
            setYears([currentYear, currentYear + 1]);
            setSelectedYear(currentYear);
        } finally {
            setLoadingYears(false);
        }
    };

    const fetchExpiries = async (year: number) => {
        setLoadingExpiries(true);
        try {
            const data = await optionsApi.getExpiries(symbol, year.toString());
            const expiryList = data?.data || [];
            setExpiries(expiryList);
            if (expiryList.length > 0 && !selectedExpiry) {
                // Auto-select nearest? Let parent handle or user select.
                onSelectExpiry(expiryList[0]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingExpiries(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Year Selector */}
            <View style={styles.field}>
                <Text style={styles.label}>Year</Text>
                <TouchableOpacity
                    style={styles.selector}
                    onPress={() => setModalType('YEAR')}
                >
                    <Text style={styles.value}>{selectedYear || 'Select'}</Text>
                    <FontAwesome name="calendar" size={14} color="#666" />
                </TouchableOpacity>
            </View>

            {/* Expiry Selector */}
            <View style={[styles.field, { flex: 2, marginLeft: 10 }]}>
                <Text style={styles.label}>Expiry</Text>
                <TouchableOpacity
                    style={styles.selector}
                    onPress={() => setModalType('EXPIRY')}
                >
                    {loadingExpiries ? (
                        <ActivityIndicator size="small" color="#000" />
                    ) : (
                        <Text style={styles.value}>{selectedExpiry || 'Select Expiry'}</Text>
                    )}
                    <FontAwesome name="chevron-down" size={14} color="#666" />
                </TouchableOpacity>
            </View>

            {/* Modal for Selection */}
            <Modal
                visible={!!modalType}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalType(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                Select {modalType === 'YEAR' ? 'Year' : 'Expiry Date'}
                            </Text>
                            <TouchableOpacity onPress={() => setModalType(null)}>
                                <FontAwesome name="close" size={20} />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={modalType === 'YEAR' ? years : expiries}
                            keyExtractor={(item) => String(item)}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.item}
                                    onPress={() => {
                                        if (modalType === 'YEAR') {
                                            setSelectedYear(Number(item));
                                        } else {
                                            onSelectExpiry(String(item));
                                        }
                                        setModalType(null);
                                    }}
                                >
                                    <Text style={styles.itemText}>{item}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        marginBottom: 15,
    },
    field: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        color: '#666',
        marginBottom: 5,
        fontWeight: '600',
    },
    selector: {
        height: 45,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
    },
    value: {
        fontSize: 14,
        color: '#333',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center', // Center for smaller list
        padding: 40,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        maxHeight: 400,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        borderBottomWidth: 1,
        paddingBottom: 10,
        borderColor: '#eee'
    },
    modalTitle: {
        fontWeight: 'bold',
        fontSize: 16
    },
    item: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f9f9f9',
    },
    itemText: {
        fontSize: 16,
    }
});
