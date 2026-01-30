import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { InstrumentSelector } from '@/components/InstrumentSelector';
import { ExpirySelector } from '@/components/ExpirySelector';
import { OptionChainTable } from '@/components/OptionChainTable';
import { optionsApi, Instrument } from '@/services/options';

export default function TradeScreen() {
    const [instruments, setInstruments] = useState<Instrument[]>([]);
    const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
    const [selectedExpiry, setSelectedExpiry] = useState<string>('');

    const [chainData, setChainData] = useState<any[]>([]);
    const [spotPrice, setSpotPrice] = useState<number>(0);

    const [loadingInstruments, setLoadingInstruments] = useState(false);
    const [loadingChain, setLoadingChain] = useState(false);

    // Fetch instruments on mount
    useEffect(() => {
        fetchInstruments();
    }, []);

    const fetchInstruments = async () => {
        setLoadingInstruments(true);
        try {
            const response = await optionsApi.getInstruments();
            const list = response?.data || [];
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
            const response = await optionsApi.getOptionChain({
                symbol: selectedInstrument.symbol,
                expiry: selectedExpiry
            });

            const data = response?.data || [];
            setChainData(data);

            // Calculate Spot Price from first record (if available)
            if (data.length > 0) {
                // Priority: underlying_value -> calculated from future? -> 0
                // My model has 'underlying_value'
                const spot = data[0].underlying_value || 0;
                setSpotPrice(spot);
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to fetch option chain');
        } finally {
            setLoadingChain(false);
        }
    };

    // Fetch chain when instrument or expiry changes
    useEffect(() => {
        if (selectedInstrument && selectedExpiry) {
            fetchOptionChain();
        }
    }, [selectedInstrument, selectedExpiry]);

    // Reset expiry when instrument changes
    const handleInstrumentChange = (item: Instrument) => {
        setSelectedInstrument(item);
        setSelectedExpiry(''); // Force user to re-select expiry or auto-select logic in ExpirySelector
        setChainData([]);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Option Chain</Text>
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

            <View style={styles.content}>
                {loadingChain ? (
                    <ActivityIndicator size="large" color="#0a7ea4" style={{ marginTop: 50 }} />
                ) : (
                    <OptionChainTable data={chainData} spotPrice={spotPrice} />
                )}
            </View>

            {spotPrice > 0 && (
                <View style={styles.footer}>
                    <Text style={styles.spotText}>Spot Price: {spotPrice.toFixed(2)}</Text>
                </View>
            )}
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
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    controls: {
        padding: 15,
        paddingBottom: 0,
    },
    content: {
        flex: 1,
    },
    footer: {
        padding: 10,
        backgroundColor: '#f8f9fa',
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        alignItems: 'center'
    },
    spotText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0a7ea4'
    }
});
