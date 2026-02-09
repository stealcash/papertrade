import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { predictionsAPI } from '@/services/predictions';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/Colors';

interface PredictionModalProps {
    stock: any;
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function PredictionModal({ stock, visible, onClose, onSuccess }: PredictionModalProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [direction, setDirection] = useState<'BUY' | 'SELL'>('BUY');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            setDirection('BUY');
            setDescription('');
        }
    }, [visible]);

    const handleSubmit = async () => {
        if (!stock) return;

        setLoading(true);
        try {
            await predictionsAPI.create({
                stock: stock.id,
                direction,
                description
            });
            Alert.alert("Success", `Prediction added for ${stock.symbol}`);
            if (onSuccess) onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Failed to add prediction", error);
            Alert.alert("Error", error.response?.data?.message || "Failed to create prediction");
        } finally {
            setLoading(false);
        }
    };

    if (!stock) return null;

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <View style={[styles.content, { backgroundColor: colors.background }]}>
                        {/* Header */}
                        <View style={[styles.header, { borderBottomColor: colors.border }]}>
                            <View>
                                <Text style={[styles.title, { color: colors.text }]}>New Prediction</Text>
                                <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
                                    For {stock.symbol} ({stock.name})
                                </Text>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <FontAwesome name="times" size={20} color={colors.tabIconDefault} />
                            </TouchableOpacity>
                        </View>

                        {/* Body */}
                        <View style={styles.body}>
                            {/* Direction Selection */}
                            <Text style={styles.label}>DIRECTION</Text>
                            <View style={styles.directionRow}>
                                <TouchableOpacity
                                    style={[
                                        styles.directionButton,
                                        { borderColor: direction === 'BUY' ? '#10b981' : 'transparent', backgroundColor: direction === 'BUY' ? '#dcfce7' : colors.card }
                                    ]}
                                    onPress={() => setDirection('BUY')}
                                >
                                    <FontAwesome name="line-chart" size={18} color={direction === 'BUY' ? '#059669' : colors.tabIconDefault} />
                                    <Text style={[styles.directionText, { color: direction === 'BUY' ? '#059669' : colors.tabIconDefault }]}>BUY</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.directionButton,
                                        { borderColor: direction === 'SELL' ? '#ef4444' : 'transparent', backgroundColor: direction === 'SELL' ? '#fee2e2' : colors.card }
                                    ]}
                                    onPress={() => setDirection('SELL')}
                                >
                                    <FontAwesome name="level-down" size={18} color={direction === 'SELL' ? '#b91c1c' : colors.tabIconDefault} />
                                    <Text style={[styles.directionText, { color: direction === 'SELL' ? '#b91c1c' : colors.tabIconDefault }]}>SELL</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Reasoning */}
                            <Text style={styles.label}>WHY THIS DECISION?</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                                placeholder="e.g. Breakout anticipated, strong volume support..."
                                placeholderTextColor={colors.tabIconDefault}
                                multiline
                                numberOfLines={4}
                                value={description}
                                onChangeText={setDescription}
                            />

                            {/* Actions */}
                            <View style={styles.footer}>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: direction === 'BUY' ? '#10b981' : '#ef4444' }]}
                                    onPress={handleSubmit}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <Text style={styles.actionButtonText}>Confirm {direction}</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    keyboardView: {
        width: '100%',
    },
    content: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    closeButton: {
        padding: 8,
    },
    body: {
        padding: 20,
    },
    label: {
        fontSize: 11,
        fontWeight: '700',
        color: '#6b7280',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    directionRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    directionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 2,
        gap: 8,
    },
    directionText: {
        fontWeight: 'bold',
        fontSize: 15,
    },
    input: {
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        minHeight: 100,
        textAlignVertical: 'top',
        borderWidth: 1,
        marginBottom: 24,
    },
    footer: {
        marginTop: 8,
    },
    actionButton: {
        height: 54,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
