
import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, ScrollView, Modal, Switch, Platform } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { EntryCriteria, ExitCriteria } from '../types/strategy';

interface StrategySettingsModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (entry: EntryCriteria, exit: ExitCriteria) => void;
    initialEntry: EntryCriteria;
    initialExit: ExitCriteria;
    isAdvancedMode: boolean;
}

export default function StrategySettingsModal({ visible, onClose, onSave, initialEntry, initialExit, isAdvancedMode }: StrategySettingsModalProps) {
    const [entry, setEntry] = useState<EntryCriteria>(initialEntry);
    const [exit, setExit] = useState<ExitCriteria>(initialExit);

    // Reset state when modal opens
    React.useEffect(() => {
        if (visible) {
            setEntry(JSON.parse(JSON.stringify(initialEntry)));
            setExit(JSON.parse(JSON.stringify(initialExit)));
        }
    }, [visible, initialEntry, initialExit]);

    const updateEntry = (field: keyof EntryCriteria, value: any) => {
        setEntry(prev => ({ ...prev, [field]: value }));
    };

    const updateWaitAndTrade = (field: string, value: any) => {
        setEntry(prev => ({
            ...prev,
            waitAndTrade: { ...prev.waitAndTrade, [field]: value }
        }));
    };

    const updateExitField = (field: keyof ExitCriteria, value: any) => {
        setExit(prev => ({ ...prev, [field]: value }));
    };

    const updateGlobalRisk = (type: 'stopLoss' | 'takeProfit' | 'trailingStopLoss', field: string, value: any) => {
        setExit(prev => ({
            ...prev,
            [type]: { ...prev[type], [field]: value }
        }));
    };

    const handleSave = () => {
        onSave(entry, exit);
        onClose();
    };

    const renderSegmentedControl = (
        label: string,
        value: string,
        options: { label: string; value: string }[],
        onChange: (val: any) => void
    ) => (
        <View style={styles.fieldContainer}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.segmentContainer}>
                {options.map((opt) => (
                    <TouchableOpacity
                        key={opt.value}
                        style={[
                            styles.segmentButton,
                            value === opt.value && styles.segmentButtonActive,
                            { flex: 1 / options.length }
                        ]}
                        onPress={() => onChange(opt.value)}
                    >
                        <Text style={[
                            styles.segmentText,
                            value === opt.value && styles.segmentTextActive
                        ]}>
                            {opt.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Strategy Configuration</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <FontAwesome name="times" size={20} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

                        {/* Entry Section */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Entry Settings</Text>
                        </View>

                        {renderSegmentedControl('Entry Timing', entry.priceRef, [
                            { label: 'Market Open', value: 'OPEN' },
                            { label: 'Market Close', value: 'CLOSE' }
                        ], (v) => updateEntry('priceRef', v))}

                        {renderSegmentedControl('Mode', entry.mode, [
                            { label: 'Expiry Based', value: 'EXPIRY_BASED' },
                            { label: 'Daily / Intraday', value: 'DAILY' }
                        ], (v) => updateEntry('mode', v))}

                        {entry.mode === 'EXPIRY_BASED' && (
                            <View style={styles.fieldContainer}>
                                <Text style={styles.label}>Days Before Expiry</Text>
                                <TextInput
                                    style={styles.input}
                                    value={entry.daysBeforeExpiry}
                                    onChangeText={(v) => updateEntry('daysBeforeExpiry', v)}
                                    keyboardType="numeric"
                                    placeholder="0 for Expiry Day"
                                />
                            </View>
                        )}

                        {isAdvancedMode && (
                            <View style={styles.advancedSection}>
                                <Text style={styles.subHeader}>Advanced Entry</Text>

                                {entry.mode === 'EXPIRY_BASED' && (
                                    <View style={styles.fieldContainer}>
                                        <Text style={styles.label}>Holiday Handling</Text>
                                        <View style={styles.segmentContainer}>
                                            {[
                                                { label: 'Prev', value: 'PREVIOUS' },
                                                { label: 'Skip', value: 'NONE' },
                                                { label: 'Next', value: 'NEXT' }
                                            ].map((opt) => (
                                                <TouchableOpacity
                                                    key={opt.value}
                                                    style={[styles.segmentButton, entry.holidayEntryMode === opt.value && styles.segmentButtonActive]}
                                                    onPress={() => updateEntry('holidayEntryMode', opt.value)}
                                                >
                                                    <Text style={[styles.segmentText, entry.holidayEntryMode === opt.value && styles.segmentTextActive]}>{opt.label}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                <View style={styles.fieldContainer}>
                                    <Text style={styles.label}>Min Order Volume (Liquidity)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={entry.minVolume}
                                        onChangeText={(v) => updateEntry('minVolume', v)}
                                        keyboardType="numeric"
                                        placeholder="0"
                                    />
                                </View>

                                <View style={styles.checkboxRow}>
                                    <Switch
                                        value={entry.waitAndTrade.enabled}
                                        onValueChange={(v) => updateWaitAndTrade('enabled', v)}
                                        trackColor={{ false: '#ccc', true: '#0a7ea4' }}
                                    />
                                    <Text style={styles.checkboxLabel}>Enable Wait & Trade</Text>
                                </View>

                                {entry.waitAndTrade.enabled && (
                                    <View style={styles.nestedSection}>
                                        <View style={styles.row}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.label}>Direction</Text>
                                                <View style={styles.segmentContainer}>
                                                    <TouchableOpacity
                                                        style={[styles.segmentButton, entry.waitAndTrade.type === 'INCREASE' && styles.segmentButtonActive]}
                                                        onPress={() => updateWaitAndTrade('type', 'INCREASE')}
                                                    >
                                                        <Text style={styles.segmentText}>Up</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[styles.segmentButton, entry.waitAndTrade.type === 'DECREASE' && styles.segmentButtonActive]}
                                                        onPress={() => updateWaitAndTrade('type', 'DECREASE')}
                                                    >
                                                        <Text style={styles.segmentText}>Down</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                            <View style={{ width: 12 }} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.label}>Value %</Text>
                                                <TextInput
                                                    style={styles.input}
                                                    value={entry.waitAndTrade.value}
                                                    onChangeText={(v) => updateWaitAndTrade('value', v)}
                                                    keyboardType="numeric"
                                                />
                                            </View>
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Exit Section */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Exit & Risk</Text>
                        </View>

                        {renderSegmentedControl('Exit Time', exit.exitTimeRef, [
                            { label: 'Market Close', value: 'CLOSE' },
                            { label: 'Market Open', value: 'OPEN' }
                        ], (v) => updateExitField('exitTimeRef', v))}

                        {isAdvancedMode && (
                            <View style={styles.fieldContainer}>
                                <Text style={styles.label}>Risk Management Mode</Text>
                                <View style={styles.segmentContainer}>
                                    <TouchableOpacity
                                        style={[styles.segmentButton, exit.riskManagementMode === 'GLOBAL' && styles.segmentButtonActive]}
                                        onPress={() => updateExitField('riskManagementMode', 'GLOBAL')}
                                    >
                                        <Text style={styles.segmentText}>Global P&L</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.segmentButton, exit.riskManagementMode === 'LEG_WISE' && styles.segmentButtonActive]}
                                        onPress={() => updateExitField('riskManagementMode', 'LEG_WISE')}
                                    >
                                        <Text style={styles.segmentText}>Leg-wise</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {exit.riskManagementMode === 'GLOBAL' && (
                            <View style={styles.riskSection}>
                                <Text style={styles.helperText}>Global Stop Loss / Take Profit</Text>
                                <View style={styles.riskRow}>
                                    <View style={styles.checkboxRow}>
                                        <Switch
                                            value={exit.stopLoss.enabled}
                                            onValueChange={(v) => updateGlobalRisk('stopLoss', 'enabled', v)}
                                        />
                                        <Text style={styles.checkboxLabel}>Stop Loss (%)</Text>
                                    </View>
                                    {exit.stopLoss.enabled && (
                                        <TextInput
                                            style={styles.input}
                                            value={exit.stopLoss.value}
                                            onChangeText={(v) => updateGlobalRisk('stopLoss', 'value', v)}
                                            keyboardType="numeric"
                                            placeholder="%"
                                        />
                                    )}
                                </View>
                                <View style={styles.riskRow}>
                                    <View style={styles.checkboxRow}>
                                        <Switch
                                            value={exit.takeProfit.enabled}
                                            onValueChange={(v) => updateGlobalRisk('takeProfit', 'enabled', v)}
                                        />
                                        <Text style={styles.checkboxLabel}>Take Profit (%)</Text>
                                    </View>
                                    {exit.takeProfit.enabled && (
                                        <TextInput
                                            style={styles.input}
                                            value={exit.takeProfit.value}
                                            onChangeText={(v) => updateGlobalRisk('takeProfit', 'value', v)}
                                            keyboardType="numeric"
                                            placeholder="%"
                                        />
                                    )}
                                </View>
                            </View>
                        )}

                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onClose}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btn, styles.saveBtn]} onPress={handleSave}>
                            <Text style={styles.saveBtnText}>Save Configuration</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '90%',
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    closeBtn: {
        padding: 8,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    sectionHeader: {
        marginTop: 16,
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 4,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    subHeader: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0a7ea4',
        marginBottom: 8,
        marginTop: 8,
    },
    fieldContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
        backgroundColor: '#f9f9f9',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    segmentContainer: {
        flexDirection: 'row',
        backgroundColor: '#f1f3f5',
        borderRadius: 8,
        padding: 4,
    },
    segmentButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    segmentButtonActive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    segmentText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#666',
        textAlign: 'center',
    },
    segmentTextActive: {
        color: '#0a7ea4',
        fontWeight: '700',
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    checkboxLabel: {
        fontSize: 14,
        color: '#333',
    },
    footer: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        gap: 12,
    },
    btn: {
        flex: 1,
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtn: {
        backgroundColor: '#f1f3f5',
    },
    saveBtn: {
        backgroundColor: '#0a7ea4',
    },
    cancelBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    saveBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    advancedSection: {
        backgroundColor: '#f0f9ff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e0f2fe',
    },
    nestedSection: {
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
    },
    riskSection: {
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    helperText: {
        fontSize: 12,
        color: '#999',
        marginBottom: 12,
        fontStyle: 'italic',
    },
    riskRow: {
        marginBottom: 12,
    }
});
