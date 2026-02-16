import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity, Alert, RefreshControl, Platform, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { predictionsAPI, Prediction } from '@/services/predictions';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/Colors';

type GroupedPredictions = {
    [date: string]: Prediction[];
};

export default function PredictionsScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filters
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);

    const [startDate, setStartDate] = useState(lastWeek);
    const [endDate, setEndDate] = useState(today);
    const [activePreset, setActivePreset] = useState<'7d' | '30d' | 'custom'>('7d');

    // Applied dates for API
    const [appliedStart, setAppliedStart] = useState(lastWeek);
    const [appliedEnd, setAppliedEnd] = useState(today);

    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    const fetchPredictions = async (isRefresh = false, start = appliedStart, end = appliedEnd) => {
        if (!isRefresh) setLoading(true);
        try {
            const params = {
                start_date: start.toISOString().split('T')[0],
                end_date: end.toISOString().split('T')[0],
            };
            const res = await predictionsAPI.getAll(params);

            let data = [];
            if (Array.isArray(res.data)) {
                data = res.data;
            } else if (res.data?.results && Array.isArray(res.data.results)) {
                data = res.data.results;
            } else if (res.data?.data && Array.isArray(res.data.data)) {
                data = res.data.data;
            } else {
                data = [];
            }

            setPredictions(data);
        } catch (error: any) {
            console.error("Failed to fetch predictions:", error?.response?.data || error.message);
            Alert.alert("Error", "Failed to load predictions. Please try again.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchPredictions(false, appliedStart, appliedEnd);
    }, []);

    const handleApply = () => {
        setAppliedStart(startDate);
        setAppliedEnd(endDate);
        fetchPredictions(false, startDate, endDate);
    };

    const handlePreset = (preset: '7d' | '30d') => {
        const end = new Date();
        const start = new Date();
        if (preset === '7d') {
            start.setDate(end.getDate() - 7);
        } else {
            start.setDate(end.getDate() - 30);
        }
        setStartDate(start);
        setEndDate(end);
        setAppliedStart(start);
        setAppliedEnd(end);
        setActivePreset(preset);
        fetchPredictions(false, start, end);
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchPredictions(true, appliedStart, appliedEnd);
    }, [appliedStart, appliedEnd]);

    const handleDelete = (id: number) => {
        Alert.alert(
            "Delete Prediction",
            "Are you sure you want to delete this prediction?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await predictionsAPI.delete(id);
                            setPredictions(prev => prev.filter(p => p.id !== id));
                        } catch (e) {
                            Alert.alert("Error", "Failed to delete prediction");
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteGroup = (date: string, preds: Prediction[]) => {
        const ids = preds.map(p => p.id);
        Alert.alert(
            "Delete Group",
            `Are you sure you want to delete all ${preds.length} predictions for ${date}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete Group",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await predictionsAPI.deleteBatch(ids);
                            setPredictions(prev => prev.filter(p => !ids.includes(p.id)));
                        } catch (e) {
                            Alert.alert("Error", "Failed to delete group");
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteAllVisible = () => {
        if (predictions.length === 0) return;

        Alert.alert(
            "Delete All Filtered",
            `Are you sure you want to delete all ${predictions.length} predictions in this date range?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete All",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const params = {
                                start_date: appliedStart.toISOString().split('T')[0],
                                end_date: appliedEnd.toISOString().split('T')[0],
                            };
                            await predictionsAPI.deleteAll(params);
                            setPredictions([]);
                        } catch (e) {
                            Alert.alert("Error", "Failed to delete predictions");
                        }
                    }
                }
            ]
        );
    };

    const groupedPredictions = useMemo(() => {
        const groups: GroupedPredictions = {};
        predictions.forEach(pred => {
            const date = new Date(pred.created_at).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            if (!groups[date]) groups[date] = [];
            groups[date].push(pred);
        });
        return groups;
    }, [predictions]);

    const renderReturn = (val: any, label: string) => {
        const numVal = parseFloat(val);
        const isPending = val === null || val === undefined;
        const color = isPending ? colors.tabIconDefault : (numVal > 0 ? '#10b981' : (numVal < 0 ? '#ef4444' : colors.text));

        return (
            <View style={styles.returnItem}>
                <Text style={styles.returnLabel}>{label}</Text>
                <Text style={[styles.returnValue, { color }]}>
                    {isPending ? 'Pending' : `${numVal > 0 ? '+' : ''}${numVal.toFixed(2)}%`}
                </Text>
            </View>
        );
    };

    const renderPredictionCard = (item: any) => {
        const isUp = item.direction === 'BUY';

        return (
            <View key={item.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardTop}>
                    <View style={styles.stockInfo}>
                        <Text style={[styles.symbol, { color: colors.text }]}>{item.stock_symbol}</Text>
                        <Text style={[styles.name, { color: colors.tabIconDefault }]}>{item.stock_name}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: isUp ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }]}>
                        <FontAwesome name={isUp ? "long-arrow-up" : "long-arrow-down"} size={12} color={isUp ? "#10b981" : "#ef4444"} />
                        <Text style={[styles.badgeText, { color: isUp ? "#10b981" : "#ef4444" }]}>{item.direction}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                        <FontAwesome name="trash-o" size={16} color="#ef4444" />
                    </TouchableOpacity>
                </View>

                {item.description ? (
                    <View style={[styles.descriptionContainer, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}>
                        <Text style={[styles.description, { color: colors.text }]}>"{item.description}"</Text>
                    </View>
                ) : null}

                <View style={[styles.pricesRow, { borderBottomColor: colors.border }]}>
                    <View style={styles.priceItem}>
                        <Text style={styles.priceLabel}>Entry</Text>
                        <Text style={[styles.priceValue, { color: colors.text }]}>₹{parseFloat(item.entry_price || 0).toFixed(2)}</Text>
                    </View>
                    <View style={styles.priceItem}>
                        <Text style={styles.priceLabel}>Current</Text>
                        <Text style={[styles.priceValue, { color: colors.text }]}>₹{parseFloat(item.current_price || 0).toFixed(2)}</Text>
                    </View>
                </View>

                <View style={styles.returnsRow}>
                    {renderReturn(item.return_1d, 'Next Day')}
                    {renderReturn(item.return_7d, '7 Days')}
                    {renderReturn(item.return_percentage, 'All Time')}
                </View>
            </View>
        );
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (event.type === 'dismissed') {
            setShowStartPicker(false);
            setShowEndPicker(false);
            return;
        }

        if (showStartPicker && selectedDate) {
            setShowStartPicker(false);
            setStartDate(selectedDate);
            setActivePreset('custom');
            setTimeout(() => setShowEndPicker(true), 100);
            if (endDate < selectedDate) setEndDate(selectedDate);
        } else if (showEndPicker && selectedDate) {
            setShowEndPicker(false);
            setEndDate(selectedDate);
            setActivePreset('custom');
            if (startDate > selectedDate) setStartDate(selectedDate);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{
                title: 'Predictions',
                headerShown: true,
                headerRight: () => (
                    <View style={{ flexDirection: 'row', gap: 15, marginRight: 15 }}>
                        {predictions.length > 0 && (
                            <TouchableOpacity onPress={handleDeleteAllVisible}>
                                <FontAwesome name="trash" size={18} color={colors.text} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => fetchPredictions(true)}>
                            <FontAwesome name="refresh" size={18} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                )
            }} />

            {/* Filter Bar */}
            <View style={[styles.filterBar, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                    <View style={styles.filterSection}>
                        <FontAwesome name="calendar" size={14} color={colors.tabIconDefault} style={{ marginRight: 8 }} />
                        <Text style={[styles.filterLabel, { color: colors.tabIconDefault }]}>Range:</Text>
                    </View>

                    {/* Preset Buttons */}
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                        <TouchableOpacity
                            onPress={() => handlePreset('7d')}
                            style={[
                                styles.presetBtn,
                                activePreset === '7d' ? { backgroundColor: colors.text } : { backgroundColor: 'transparent', borderColor: colors.text, borderWidth: 1 }
                            ]}
                        >
                            <Text style={[styles.presetBtnText, activePreset === '7d' ? { color: colors.background } : { color: colors.text }]}>Last 7 Days</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => handlePreset('30d')}
                            style={[
                                styles.presetBtn,
                                activePreset === '30d' ? { backgroundColor: colors.text } : { backgroundColor: 'transparent', borderColor: colors.text, borderWidth: 1 }
                            ]}
                        >
                            <Text style={[styles.presetBtnText, activePreset === '30d' ? { color: colors.background } : { color: colors.text }]}>Last 30 Days</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Date Selector & Apply */}
                    <View style={styles.dateSelectorRow}>
                        <TouchableOpacity
                            style={[styles.dateRangeBtn, { borderColor: colors.text }]}
                            onPress={() => setShowStartPicker(true)}
                        >
                            <FontAwesome name="calendar" size={14} color={colors.text} style={{ marginRight: 8 }} />
                            <Text style={[styles.dateBtnText, { color: colors.text }]}>
                                {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.applyBtn, { backgroundColor: colors.text }]}
                            onPress={handleApply}
                        >
                            <Text style={[styles.applyBtnText, { color: colors.background }]}>Apply</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {(showStartPicker || showEndPicker) && (
                <DateTimePicker
                    value={showStartPicker ? startDate : endDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    maximumDate={showStartPicker ? endDate : today}
                    minimumDate={showEndPicker ? startDate : undefined}
                />
            )}

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.text} />
                </View>
            ) : (
                <ScrollView
                    style={styles.content}
                    contentContainerStyle={{ padding: 16 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
                    }
                >
                    {predictions.length === 0 ? (
                        <View style={styles.emptyState}>
                            <FontAwesome name="bullseye" size={64} color={colors.tabIconDefault} />
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>No predictions found</Text>
                            <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
                                Try adjusting the date range or add new predictions from the stocks list.
                            </Text>
                        </View>
                    ) : (
                        Object.entries(groupedPredictions).map(([date, preds]) => (
                            <View key={date} style={styles.dateGroup}>
                                <View style={styles.dateHeader}>
                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <FontAwesome name="clock-o" size={14} color={colors.tint} />
                                        <Text style={[styles.dateHeaderTitle, { color: colors.text }]}>{date}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => handleDeleteGroup(date, preds)} style={styles.deleteGroupBtn}>
                                        <Text style={[styles.deleteGroupText, { color: '#ef4444' }]}>Delete Group</Text>
                                    </TouchableOpacity>
                                </View>
                                {preds.map(renderPredictionCard)}
                            </View>
                        ))
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    content: { flex: 1 },

    // Filter Bar
    filterBar: { padding: 12, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
    filterSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    filterLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    dateSelectorRow: { flexDirection: 'row', alignItems: 'center' },
    dateRangeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
    dateBtnText: { fontSize: 13, fontWeight: '500' },
    applyBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginLeft: 8 },
    applyBtnText: { fontSize: 13, fontWeight: '600' },
    presetBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    presetBtnText: { fontSize: 12, fontWeight: '600' },

    // Date Groups
    dateGroup: { marginBottom: 24 },
    dateHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
    dateHeaderTitle: { fontSize: 15, fontWeight: 'bold' },
    deleteGroupBtn: { padding: 4 },
    deleteGroupText: { fontSize: 13, fontWeight: '600' },

    // Cards
    card: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
    stockInfo: { flex: 1 },
    symbol: { fontSize: 17, fontWeight: 'bold' },
    name: { fontSize: 12, marginTop: 2 },
    badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
    badgeText: { fontSize: 11, fontWeight: 'bold' },
    deleteBtn: { padding: 5 },

    descriptionContainer: { padding: 10, borderRadius: 10, marginBottom: 12 },
    description: { fontSize: 13, fontStyle: 'italic', lineHeight: 18 },

    pricesRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, marginBottom: 12 },
    priceItem: { flex: 1 },
    priceLabel: { fontSize: 10, color: '#888', textTransform: 'uppercase', marginBottom: 2 },
    priceValue: { fontSize: 15, fontWeight: '600' },

    returnsRow: { flexDirection: 'row', gap: 15 },
    returnItem: { flex: 1 },
    returnLabel: { fontSize: 10, color: '#888', textTransform: 'uppercase', marginBottom: 2 },
    returnValue: { fontSize: 13, fontWeight: 'bold' },

    // Empty State
    emptyState: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 16 },
    emptyText: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
