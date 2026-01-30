import React from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Instrument } from '@/services/options';

// A simple reusable dropdown selector
interface SelectorProps {
    label: string;
    value: string; // Display value
    placeholder?: string;
    items: Instrument[];
    onSelect: (item: Instrument) => void;
    loading?: boolean;
}

export function InstrumentSelector({ label, value, items, onSelect, loading, placeholder = 'Select' }: SelectorProps) {
    const [modalVisible, setModalVisible] = React.useState(false);

    const handleSelect = (item: Instrument) => {
        onSelect(item);
        setModalVisible(false);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity
                style={styles.selector}
                onPress={() => !loading && setModalVisible(true)}
                disabled={loading}
            >
                <Text style={[styles.value, !value && styles.placeholder]}>
                    {value || placeholder}
                </Text>
                {loading ? (
                    <ActivityIndicator size="small" color="#0a7ea4" />
                ) : (
                    <FontAwesome name="chevron-down" size={14} color="#666" />
                )}
            </TouchableOpacity>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Instrument</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <FontAwesome name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={items}
                            keyExtractor={(item) => item.symbol}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.item}
                                    onPress={() => handleSelect(item)}
                                >
                                    <Text style={styles.itemSymbol}>{item.symbol}</Text>
                                    <Text style={styles.itemName}>{item.name}</Text>
                                    {item.is_index && <Text style={styles.tag}>INDEX</Text>}
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
        marginBottom: 15,
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
        fontSize: 16,
        color: '#333',
    },
    placeholder: {
        color: '#999',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '70%',
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    item: {
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemSymbol: {
        fontSize: 16,
        fontWeight: '600',
        width: 100,
    },
    itemName: {
        fontSize: 14,
        color: '#666',
        flex: 1,
    },
    tag: {
        fontSize: 10,
        color: '#fff',
        backgroundColor: '#0a7ea4',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden',
    },
});
