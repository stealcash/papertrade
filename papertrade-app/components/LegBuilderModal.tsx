
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, ScrollView, Modal, Switch, Platform } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { StrategyLeg } from '../types/strategy';

interface LegBuilderModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (leg: StrategyLeg) => void;
    initialLeg?: StrategyLeg | null;
    isAdvancedMode: boolean;
}

export default function LegBuilderModal({ visible, onClose, onSave, initialLeg, isAdvancedMode }: LegBuilderModalProps) {
    const defaultLeg: StrategyLeg = {
        id: '',
        type: 'CE',
        action: 'BUY',
        strikeSelection: 'ATM',
        strikeRounding: 'AUTO',
        strikeOffsetType: 'Pt',
        strikeOffset: '0',
        selectBy: 'STRIKE',
        targetPremium: '100',
        premiumTolerance: '10',
        minPremium: '0',
        maxPremium: '0',
        priceBoundaryEnabled: false,
        lotMultiplier: 1,
        stopLoss: { enabled: false, type: '%', value: '5', ref: 'OPEN' },
        takeProfit: { enabled: false, type: '%', value: '10', ref: 'BOTH' },
        trailingStopLoss: { enabled: false, type: 'points', value: '10', ref: 'OPEN' },
    };

    const [leg, setLeg] = useState<StrategyLeg>(defaultLeg);

    useEffect(() => {
        if (visible) {
            setLeg(initialLeg ? { ...initialLeg } : { ...defaultLeg, id: Date.now().toString() });
        }
    }, [visible, initialLeg]);

    const updateLeg = (field: keyof StrategyLeg, value: any) => {
        setLeg(prev => ({ ...prev, [field]: value }));
    };

    const updateRisk = (type: 'stopLoss' | 'takeProfit' | 'trailingStopLoss', field: string, value: any) => {
        setLeg(prev => ({
            ...prev,
            [type]: { ...prev[type], [field]: value }
        }));
    };

    const handleSave = () => {
        onSave(leg);
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
                        <Text style={styles.modalTitle}>{initialLeg ? 'Edit Leg' : 'Add Leg'}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <FontAwesome name="times" size={20} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                        {/* Basic Fields */}
                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                {renderSegmentedControl('Action', leg.action, [
                                    { label: 'Buy', value: 'BUY' },
                                    { label: 'Sell', value: 'SELL' }
                                ], (v) => updateLeg('action', v))}
                            </View>
                            <View style={{ width: 16 }} />
                            <View style={{ flex: 1 }}>
                                {renderSegmentedControl('Type', leg.type, [
                                    { label: 'CE', value: 'CE' },
                                    { label: 'PE', value: 'PE' }
                                ], (v) => updateLeg('type', v))}
                            </View>
                        </View>

                        {/* Strike Selection */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Strike Selection</Text>
                        </View>

                        {renderSegmentedControl('Selection', leg.strikeSelection, [
                            { label: 'ATM', value: 'ATM' },
                            { label: 'ATM +', value: 'ATM_PLUS' },
                            { label: 'ATM -', value: 'ATM_MINUS' }
                        ], (v) => updateLeg('strikeSelection', v))}

                        {(leg.strikeSelection !== 'ATM') && (
                            <View style={styles.row}>
                                <View style={{ flex: 2 }}>
                                    <Text style={styles.label}>Offset Value</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={leg.strikeOffset}
                                        onChangeText={(v) => updateLeg('strikeOffset', v)}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={{ width: 16 }} />
                                <View style={{ flex: 1 }}>
                                    {renderSegmentedControl('Unit', leg.strikeOffsetType, [
                                        { label: 'Pt', value: 'Pt' },
                                        { label: '%', value: '%' }
                                    ], (v) => updateLeg('strikeOffsetType', v))}
                                </View>
                            </View>
                        )}

                        {isAdvancedMode && (
                            <>
                                {renderSegmentedControl('Rounding', leg.strikeRounding, [
                                    { label: 'Auto', value: 'AUTO' },
                                    { label: 'Up', value: 'UP' },
                                    { label: 'Down', value: 'DOWN' }
                                ], (v) => updateLeg('strikeRounding', v))}

                                {/* Price Boundaries */}
                                <View style={styles.checkboxRow}>
                                    <Switch
                                        value={leg.priceBoundaryEnabled}
                                        onValueChange={(v) => updateLeg('priceBoundaryEnabled', v)}
                                        trackColor={{ false: '#ccc', true: '#0a7ea4' }}
                                    />
                                    <Text style={styles.checkboxLabel}>Enable Price Boundaries (Min/Max Premium)</Text>
                                </View>

                                {leg.priceBoundaryEnabled && (
                                    <View style={styles.row}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.label}>Min Premium</Text>
                                            <TextInput
                                                style={styles.input}
                                                value={leg.minPremium}
                                                onChangeText={(v) => updateLeg('minPremium', v)}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                        <View style={{ width: 16 }} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.label}>Max Premium</Text>
                                            <TextInput
                                                style={styles.input}
                                                value={leg.maxPremium}
                                                onChangeText={(v) => updateLeg('maxPremium', v)}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                    </View>
                                )}
                            </>
                        )}

                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Lot Multiplier</Text>
                            <TextInput
                                style={styles.input}
                                value={String(leg.lotMultiplier)}
                                onChangeText={(v) => updateLeg('lotMultiplier', parseInt(v) || 1)}
                                keyboardType="numeric"
                            />
                        </View>

                        {/* Leg-wise Risk Management (Advanced Only) */}
                        {isAdvancedMode && (
                            <View style={styles.riskSection}>
                                <Text style={styles.sectionTitle}>Leg Risk Management</Text>
                                <Text style={styles.helperText}>Only applies if Global Risk Mode is "Leg-wise"</Text>

                                <View style={styles.riskRow}>
                                    <View style={styles.checkboxRow}>
                                        <Switch
                                            value={leg.stopLoss.enabled}
                                            onValueChange={(v) => updateRisk('stopLoss', 'enabled', v)}
                                        />
                                        <Text style={styles.checkboxLabel}>Stop Loss</Text>
                                    </View>
                                    {leg.stopLoss.enabled && (
                                        <View style={styles.row}>
                                            <TextInput
                                                style={[styles.input, { flex: 1 }]}
                                                value={leg.stopLoss.value}
                                                onChangeText={(v) => updateRisk('stopLoss', 'value', v)}
                                                keyboardType="numeric"
                                                placeholder="Value"
                                            />
                                        </View>
                                    )}
                                </View>

                                <View style={styles.riskRow}>
                                    <View style={styles.checkboxRow}>
                                        <Switch
                                            value={leg.takeProfit.enabled}
                                            onValueChange={(v) => updateRisk('takeProfit', 'enabled', v)}
                                        />
                                        <Text style={styles.checkboxLabel}>Take Profit</Text>
                                    </View>
                                    {leg.takeProfit.enabled && (
                                        <View style={styles.row}>
                                            <TextInput
                                                style={[styles.input, { flex: 1 }]}
                                                value={leg.takeProfit.value}
                                                onChangeText={(v) => updateRisk('takeProfit', 'value', v)}
                                                keyboardType="numeric"
                                                placeholder="Value"
                                            />
                                        </View>
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
                            <Text style={styles.saveBtnText}>Save Leg</Text>
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
    riskSection: {
        marginTop: 16,
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
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
