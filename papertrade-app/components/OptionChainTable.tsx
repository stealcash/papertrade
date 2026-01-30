import React, { useMemo } from 'react';
import { StyleSheet, View, Text, FlatList, ScrollView } from 'react-native';

interface OptionData {
    strike_price: number;
    option_type: 'CE' | 'PE';
    ltp: number;
    open_interest: number;
    change_in_oi: number;
}

interface OptionChainTableProps {
    data: any[]; // Raw API data
    spotPrice?: number; // For highlighting ITM
}

export function OptionChainTable({ data, spotPrice = 0 }: OptionChainTableProps) {

    // Transform data into row-based structure (Strike -> { CE, PE })
    const processedData = useMemo(() => {
        const strikeMap = new Map<number, { strike: number, CE?: any, PE?: any }>();

        data.forEach(item => {
            const strike = item.strike_price;
            if (!strikeMap.has(strike)) {
                strikeMap.set(strike, { strike });
            }
            const entry = strikeMap.get(strike)!;
            if (item.option_type === 'CE') entry.CE = item;
            if (item.option_type === 'PE') entry.PE = item;
        });

        return Array.from(strikeMap.values()).sort((a, b) => a.strike - b.strike);
    }, [data]);

    const renderHeader = () => (
        <View style={styles.headerRow}>
            <Text style={[styles.headerCell, styles.callHeader]}>CE OI</Text>
            <Text style={[styles.headerCell, styles.callHeader]}>LTP</Text>
            <Text style={[styles.headerCell, styles.strikeHeader]}>Strike</Text>
            <Text style={[styles.headerCell, styles.putHeader]}>LTP</Text>
            <Text style={[styles.headerCell, styles.putHeader]}>PE OI</Text>
        </View>
    );

    const renderItem = ({ item }: { item: any }) => {
        const isCE_ITM = spotPrice > 0 && item.strike < spotPrice;
        const isPE_ITM = spotPrice > 0 && item.strike > spotPrice;

        return (
            <View style={styles.row}>
                {/* CE Side */}
                <View style={[styles.cell, styles.ceSide, isCE_ITM && styles.itmBg]}>
                    <Text style={styles.oiText}>{item.CE?.open_interest || '-'}</Text>
                </View>
                <View style={[styles.cell, styles.ceSide, isCE_ITM && styles.itmBg]}>
                    <Text style={[styles.ltpText, item.CE?.change_in_oi < 0 ? styles.red : styles.green]}>
                        {item.CE?.ltp?.toFixed(2) || '-'}
                    </Text>
                </View>

                {/* Strike */}
                <View style={[styles.cell, styles.strikeCell]}>
                    <Text style={styles.strikeText}>{item.strike}</Text>
                </View>

                {/* PE Side */}
                <View style={[styles.cell, styles.peSide, isPE_ITM && styles.itmBg]}>
                    <Text style={[styles.ltpText, item.PE?.change_in_oi < 0 ? styles.red : styles.green]}>
                        {item.PE?.ltp?.toFixed(2) || '-'}
                    </Text>
                </View>
                <View style={[styles.cell, styles.peSide, isPE_ITM && styles.itmBg]}>
                    <Text style={styles.oiText}>{item.PE?.open_interest || '-'}</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {renderHeader()}
            <FlatList
                data={processedData}
                renderItem={renderItem}
                keyExtractor={item => item.strike.toString()}
                initialNumToRender={20}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    headerRow: {
        flexDirection: 'row',
        backgroundColor: '#f8f9fa',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        paddingVertical: 8,
    },
    headerCell: {
        flex: 1,
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    callHeader: { color: '#00af50' }, // Greenish
    putHeader: { color: '#ff4444' }, // Reddish
    strikeHeader: { color: '#333', flex: 0.8 },

    row: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        height: 48, // Fixed height for consistency
        alignItems: 'center',
    },
    cell: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
    },
    ceSide: { borderRightWidth: 1, borderRightColor: '#f0f0f0' },
    peSide: { borderLeftWidth: 1, borderLeftColor: '#f0f0f0' },
    strikeCell: {
        flex: 0.8,
        backgroundColor: '#f1f3f5',
        alignItems: 'center',
        justifyContent: 'center'
    },

    itmBg: {
        backgroundColor: '#f2eed9', // The requested ITM color
    },

    oiText: { fontSize: 10, color: '#666' },
    ltpText: { fontSize: 12, fontWeight: '600' },
    strikeText: { fontSize: 12, fontWeight: 'bold' },

    green: { color: '#28a745' },
    red: { color: '#dc3545' },
});
