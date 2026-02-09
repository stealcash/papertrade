import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, Alert, Modal, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { strategiesAPI } from '@/services/strategies';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Rule {
    field: string;
    operator: string;
    value: string;
}

interface Block {
    rules: Rule[];
    outputPercentage: string;
    action: 'BUY' | 'SELL';
}

export default function CreateStrategyScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [blocks, setBlocks] = useState<Block[]>([
        { action: 'BUY', rules: [{ field: 'RSI', operator: 'lt', value: '30' }], outputPercentage: '2' }
    ]);

    // Upgrade Modal State
    const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
    const [upgradeMessage, setUpgradeMessage] = useState('');

    // Helpers
    const addBlock = () => {
        setBlocks([...blocks, { action: 'BUY', rules: [{ field: 'RSI', operator: 'lt', value: '30' }], outputPercentage: '2' }]);
    };

    const removeBlock = (index: number) => {
        setBlocks(blocks.filter((_, i) => i !== index));
    };

    const updateBlock = (index: number, field: keyof Block, val: string) => {
        const newBlocks = [...blocks];
        // @ts-ignore
        newBlocks[index] = { ...newBlocks[index], [field]: val };
        setBlocks(newBlocks);
    };

    const addRule = (bIndex: number) => {
        const newBlocks = [...blocks];
        newBlocks[bIndex].rules.push({ field: 'RSI', operator: 'lt', value: '30' });
        setBlocks(newBlocks);
    };

    const removeRule = (bIndex: number, rIndex: number) => {
        const newBlocks = [...blocks];
        newBlocks[bIndex].rules = newBlocks[bIndex].rules.filter((_, i) => i !== rIndex);
        setBlocks(newBlocks);
    };

    const updateRule = (bIndex: number, rIndex: number, field: keyof Rule, val: string) => {
        const newBlocks = [...blocks];
        newBlocks[bIndex].rules[rIndex] = { ...newBlocks[bIndex].rules[rIndex], [field]: val };
        setBlocks(newBlocks);
    };

    const handleSave = async () => {
        if (!name) {
            Alert.alert("Error", "Please enter a strategy name");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                name,
                description,
                is_public: false,
                rules_json: {
                    strategy_blocks: blocks.map(b => ({
                        action: b.action,
                        rules: b.rules,
                        output_percentage: parseFloat(b.outputPercentage) || 0
                    }))
                }
            };
            await strategiesAPI.createRuleBased(payload);
            Alert.alert("Success", "Strategy created successfully", [
                { text: "OK", onPress: () => router.back() }
            ]);
        } catch (e: any) {
            console.error("Creation failed", e);

            const errData = e.response?.data;
            const subError = errData?.subscription || errData?.details?.subscription;

            if (subError) {
                const msg = Array.isArray(subError) ? subError[0] : subError;
                setUpgradeMessage(msg);
                setUpgradeModalVisible(true);
            } else {
                const msg = errData?.message || errData?.detail || "Failed to create strategy";
                Alert.alert("Error", msg);
            }
        } finally {
            setLoading(false);
        }
    };

    // Custom Selector Component (Inline)
    const Selector = ({ label, value, options, onSelect }: any) => {
        const [visible, setVisible] = useState(false);
        return (
            <View>
                <TouchableOpacity onPress={() => setVisible(true)} style={styles.selectorBtn}>
                    <Text style={styles.selectorText}>
                        {options.find((o: any) => o.value === value)?.label || value}
                    </Text>
                    <FontAwesome name="caret-down" size={14} color="#666" />
                </TouchableOpacity>
                <Modal visible={visible} transparent animationType="fade">
                    <TouchableOpacity style={styles.modalOverlay} onPress={() => setVisible(false)}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>{label}</Text>
                            {options.map((opt: any) => (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[styles.modalOption, value === opt.value && styles.selectedOption]}
                                    onPress={() => {
                                        onSelect(opt.value);
                                        setVisible(false);
                                    }}
                                >
                                    <Text style={[styles.optionText, value === opt.value && styles.selectedOptionText]}>{opt.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </TouchableOpacity>
                </Modal>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ title: 'Create Strategy' }} />

            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.section}>
                    <Text style={[styles.label, { color: colors.text }]}>Strategy Name</Text>
                    <TextInput
                        style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                        value={name}
                        onChangeText={setName}
                        placeholder="e.g. My RSI Strategy"
                        placeholderTextColor={colors.tabIconDefault}
                    />

                    <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Description</Text>
                    <TextInput
                        style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Optional description"
                        placeholderTextColor={colors.tabIconDefault}
                        multiline
                    />
                </View>

                {blocks.map((block, bIndex) => {
                    const isBuy = block.action === 'BUY';
                    const borderColor = isBuy ? '#dcfce7' : '#fee2e2';
                    const bgColor = isBuy ? '#f0fdf4' : '#fef2f2';

                    return (
                        <View key={bIndex} style={[styles.blockCard, { borderColor: borderColor, backgroundColor: bgColor }]}>
                            <View style={styles.blockHeader}>
                                <Text style={styles.blockTitle}>{bIndex === 0 ? 'IF' : 'ELSE IF'} (Block {bIndex + 1})</Text>
                                {blocks.length > 1 && (
                                    <TouchableOpacity onPress={() => removeBlock(bIndex)}>
                                        <Text style={styles.removeText}>Remove</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            <View style={styles.pickerRow}>
                                <Text style={styles.rowLabel}>Action:</Text>
                                <View style={{ flex: 1 }}>
                                    <Selector
                                        label="Select Action"
                                        value={block.action}
                                        onSelect={(val: string) => updateBlock(bIndex, 'action', val)}
                                        options={[
                                            { label: "BUY (Price Goes UP)", value: "BUY" },
                                            { label: "SELL (Price Goes DOWN)", value: "SELL" }
                                        ]}
                                    />
                                </View>
                            </View>

                            {block.rules.map((rule, rIndex) => (
                                <View key={rIndex} style={styles.ruleasCard}>
                                    <View style={styles.ruleHeader}>
                                        <Text style={styles.ruleTitle}>Rule {rIndex + 1}</Text>
                                        <TouchableOpacity onPress={() => removeRule(bIndex, rIndex)}>
                                            <FontAwesome name="trash" size={16} color="#999" />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.ruleRow}>
                                        <View style={{ flex: 2 }}>
                                            <Selector
                                                label="Field"
                                                value={rule.field}
                                                onSelect={(val: string) => updateRule(bIndex, rIndex, 'field', val)}
                                                options={[
                                                    { label: "RSI", value: "RSI" },
                                                    { label: "SMA 5", value: "SMA_5" },
                                                    { label: "SMA 10", value: "SMA_10" },
                                                    { label: "SMA 20", value: "SMA_20" },
                                                    { label: "SMA 50", value: "SMA_50" },
                                                    { label: "Close % Change (Day 0 - Day -1)", value: "CLOSE_PCT_CHANGE_0" },
                                                    { label: "Close % Change (Day -1 - Day -2)", value: "CLOSE_PCT_CHANGE_1" },
                                                    { label: "Close % Change (Day -1 - Day -3)", value: "CLOSE_PCT_CHANGE_1_3" },
                                                    { label: "Close % Change (Day -1 - Day -7)", value: "CLOSE_PCT_CHANGE_1_7" }
                                                ]}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Selector
                                                label="Op"
                                                value={rule.operator}
                                                onSelect={(val: string) => updateRule(bIndex, rIndex, 'operator', val)}
                                                options={[
                                                    { label: "<", value: "lt" },
                                                    { label: ">", value: "gt" },
                                                    { label: "=", value: "eq" },
                                                    { label: ">=", value: "gte" },
                                                    { label: "<=", value: "lte" }
                                                ]}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <TextInput
                                                style={styles.smallInput}
                                                value={rule.value}
                                                onChangeText={(val) => updateRule(bIndex, rIndex, 'value', val)}
                                                keyboardType="numeric"
                                                placeholder="Val"
                                            />
                                        </View>
                                    </View>
                                </View>
                            ))}

                            <TouchableOpacity onPress={() => addRule(bIndex)} style={styles.addRuleBtn}>
                                <FontAwesome name="plus" size={12} color="#4b5563" />
                                <Text style={styles.addRuleText}>Add Rule</Text>
                            </TouchableOpacity>

                            <View style={styles.outcomeRow}>
                                <Text style={styles.outcomeLabel}>{isBuy ? 'Target Profit Increase:' : 'Target Profit Drop:'}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <TextInput
                                        style={styles.outcomeInput}
                                        value={block.outputPercentage}
                                        onChangeText={(val) => updateBlock(bIndex, 'outputPercentage', val)}
                                        keyboardType="numeric"
                                    />
                                    <Text style={{ color: '#666', fontSize: 14 }}>%</Text>
                                </View>
                            </View>
                        </View>
                    );
                })}

                <TouchableOpacity onPress={addBlock} style={styles.addBlockBtn}>
                    <FontAwesome name="plus-circle" size={16} color="#6b7280" />
                    <Text style={styles.addBlockText}>Add 'Else If' Block</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.saveButton, loading && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Strategy</Text>}
                </TouchableOpacity>

            </ScrollView>

            {/* Upgrade Modal */}
            <Modal
                transparent
                visible={upgradeModalVisible}
                animationType="fade"
                onRequestClose={() => setUpgradeModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={{ alignItems: 'center', marginBottom: 15 }}>
                            <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' }}>
                                <FontAwesome name="bolt" size={24} color="#d97706" />
                            </View>
                        </View>
                        <Text style={styles.modalTitle}>Upgrade Required</Text>
                        <Text style={{ textAlign: 'center', color: '#666', marginBottom: 20 }}>
                            {upgradeMessage || "Your current plan limits the number of strategies you can create."}
                        </Text>

                        <TouchableOpacity
                            style={[styles.saveButton, { marginBottom: 10, width: '100%' }]}
                            onPress={() => {
                                setUpgradeModalVisible(false);
                                router.push('/subscription' as any); // Assuming subscription page exists or will exist
                            }}
                        >
                            <Text style={styles.saveButtonText}>View Plans</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{ padding: 10 }}
                            onPress={() => setUpgradeModalVisible(false)}
                        >
                            <Text style={{ color: '#666', fontWeight: 'bold' }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: 16, paddingBottom: 50 },
    section: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
    input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: 'rgba(0,0,0,0.02)' },

    blockCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
    blockHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    blockTitle: { fontWeight: 'bold', fontSize: 16, color: '#333' },
    removeText: { color: '#ef4444', fontSize: 12 },

    pickerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    rowLabel: { fontSize: 14, marginRight: 8, color: '#555' },

    // Custom Selector Styles
    selectorBtn: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', height: 40 },
    selectorText: { fontSize: 14, color: '#333' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20, maxHeight: '80%', width: '100%', maxWidth: 400, alignSelf: 'center' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
    modalOption: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
    selectedOption: { backgroundColor: '#f0f9ff' },
    optionText: { fontSize: 16 },
    selectedOptionText: { color: '#007AFF', fontWeight: 'bold' },

    ruleasCard: { backgroundColor: '#fff', padding: 8, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#eee' },
    ruleHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    ruleTitle: { fontSize: 12, color: '#888' },
    ruleRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    smallInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 4, height: 40, paddingHorizontal: 8, flex: 1, backgroundColor: '#fff' },

    addRuleBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', padding: 8, gap: 4 },
    addRuleText: { fontSize: 12, color: '#4b5563' },

    outcomeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 8 },
    outcomeLabel: { fontSize: 12, marginRight: 8, color: '#555' },
    outcomeInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 4, width: 60, height: 30, paddingHorizontal: 8, textAlign: 'center' },

    addBlockBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed', borderRadius: 12, marginBottom: 24, gap: 8 },
    addBlockText: { color: '#6b7280', fontWeight: '600' },

    saveButton: { backgroundColor: '#000', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 40 },
    saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
