import React, { useMemo } from 'react';
import { StyleSheet, View, Text, FlatList, ScrollView, Platform } from 'react-native';

interface OptionData {
    strike_price: number;
    option_type: 'CE' | 'PE';
    ltp: number;
    open_interest: number;
    change_in_oi: number;
}

export interface VisibleColumns {
    oi: boolean;
    oiChange: boolean;
    volume: boolean;
    open: boolean;
    high: boolean;
    low: boolean;
    close: boolean;
    ltp: boolean;
    priceChange: boolean;
}

interface OptionChainTableProps {
    data: any[]; // Raw API data
    spotPrice?: number; // For highlighting ITM
    viewMode?: 'CE' | 'PE' | 'BOTH';
    visibleColumns?: VisibleColumns;
}

export function OptionChainTable({
    data,
    spotPrice = 0,
    viewMode = 'BOTH',
    visibleColumns = {
        oi: true,
        oiChange: true,
        volume: true,
        open: true,
        high: true,
        low: true,
        close: true,
        ltp: true,
        priceChange: false
    }
}: OptionChainTableProps) {

    // Group Data by Date (similar to website logic)
    const groupedData = useMemo(() => {
        const groups: Record<string, any[]> = {};
        data.forEach(item => {
            const date = item.date;
            if (!groups[date]) groups[date] = [];
            groups[date].push(item);
        });

        // Sort dates descending
        return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
    }, [data]);

    const processSideBySide = (items: any[]) => {
        const strikeMap = new Map<number, { strike: number, CE?: any, PE?: any }>();
        items.forEach(item => {
            const strike = item.strike_price;
            if (!strikeMap.has(strike)) {
                strikeMap.set(strike, { strike });
            }
            const entry = strikeMap.get(strike)!;
            if (item.option_type === 'CE') entry.CE = item;
            if (item.option_type === 'PE') entry.PE = item;
        });
        return Array.from(strikeMap.values()).sort((a, b) => a.strike - b.strike);
    };

    const renderHeader = () => (
        <View style={styles.headerRow}>
            {viewMode !== 'PE' && (
                <>
                    {visibleColumns.oi && <Text style={[styles.headerCell, styles.callHeader]}>OI</Text>}
                    {visibleColumns.oiChange && <Text style={[styles.headerCell, styles.callHeader]}>OI Chg</Text>}
                    {visibleColumns.volume && <Text style={[styles.headerCell, styles.callHeader]}>Vol</Text>}
                    {visibleColumns.open && <Text style={[styles.headerCell, styles.callHeader]}>Open</Text>}
                    {visibleColumns.high && <Text style={[styles.headerCell, styles.callHeader]}>High</Text>}
                    {visibleColumns.low && <Text style={[styles.headerCell, styles.callHeader]}>Low</Text>}
                    {visibleColumns.close && <Text style={[styles.headerCell, styles.callHeader]}>Close</Text>}
                    {visibleColumns.ltp && <Text style={[styles.headerCell, styles.callHeader]}>LTP</Text>}
                    {visibleColumns.priceChange && <Text style={[styles.headerCell, styles.callHeader]}>Chg</Text>}
                </>
            )}

            <Text style={[styles.headerCell, styles.strikeHeader]}>Strike</Text>

            {viewMode !== 'CE' && (
                <>
                    {visibleColumns.priceChange && <Text style={[styles.headerCell, styles.putHeader]}>Chg</Text>}
                    {visibleColumns.ltp && <Text style={[styles.headerCell, styles.putHeader]}>LTP</Text>}
                    {visibleColumns.close && <Text style={[styles.headerCell, styles.putHeader]}>Close</Text>}
                    {visibleColumns.low && <Text style={[styles.headerCell, styles.putHeader]}>Low</Text>}
                    {visibleColumns.high && <Text style={[styles.headerCell, styles.putHeader]}>High</Text>}
                    {visibleColumns.open && <Text style={[styles.headerCell, styles.putHeader]}>Open</Text>}
                    {visibleColumns.volume && <Text style={[styles.headerCell, styles.putHeader]}>Vol</Text>}
                    {visibleColumns.oiChange && <Text style={[styles.headerCell, styles.putHeader]}>OI Chg</Text>}
                    {visibleColumns.oi && <Text style={[styles.headerCell, styles.putHeader]}>OI</Text>}
                </>
            )}
        </View>
    );

    const renderRow = (item: any, sectionSpot: number) => {
        const isCE_ITM = sectionSpot > 0 && item.strike < sectionSpot;
        const isPE_ITM = sectionSpot > 0 && item.strike > sectionSpot;

        const cePriceChg = item.CE ? (Number(item.CE.ltp) - Number(item.CE.prev_close || item.CE.ltp)) : 0;
        const pePriceChg = item.PE ? (Number(item.PE.ltp) - Number(item.PE.prev_close || item.PE.ltp)) : 0;

        return (
            <View key={item.strike} style={styles.row}>
                {/* CE Side */}
                {viewMode !== 'PE' && (
                    <>
                        {visibleColumns.oi && (
                            <View style={[styles.cell, styles.ceSide, isCE_ITM && styles.itmBg]}>
                                <Text style={styles.oiText}>{item.CE?.open_interest || '-'}</Text>
                            </View>
                        )}
                        {visibleColumns.oiChange && (
                            <View style={[styles.cell, styles.ceSide, isCE_ITM && styles.itmBg]}>
                                <Text style={[styles.oiText, item.CE?.change_in_oi < 0 ? styles.red : styles.green]}>
                                    {item.CE?.change_in_oi || '0'}
                                </Text>
                            </View>
                        )}
                        {visibleColumns.volume && (
                            <View style={[styles.cell, styles.ceSide, isCE_ITM && styles.itmBg]}>
                                <Text style={styles.oiText}>{item.CE?.volume || '-'}</Text>
                            </View>
                        )}
                        {visibleColumns.open && (
                            <View style={[styles.cell, styles.ceSide, isCE_ITM && styles.itmBg]}>
                                <Text style={styles.oiText}>{item.CE?.open_price || '-'}</Text>
                            </View>
                        )}
                        {visibleColumns.high && (
                            <View style={[styles.cell, styles.ceSide, isCE_ITM && styles.itmBg]}>
                                <Text style={styles.oiText}>{item.CE?.high_price || '-'}</Text>
                            </View>
                        )}
                        {visibleColumns.low && (
                            <View style={[styles.cell, styles.ceSide, isCE_ITM && styles.itmBg]}>
                                <Text style={styles.oiText}>{item.CE?.low_price || '-'}</Text>
                            </View>
                        )}
                        {visibleColumns.close && (
                            <View style={[styles.cell, styles.ceSide, isCE_ITM && styles.itmBg]}>
                                <Text style={styles.oiText}>{item.CE?.close_price || '-'}</Text>
                            </View>
                        )}
                        {visibleColumns.ltp && (
                            <View style={[styles.cell, styles.ceSide, isCE_ITM && styles.itmBg]}>
                                <Text style={[styles.ltpText, cePriceChg < 0 ? styles.red : styles.green]}>
                                    {item.CE?.ltp != null ? Number(item.CE.ltp).toFixed(2) : '-'}
                                </Text>
                            </View>
                        )}
                        {visibleColumns.priceChange && (
                            <View style={[styles.cell, styles.ceSide, isCE_ITM && styles.itmBg]}>
                                <Text style={[styles.oiText, cePriceChg < 0 ? styles.red : styles.green]}>
                                    {cePriceChg.toFixed(2)}
                                </Text>
                            </View>
                        )}
                    </>
                )}

                {/* Strike */}
                <View style={[styles.cell, styles.strikeCell]}>
                    <Text style={styles.strikeText}>{Number(item.strike).toFixed(0)}</Text>
                </View>

                {/* PE Side */}
                {viewMode !== 'CE' && (
                    <>
                        {visibleColumns.priceChange && (
                            <View style={[styles.cell, styles.peSide, isPE_ITM && styles.itmBg]}>
                                <Text style={[styles.oiText, pePriceChg < 0 ? styles.red : styles.green]}>
                                    {pePriceChg.toFixed(2)}
                                </Text>
                            </View>
                        )}
                        {visibleColumns.ltp && (
                            <View style={[styles.cell, styles.peSide, isPE_ITM && styles.itmBg]}>
                                <Text style={[styles.ltpText, pePriceChg < 0 ? styles.red : styles.green]}>
                                    {item.PE?.ltp != null ? Number(item.PE.ltp).toFixed(2) : '-'}
                                </Text>
                            </View>
                        )}
                        {visibleColumns.close && (
                            <View style={[styles.cell, styles.peSide, isPE_ITM && styles.itmBg]}>
                                <Text style={styles.oiText}>{item.PE?.close_price || '-'}</Text>
                            </View>
                        )}
                        {visibleColumns.low && (
                            <View style={[styles.cell, styles.peSide, isPE_ITM && styles.itmBg]}>
                                <Text style={styles.oiText}>{item.PE?.low_price || '-'}</Text>
                            </View>
                        )}
                        {visibleColumns.high && (
                            <View style={[styles.cell, styles.peSide, isPE_ITM && styles.itmBg]}>
                                <Text style={styles.oiText}>{item.PE?.high_price || '-'}</Text>
                            </View>
                        )}
                        {visibleColumns.open && (
                            <View style={[styles.cell, styles.peSide, isPE_ITM && styles.itmBg]}>
                                <Text style={styles.oiText}>{item.PE?.open_price || '-'}</Text>
                            </View>
                        )}
                        {visibleColumns.volume && (
                            <View style={[styles.cell, styles.peSide, isPE_ITM && styles.itmBg]}>
                                <Text style={styles.oiText}>{item.PE?.volume || '-'}</Text>
                            </View>
                        )}
                        {visibleColumns.oiChange && (
                            <View style={[styles.cell, styles.peSide, isPE_ITM && styles.itmBg]}>
                                <Text style={[styles.oiText, item.PE?.change_in_oi < 0 ? styles.red : styles.green]}>
                                    {item.PE?.change_in_oi || '0'}
                                </Text>
                            </View>
                        )}
                        {visibleColumns.oi && (
                            <View style={[styles.cell, styles.peSide, isPE_ITM && styles.itmBg]}>
                                <Text style={styles.oiText}>{item.PE?.open_interest || '-'}</Text>
                            </View>
                        )}
                    </>
                )}
            </View>
        );
    };

    if (data.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No data available for the selected filters.</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} stickyHeaderIndices={[0]}>
            {groupedData.map(([date, items], index) => {
                const sectionProcessed = processSideBySide(items);
                const sectionSpot = Number(items[0]?.underlying_value) || spotPrice;

                return (
                    <View key={date} style={styles.dateSection}>
                        <View style={styles.dateHeader}>
                            <View style={styles.dateBadge}>
                                <Text style={styles.dateBadgeText}>
                                    {new Date(date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
                                </Text>
                            </View>
                            <Text style={styles.sectionSpotText}>
                                Spot: <Text style={styles.spotValue}>{sectionSpot.toFixed(2)}</Text>
                            </Text>
                        </View>

                        {index === 0 && renderHeader()}

                        {sectionProcessed.map((row) => renderRow(row, sectionSpot))}
                    </View>
                );
            })}
        </ScrollView>
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
    callHeader: { color: '#00af50' },
    putHeader: { color: '#ff4444' },
    strikeHeader: { color: '#333', flex: 0.8 },

    row: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        height: 48,
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
        backgroundColor: '#f2eed9',
    },
    oiText: { fontSize: 10, color: '#666' },
    ltpText: { fontSize: 12, fontWeight: '600' },
    strikeText: { fontSize: 12, fontWeight: 'bold' },
    green: { color: '#28a745' },
    red: { color: '#dc3545' },

    // Date Grouping Styles
    dateSection: {
        marginBottom: 20,
    },
    dateHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f1f8fa',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#0a7ea422',
    },
    dateBadge: {
        backgroundColor: '#0a7ea4',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
    },
    dateBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
    },
    sectionSpotText: {
        fontSize: 13,
        color: '#666',
        fontWeight: '600',
    },
    spotValue: {
        color: '#0a7ea4',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        fontSize: 14,
    }
});
