
import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { optionStrategiesAPI } from '@/services/option-strategies';
import { StrategyLeg, EntryCriteria, ExitCriteria } from '@/types/strategy';
import LegBuilderModal from '@/components/LegBuilderModal';
import StrategySettingsModal from '@/components/StrategySettingsModal';

export default function CreateStrategyScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isAdvanced, setIsAdvanced] = useState(false);

    // Modals
    const [isLegModalVisible, setLegModalVisible] = useState(false);
    const [editingLegId, setEditingLegId] = useState<string | null>(null);
    const [isSettingsModalVisible, setSettingsModalVisible] = useState(false);

    // Strategy State
    const [legs, setLegs] = useState<StrategyLeg[]>([]);
    const [entry, setEntry] = useState<EntryCriteria>({
        mode: 'EXPIRY_BASED',
        daysBeforeExpiry: '0',
        holidayEntryMode: 'NONE',
        priceRef: 'OPEN',
        minVolume: '0',
        waitAndTrade: {
            enabled: false,
            type: 'INCREASE',
            value: '0.5',
            ref: 'PREV_CLOSE',
            refDays: '5'
        }
    });

    const [exit, setExit] = useState<ExitCriteria>({
        type: 'DAYS_BEFORE_EXPIRY',
        dailyExitType: 'SAME_DAY',
        dailyExitDays: '2',
        daysBeforeExpiry: '0',
        exitTimeRef: 'CLOSE',
        allowReentry: false,
        riskManagementMode: 'GLOBAL',
        stopLoss: { enabled: false, type: '%', value: '5', ref: 'OPEN' },
        takeProfit: { enabled: false, type: '%', value: '10', ref: 'BOTH' },
        trailingStopLoss: { enabled: false, type: 'points', value: '10', ref: 'OPEN' }
    });

    const handleSaveLeg = (leg: StrategyLeg) => {
        if (editingLegId) {
            setLegs(legs.map(l => l.id === leg.id ? leg : l));
        } else {
            setLegs([...legs, { ...leg, id: Date.now().toString() }]);
        }
        setEditingLegId(null);
    };

    const handleEditLeg = (leg: StrategyLeg) => {
        setEditingLegId(leg.id);
        setLegModalVisible(true);
    };

    const handleDeleteLeg = (id: string) => {
        Alert.alert(
            "Delete Leg",
            "Are you sure?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => setLegs(legs.filter(l => l.id !== id)) }
            ]
        );
    };

    const handleSaveSettings = (newEntry: EntryCriteria, newExit: ExitCriteria) => {
        setEntry(newEntry);
        setExit(newExit);
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            Alert.alert("Error", "Please enter a strategy name");
            return;
        }
        if (legs.length === 0) {
            Alert.alert("Error", "Please add at least one leg");
            return;
        }

        setLoading(true);
        try {
            await optionStrategiesAPI.create({
                name,
                description,
                configuration: {
                    entry,
                    exit,
                    legs
                }
            });
            Alert.alert("Success", "Strategy created successfully", [
                { text: "OK", onPress: () => router.back() }
            ]);
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.message || error.response?.data?.detail || "Failed to create strategy";
            Alert.alert("Error", typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <FontAwesome name="arrow-left" size={20} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create Strategy</Text>

                {/* Mode Toggle */}
                <View style={styles.modeToggle}>
                    <TouchableOpacity
                        style={[styles.modeBtn, !isAdvanced && styles.modeBtnActive]}
                        onPress={() => setIsAdvanced(false)}
                    >
                        <Text style={[styles.modeText, !isAdvanced && styles.modeTextActive]}>Basic</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.modeBtn, isAdvanced && styles.modeBtnActive]}
                        onPress={() => setIsAdvanced(true)}
                    >
                        <Text style={[styles.modeText, isAdvanced && styles.modeTextActive]}>Adv</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.content}>
                {/* Basic Info */}
                <View style={styles.card}>
                    <Text style={styles.label}>Strategy Name</Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="e.g. Short Straddle"
                    />

                    <Text style={[styles.label, { marginTop: 12 }]}>Description (Optional)</Text>
                    <TextInput
                        style={[styles.input, { height: 60 }]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Strategy logic..."
                        multiline
                    />
                </View>

                {/* Legs Section */}
                <View style={[styles.card, { paddingBottom: 8 }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Legs ({legs.length})</Text>
                        <TouchableOpacity style={styles.addBtn} onPress={() => { setEditingLegId(null); setLegModalVisible(true); }}>
                            <FontAwesome name="plus" size={12} color="#fff" />
                            <Text style={styles.addBtnText}>Add Leg</Text>
                        </TouchableOpacity>
                    </View>

                    {legs.map((leg, index) => (
                        <View key={leg.id || index} style={styles.legItem}>
                            <View style={styles.legInfo}>
                                <View style={[styles.badge, leg.action === 'BUY' ? styles.badgeBuy : styles.badgeSell]}>
                                    <Text style={[styles.badgeText, leg.action === 'BUY' ? styles.textBuy : styles.textSell]}>
                                        {leg.action}
                                    </Text>
                                </View>
                                <View style={[styles.badge, styles.badgeType]}>
                                    <Text style={styles.textType}>{leg.type}</Text>
                                </View>
                                <Text style={styles.legDetail}>
                                    {leg.strikeSelection === 'ATM' ? 'ATM' : `ATM ${leg.strikeSelection === 'ATM_PLUS' ? '+' : '-'} ${leg.strikeOffset}${leg.strikeOffsetType}`}
                                </Text>
                            </View>
                            <View style={styles.legActions}>
                                <TouchableOpacity onPress={() => handleEditLeg(leg)} style={styles.iconBtn}>
                                    <FontAwesome name="pencil" size={16} color="#666" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDeleteLeg(leg.id)} style={styles.iconBtn}>
                                    <FontAwesome name="trash" size={16} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}

                    {legs.length === 0 && (
                        <Text style={styles.emptyText}>No legs added yet.</Text>
                    )}
                </View>

                {/* Entry/Exit Summary */}
                <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Configuration</Text>
                        <TouchableOpacity onPress={() => setSettingsModalVisible(true)}>
                            <Text style={styles.editLink}>Edit</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.configRow}>
                        <Text style={styles.configLabel}>Entry:</Text>
                        <Text style={styles.configValue}>
                            {entry.mode === 'EXPIRY_BASED'
                                ? `${entry.daysBeforeExpiry} days before Expiry @ ${entry.priceRef}`
                                : `Daily @ ${entry.priceRef}`
                            }
                        </Text>
                    </View>

                    <View style={styles.configRow}>
                        <Text style={styles.configLabel}>Exit:</Text>
                        <Text style={styles.configValue}>
                            {exit.daysBeforeExpiry} days before Expiry @ {exit.exitTimeRef}
                        </Text>
                    </View>

                    {exit.riskManagementMode === 'GLOBAL' && (
                        <View style={styles.configRow}>
                            <Text style={styles.configLabel}>Global Risk:</Text>
                            <Text style={styles.configValue}>
                                SL: {exit.stopLoss.enabled ? `${exit.stopLoss.value}${exit.stopLoss.type}` : 'None'} |
                                TP: {exit.takeProfit.enabled ? `${exit.takeProfit.value}${exit.takeProfit.type}` : 'None'}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Footer Action */}
            <View style={styles.fabContainer}>
                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitBtnText}>Create Strategy</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Modals */}
            <LegBuilderModal
                visible={isLegModalVisible}
                onClose={() => setLegModalVisible(false)}
                onSave={handleSaveLeg}
                initialLeg={editingLegId ? legs.find(l => l.id === editingLegId) : null}
                isAdvancedMode={isAdvanced}
            />

            <StrategySettingsModal
                visible={isSettingsModalVisible}
                onClose={() => setSettingsModalVisible(false)}
                onSave={handleSaveSettings}
                initialEntry={entry}
                initialExit={exit}
                isAdvancedMode={isAdvanced}
            />

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
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        justifyContent: 'space-between',
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginLeft: 8,
        flex: 1,
    },
    modeToggle: {
        flexDirection: 'row',
        backgroundColor: '#f1f3f5',
        borderRadius: 8,
        padding: 2,
    },
    modeBtn: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 6,
    },
    modeBtnActive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
    },
    modeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#999',
    },
    modeTextActive: {
        color: '#333',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#666',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#333',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    addBtn: {
        backgroundColor: '#0a7ea4',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 20,
        gap: 4,
    },
    addBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    legItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    legInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeBuy: { backgroundColor: '#dcfce7' },
    badgeSell: { backgroundColor: '#fee2e2' },
    textBuy: { color: '#166534', fontSize: 10, fontWeight: '700' },
    textSell: { color: '#991b1b', fontSize: 10, fontWeight: '700' },
    badgeType: { backgroundColor: '#f3f4f6' },
    textType: { color: '#4b5563', fontSize: 10, fontWeight: '700' },
    badgeText: { fontSize: 10, fontWeight: '700' },
    legDetail: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    legActions: {
        flexDirection: 'row',
        gap: 12,
    },
    iconBtn: {
        padding: 4,
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        fontStyle: 'italic',
        marginTop: 8,
    },
    editLink: {
        color: '#0a7ea4',
        fontWeight: '600',
        fontSize: 14,
    },
    configRow: {
        flexDirection: 'row',
        marginBottom: 6,
    },
    configLabel: {
        width: 80,
        fontSize: 14,
        color: '#666',
    },
    configValue: {
        flex: 1,
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    fabContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    submitBtn: {
        backgroundColor: '#0a7ea4',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
