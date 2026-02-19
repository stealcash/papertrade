import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, Modal } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

interface ExpirySelectorProps {
    years: number[];
    expiries: string[];
    selectedYear: number | null;
    selectedExpiry: string;
    onSelectYear: (year: number) => void;
    onSelectExpiry: (expiry: string) => void;
    loadingYears?: boolean;
    loadingExpiries?: boolean;
}

export function ExpirySelector({
    years,
    expiries,
    selectedYear,
    selectedExpiry,
    onSelectYear,
    onSelectExpiry,
    loadingYears,
    loadingExpiries
}: ExpirySelectorProps) {
    // Modal State
    const [modalType, setModalType] = useState<'YEAR' | 'EXPIRY' | null>(null);

    return (
        <View style={styles.container}>
            {/* Year Selector */}
            <View style={styles.field}>
                <Text style={styles.label}>Year</Text>
                <TouchableOpacity
                    style={styles.selector}
                    onPress={() => setModalType('YEAR')}
                    disabled={loadingYears}
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
                    disabled={loadingExpiries}
                >
                    <Text style={styles.value}>{selectedExpiry || 'Select Expiry'}</Text>
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

                        <FlatList<string | number>
                            data={modalType === 'YEAR' ? years : expiries}
                            keyExtractor={(item) => String(item)}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.item}
                                    onPress={() => {
                                        if (modalType === 'YEAR') {
                                            onSelectYear(Number(item));
                                        } else {
                                            onSelectExpiry(String(item));
                                        }
                                        setModalType(null);
                                    }}
                                >
                                    <Text style={styles.itemText}>{item}</Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <Text style={styles.emptyText}>No items available</Text>
                            }
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
        justifyContent: 'center',
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
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        padding: 20,
    }
});
