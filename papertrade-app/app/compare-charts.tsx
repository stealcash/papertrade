import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, ScrollView, Modal, TextInput, Platform, Dimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { stocksAPI } from '@/services/stocks';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width, height } = Dimensions.get('window');

// Colors for different stock lines (matching website)
const CHART_COLORS = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#9333ea'];

export default function CompareChartsScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    // State
    const [selectedStockIds, setSelectedStockIds] = useState<number[]>([]);
    const [selectedStocks, setSelectedStocks] = useState<any[]>([]);
    const [prices, setPrices] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Search State
    const [isSelectionOpen, setIsSelectionOpen] = useState(false);
    const [allStocks, setAllStocks] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loadingStocks, setLoadingStocks] = useState(false);

    // Date State
    const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const [endDate, setEndDate] = useState(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    const webViewRef = useRef<WebView>(null);

    // Initial load prompt
    useEffect(() => {
        if (selectedStockIds.length === 0) {
            setIsSelectionOpen(true);
        }
    }, []);

    // Fetch Prices
    const fetchPrices = async () => {
        const validIds = selectedStockIds.filter(id => !isNaN(id) && id > 0);
        if (validIds.length === 0) {
            setPrices([]);
            return;
        }

        setLoading(true);
        try {
            const params = {
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0],
                stock_ids: validIds.join(',')
            };
            const res = await stocksAPI.getPrices(params);
            const data = res.data?.data || res.data;
            setPrices(Array.isArray(data) ? data : []);
        } catch (error: any) {
            console.error('Failed to fetch prices', error);
            if (error.response?.status === 500) {
                Alert.alert("Server Error", "Something went wrong on the server.");
            } else {
                Alert.alert("Error", "Failed to load comparison data.");
            }
            setPrices([]);
        } finally {
            setLoading(false);
        }
    };

    // Inject data into WebView when prices update
    useEffect(() => {
        if (webViewRef.current && prices.length > 0) {
            const chartData = processDataForChart();
            const payload = JSON.stringify({ type: 'UPDATE_DATA', data: chartData, colors: CHART_COLORS, isDark: colorScheme === 'dark' });
            webViewRef.current.postMessage(payload);
        }
    }, [prices, colorScheme]);

    const processDataForChart = () => {
        if (!prices.length || selectedStockIds.length === 0) return [];

        const lines: any[] = [];
        selectedStockIds.forEach((stockId, index) => {
            const stock = selectedStocks.find(s => s.id === stockId);
            if (!stock) return;

            const symbol = stock.symbol;
            // Filter prices for this stock
            const stockPrices = prices
                .filter(p => p.stock === stockId || p.stock_details?.id === stockId || p.stock_symbol === symbol)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            if (stockPrices.length > 0) {
                const startPrice = stockPrices[0].close_price;
                const dataPoints = stockPrices.map(p => ({
                    time: p.date,
                    value: startPrice !== 0 ? ((p.close_price - startPrice) / startPrice) * 100 : 0
                }));

                lines.push({
                    symbol: symbol,
                    data: dataPoints,
                    color: CHART_COLORS[index % CHART_COLORS.length]
                });
            }
        });
        return lines;
    };


    // Stock Search Logic
    const fetchAllStocks = async () => {
        if (!isSelectionOpen) return;
        setLoadingStocks(true);
        try {
            const res = await stocksAPI.getAll({ page_size: 50, search: searchQuery });
            const data = res.data?.data || res.data;
            const list = data.stocks || data.results || [];
            setAllStocks(Array.isArray(list) ? list : []);
        } catch (error) {
            console.error(error);
            setAllStocks([]);
        } finally {
            setLoadingStocks(false);
        }
    };

    useEffect(() => {
        if (isSelectionOpen) {
            fetchAllStocks();
        }
    }, [isSelectionOpen, searchQuery]);

    const toggleStockSelection = (stock: any) => {
        const isSelected = selectedStockIds.includes(stock.id);
        if (isSelected) {
            setSelectedStockIds(prev => prev.filter(id => id !== stock.id));
            setSelectedStocks(prev => prev.filter(s => s.id !== stock.id));
        } else {
            if (selectedStockIds.length >= 4) {
                Alert.alert("Limit Reached", "You can compare up to 4 stocks.");
                return;
            }
            setSelectedStockIds(prev => [...prev, stock.id]);
            setSelectedStocks(prev => [...prev, stock]);
        }
    };

    // HTML Content for WebView
    const chartHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js"></script>
        <style>
          body { margin: 0; padding: 0; background-color: ${colors.card}; overflow: hidden; }
          #chart { width: 100vw; height: 100vh; }
        </style>
      </head>
      <body>
        <div id="chart"></div>
        <script>
          const chartContainer = document.getElementById('chart');
          const chart = LightweightCharts.createChart(chartContainer, {
             layout: { 
                 background: { type: 'solid', color: '${colors.card}' }, 
                 textColor: '${colors.text}' 
             },
             grid: { 
                 vertLines: { color: '${colors.border}' }, 
                 horzLines: { color: '${colors.border}' } 
             },
             width: chartContainer.clientWidth,
             height: chartContainer.clientHeight,
             timeScale: {
                 timeVisible: true,
                 secondsVisible: false,
             }
          });

          let seriesMap = {};

          // Resize handler
          window.addEventListener('resize', () => {
             chart.resize(chartContainer.clientWidth, chartContainer.clientHeight);
          });

          // Message Handler
          document.addEventListener('message', (event) => {
             handleMessage(event.data);
          });
          window.addEventListener('message', (event) => {
             handleMessage(event.data);
          });

          function handleMessage(message) {
             try {
                 const parsed = JSON.parse(message);
                 if (parsed.type === 'UPDATE_DATA') {
                     updateChart(parsed.data, parsed.colors, parsed.isDark);
                 }
             } catch(e) {
                 // console.log(e);
             }
          }

          function updateChart(lines, colors, isDark) {
             // Clear existing series
             Object.values(seriesMap).forEach(s => chart.removeSeries(s));
             seriesMap = {};

             // Update Layout Colors if changed
             const bgColor = isDark ? '#1f2937' : '#ffffff';
             const textColor = isDark ? '#e5e7eb' : '#1f2937';
             const gridColor = isDark ? '#374151' : '#e5e7eb';
             
             chart.applyOptions({
                 layout: { background: { color: bgColor }, textColor: textColor },
                 grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } }
             });

             lines.forEach((line, index) => {
                 const series = chart.addLineSeries({
                     color: line.color,
                     lineWidth: 2,
                     title: line.symbol,
                 });
                 series.setData(line.data);
                 seriesMap[line.symbol] = series;
             });

             chart.timeScale().fitContent();
          }
        </script>
      </body>
      </html>
    `;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ title: 'Compare Charts', headerShown: true }} />

            {/* Top Bar Controls */}
            <View style={[styles.controlsContainer, { borderBottomColor: colors.border }]}>
                {/* Search Trigger & Chips */}
                <View style={[styles.searchRow]}>
                    <TouchableOpacity
                        style={[styles.searchButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => setIsSelectionOpen(true)}
                    >
                        <Feather name="search" size={16} color={colors.tabIconDefault} />
                        <Text style={[styles.searchText, { color: colors.tabIconDefault }]}>
                            {selectedStocks.length > 0 ? 'Add more...' : 'Search stocks...'}
                        </Text>
                    </TouchableOpacity>

                    {selectedStocks.map(stock => (
                        <TouchableOpacity key={stock.id} onPress={() => toggleStockSelection(stock)} style={[styles.chip, { backgroundColor: colors.tint + '20', borderColor: colors.tint }]}>
                            <Text style={[styles.chipText, { color: colors.tint }]}>{stock.symbol}</Text>
                            <Feather name="x" size={12} color={colors.tint} />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Date & Apply */}
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.dateButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => setShowStartPicker(true)}
                    >
                        <Feather name="calendar" size={14} color={colors.text} />
                        <Text style={[styles.dateText, { color: colors.text }]}>
                            {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.applyButton, { backgroundColor: colors.tint, opacity: loading ? 0.7 : 1 }]}
                        onPress={fetchPrices}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.applyText}>Apply</Text>}
                    </TouchableOpacity>
                </View>
            </View>

            {/* WebView Chart */}
            <View style={styles.chartContainer}>
                {prices.length > 0 ? (
                    <WebView
                        ref={webViewRef}
                        originWhitelist={['*']}
                        source={{ html: chartHtml }}
                        style={{ backgroundColor: colors.card }}
                        onMessage={(event) => { }}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                    />
                ) : (
                    <View style={[styles.emptyState, { backgroundColor: colors.background }]}>
                        <Feather name="bar-chart-2" size={48} color={colors.tabIconDefault} />
                        <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
                            Select stocks and click Apply to compare
                        </Text>
                    </View>
                )}
            </View>

            {/* Date Pickers */}
            {showStartPicker && (
                <DateTimePicker
                    value={startDate}
                    mode="date"
                    display="default"
                    onChange={(e, d) => { setShowStartPicker(Platform.OS === 'ios'); if (d) setStartDate(d); }}
                />
            )}
            {showEndPicker && (
                <DateTimePicker
                    value={endDate}
                    mode="date"
                    display="default"
                    onChange={(e, d) => { setShowEndPicker(Platform.OS === 'ios'); if (d) setEndDate(d); }}
                />
            )}

            {/* Modal for Selection */}
            <Modal visible={isSelectionOpen} animationType="slide" presentationStyle="pageSheet">
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Select Stocks</Text>
                        <TouchableOpacity onPress={() => setIsSelectionOpen(false)}>
                            <Text style={{ color: colors.tint, fontSize: 16, fontWeight: '600' }}>Done</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.modalSearch, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Feather name="search" size={18} color={colors.tabIconDefault} />
                        <TextInput
                            style={[styles.modalInput, { color: colors.text }]}
                            placeholder="Search..."
                            placeholderTextColor={colors.tabIconDefault}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    <ScrollView>
                        {loadingStocks ? <ActivityIndicator style={{ marginTop: 20 }} /> : allStocks.map(stock => (
                            <TouchableOpacity
                                key={stock.id}
                                style={[styles.stockItem, { borderBottomColor: colors.border }]}
                                onPress={() => toggleStockSelection(stock)}
                            >
                                <View>
                                    <Text style={[styles.stockSymbol, { color: colors.text }]}>{stock.symbol}</Text>
                                    <Text style={[styles.stockName, { color: colors.tabIconDefault }]}>{stock.name}</Text>
                                </View>
                                {selectedStockIds.includes(stock.id) ?
                                    <Feather name="check-circle" size={20} color={colors.tint} /> :
                                    <Feather name="circle" size={20} color={colors.tabIconDefault} />
                                }
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    controlsContainer: { padding: 12, borderBottomWidth: 1 },
    searchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    searchButton: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10,
        height: 32, borderRadius: 16, borderWidth: 1, gap: 6
    },
    searchText: { fontSize: 12 },
    chip: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10,
        height: 32, borderRadius: 16, borderWidth: 1, gap: 4
    },
    chipText: { fontSize: 12, fontWeight: '600' },

    actionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    dateButton: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        height: 40, borderRadius: 8, borderWidth: 1, gap: 8
    },
    dateText: { fontSize: 13, fontWeight: '500' },
    applyButton: {
        width: 80, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center'
    },
    applyText: { color: '#fff', fontWeight: 'bold' },

    chartContainer: { flex: 1 },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    emptyText: { fontSize: 14 },

    modalContainer: { flex: 1 },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16, borderBottomWidth: 1
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    modalSearch: {
        flexDirection: 'row', alignItems: 'center', margin: 16, paddingHorizontal: 12,
        height: 44, borderRadius: 8, borderWidth: 1
    },
    modalInput: { flex: 1, marginLeft: 8, fontSize: 16, height: '100%' },
    stockItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16, borderBottomWidth: 1
    },
    stockSymbol: { fontSize: 16, fontWeight: 'bold' },
    stockName: { fontSize: 12, marginTop: 4 },
});
