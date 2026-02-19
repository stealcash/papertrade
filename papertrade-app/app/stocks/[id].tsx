import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, Dimensions } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { stocksAPI } from '@/services/stocks';
import { watchlistAPI } from '@/services/watchlist';
import { portfolioAPI } from '@/services/portfolio';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/Colors';
import PredictionModal from '@/components/PredictionModal';

export default function StockDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';

    const [stock, setStock] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isInWatchlist, setIsInWatchlist] = useState(false);
    const [watchlistId, setWatchlistId] = useState<number | null>(null);
    const [chartData, setChartData] = useState<any[]>([]);

    // Trade Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [quantity, setQuantity] = useState('1');
    const [tradeLoading, setTradeLoading] = useState(false);

    // Prediction Modal
    const [predictionVisible, setPredictionVisible] = useState(false);

    useEffect(() => {
        fetchDetails();
        checkWatchlist();
    }, [id]);

    const fetchDetails = async () => {
        try {
            const [stockRes, pricesRes] = await Promise.all([
                stocksAPI.getById(Number(id)),
                stocksAPI.getPrices({ stock_id: Number(id), days: 365 })
            ]);
            setStock(stockRes.data?.data || stockRes.data);

            const rawPrices = pricesRes.data?.data || pricesRes.data || [];
            const formatted = (Array.isArray(rawPrices) ? rawPrices : [])
                .map((d: any) => ({
                    time: d.date,
                    open: Number(d.open_price),
                    high: Number(d.high_price),
                    low: Number(d.low_price),
                    close: Number(d.close_price),
                }))
                .sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());
            setChartData(formatted);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to load stock details");
        } finally {
            setLoading(false);
        }
    };

    const checkWatchlist = async () => {
        try {
            const res = await watchlistAPI.getAll();
            const data = res.data?.data || res.data || [];
            const items = data.stocks || (Array.isArray(data) ? data : []);
            const found = items.find((i: any) => i.stock_details.id === Number(id));
            if (found) {
                setIsInWatchlist(true);
                setWatchlistId(found.id);
            } else {
                setIsInWatchlist(false);
                setWatchlistId(null);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const toggleWatchlist = async () => {
        try {
            if (isInWatchlist && watchlistId) {
                await watchlistAPI.remove(watchlistId);
                setIsInWatchlist(false);
                setWatchlistId(null);
            } else {
                const res = await watchlistAPI.add(Number(id));
                setIsInWatchlist(true);
                checkWatchlist();
            }
        } catch (e) {
            Alert.alert("Error", "Failed to update watchlist");
        }
    };

    const handleBuy = async () => {
        const qty = parseInt(quantity);
        if (isNaN(qty) || qty <= 0) {
            Alert.alert("Invalid Quantity", "Please enter a valid quantity.");
            return;
        }

        setTradeLoading(true);
        try {
            await portfolioAPI.trade({
                stock_id: Number(id),
                quantity: qty,
                action: 'BUY'
            });
            Alert.alert("Success", "Buy order executed!", [
                { text: "OK", onPress: () => setModalVisible(false) }
            ]);
            fetchDetails();
        } catch (error: any) {
            const msg = error.response?.data?.message || "Trade failed";
            Alert.alert("Error", msg);
        } finally {
            setTradeLoading(false);
        }
    };

    // Build chart HTML
    const chartHtml = useMemo(() => {
        if (!chartData.length) return '';
        const bg = isDark ? '#1f2937' : '#ffffff';
        const text = isDark ? '#e5e7eb' : '#1f2937';
        const gridC = isDark ? '#374151' : '#e5e7eb';
        const dataStr = JSON.stringify(chartData);

        return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:${bg};font-family:-apple-system,sans-serif;-webkit-user-select:none;user-select:none;overflow:hidden}
.wrap{position:relative}canvas{display:block}
.ov{position:absolute;top:0;left:0;touch-action:none}
.tt{position:absolute;display:none;padding:6px 8px;border-radius:6px;font-size:9px;line-height:1.5;pointer-events:none;z-index:10;
  background:${isDark ? 'rgba(17,24,39,0.92)' : 'rgba(255,255,255,0.95)'};
  border:1px solid ${isDark ? '#374151' : '#e5e7eb'};
  box-shadow:0 2px 8px rgba(0,0,0,0.12);color:${text};white-space:nowrap;backdrop-filter:blur(4px)}
.tt-date{font-weight:700;color:${isDark ? '#93c5fd' : '#2563eb'};margin-bottom:2px}
.up{color:#10b981}.dn{color:#ef4444}
</style></head><body>
<div class="wrap">
  <canvas id="c"></canvas>
  <canvas id="ov" class="ov"></canvas>
  <div id="tt" class="tt"></div>
</div>
<script>
var data=${dataStr};
var bg='${bg}',textC='${text}',gridC='${gridC}';
var st={};

function draw(){
  var c=document.getElementById('c'),ov=document.getElementById('ov');
  var W=window.innerWidth,H=window.innerHeight;
  c.width=W*2;c.height=H*2;c.style.width=W+'px';c.style.height=H+'px';
  ov.width=W*2;ov.height=H*2;ov.style.width=W+'px';ov.style.height=H+'px';
  var ctx=c.getContext('2d');ctx.scale(2,2);

  var pad={l:52,r:10,t:12,b:30};
  var cW=W-pad.l-pad.r,cH=H-pad.t-pad.b;

  var allH=data.map(function(d){return d.high});
  var allL=data.map(function(d){return d.low});
  var maxP=Math.max.apply(null,allH),minP=Math.min.apply(null,allL);
  var range=maxP-minP||1;minP-=range*0.05;maxP+=range*0.05;range=maxP-minP;

  st={W:W,H:H,pad:pad,cW:cW,cH:cH,minP:minP,maxP:maxP,range:range};

  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);

  // Grid
  ctx.strokeStyle=gridC;ctx.lineWidth=0.5;
  for(var i=0;i<=5;i++){
    var y=pad.t+cH*(i/5);
    ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(W-pad.r,y);ctx.stroke();
    ctx.fillStyle='#9ca3af';ctx.font='9px -apple-system,sans-serif';ctx.textAlign='right';
    ctx.fillText((maxP-range*(i/5)).toFixed(1),pad.l-6,y+3);
  }

  // Candlesticks
  var barW=Math.max(1,Math.min(8,(cW/data.length)*0.6));
  data.forEach(function(d,i){
    var x=pad.l+(i/(data.length-1||1))*cW;
    var isUp=d.close>=d.open;var color=isUp?'#10b981':'#ef4444';
    var highY=pad.t+((maxP-d.high)/range)*cH;var lowY=pad.t+((maxP-d.low)/range)*cH;
    ctx.strokeStyle=color;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,highY);ctx.lineTo(x,lowY);ctx.stroke();
    var openY=pad.t+((maxP-d.open)/range)*cH;var closeY=pad.t+((maxP-d.close)/range)*cH;
    ctx.fillStyle=color;ctx.fillRect(x-barW/2,Math.min(openY,closeY),barW,Math.max(Math.abs(openY-closeY),1));
  });

  // X labels
  var lc=Math.min(5,data.length);
  ctx.fillStyle='#9ca3af';ctx.font='9px -apple-system,sans-serif';ctx.textAlign='center';
  for(var i=0;i<lc;i++){
    var idx=Math.floor(i*(data.length-1)/(lc-1||1));var dt=new Date(data[idx].time);
    ctx.fillText(dt.getDate()+'/'+(dt.getMonth()+1),pad.l+(idx/(data.length-1||1))*cW,H-pad.b+18);
  }
}

// Crosshair
function drawCH(px,py){
  var ov=document.getElementById('ov'),tt=document.getElementById('tt');
  var ctx=ov.getContext('2d');ctx.clearRect(0,0,ov.width,ov.height);ctx.scale(2,2);
  var x=Math.max(st.pad.l,Math.min(px,st.W-st.pad.r));
  var y=Math.max(st.pad.t,Math.min(py,st.pad.t+st.cH));

  ctx.strokeStyle='${isDark ? '#6b7280' : '#9ca3af'}';ctx.lineWidth=1;ctx.setLineDash([3,3]);
  ctx.beginPath();ctx.moveTo(x,st.pad.t);ctx.lineTo(x,st.pad.t+st.cH);ctx.stroke();
  ctx.beginPath();ctx.moveTo(st.pad.l,y);ctx.lineTo(st.W-st.pad.r,y);ctx.stroke();
  ctx.setLineDash([]);

  var yVal=st.maxP-((y-st.pad.t)/st.cH)*st.range;
  ctx.fillStyle='${isDark ? '#374151' : '#e5e7eb'}';ctx.fillRect(st.pad.l-48,y-8,44,16);
  ctx.fillStyle='${text}';ctx.font='bold 9px -apple-system,sans-serif';ctx.textAlign='right';
  ctx.fillText('₹'+yVal.toFixed(1),st.pad.l-8,y+3);

  var ratio=(x-st.pad.l)/st.cW;
  var idx=Math.round(ratio*(data.length-1));idx=Math.max(0,Math.min(idx,data.length-1));
  var d=data[idx];var cx=st.pad.l+(idx/(data.length-1||1))*st.cW;
  var isUp=d.close>=d.open;
  var closeY=st.pad.t+((st.maxP-d.close)/st.range)*st.cH;

  ctx.fillStyle=isUp?'#10b981':'#ef4444';
  ctx.beginPath();ctx.arc(cx,closeY,4,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=bg;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(cx,closeY,4,0,Math.PI*2);ctx.stroke();

  var dd=new Date(d.time);var cls=isUp?'up':'dn';
  tt.innerHTML='<div class="tt-date">'+dd.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})+'</div>'
    +'<div>O: ₹'+d.open.toFixed(2)+' H: ₹'+d.high.toFixed(2)+'</div>'
    +'<div>L: ₹'+d.low.toFixed(2)+' C: <span class="'+cls+'">₹'+d.close.toFixed(2)+'</span></div>';
  tt.style.display='block';
  var tx=cx+14;if(tx+110>st.W)tx=cx-120;
  var ty=closeY-90;if(ty<5)ty=closeY+30;
  tt.style.left=tx+'px';tt.style.top=ty+'px';
  ctx.setTransform(1,0,0,1,0,0);
}

function clearCH(){
  var ov=document.getElementById('ov');
  ov.getContext('2d').clearRect(0,0,ov.width,ov.height);
  document.getElementById('tt').style.display='none';
}

var ovEl=document.getElementById('ov');
ovEl.addEventListener('touchstart',function(e){e.preventDefault();var r=ovEl.getBoundingClientRect();drawCH(e.touches[0].clientX-r.left,e.touches[0].clientY-r.top)},{passive:false});
ovEl.addEventListener('touchmove',function(e){e.preventDefault();var r=ovEl.getBoundingClientRect();drawCH(e.touches[0].clientX-r.left,e.touches[0].clientY-r.top)},{passive:false});
ovEl.addEventListener('touchend',function(){clearCH()});
draw();
window.addEventListener('resize',function(){draw();clearCH()});
</script></body></html>`;
    }, [chartData, isDark]);

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={colors.tint} />
            </View>
        );
    }

    if (!stock) {
        return (
            <View style={[styles.container, styles.center]}>
                <Text>Stock not found</Text>
            </View>
        );
    }

    const isPositive = (stock.price_change || 0) >= 0;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ title: stock.symbol, headerShown: true }} />

            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.topRow}>
                        <View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={[styles.symbol, { color: colors.text }]}>{stock.symbol}</Text>
                                {stock.is_index && (
                                    <View style={{ backgroundColor: '#dbeafe', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                        <Text style={{ color: '#1d4ed8', fontSize: 10, fontWeight: 'bold' }}>INDEX</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={[styles.name, { color: colors.tabIconDefault }]}>{stock.name}</Text>
                        </View>
                        <TouchableOpacity onPress={toggleWatchlist}>
                            <FontAwesome
                                name={isInWatchlist ? "star" : "star-o"}
                                size={24}
                                color={isInWatchlist ? "#f59e0b" : colors.tabIconDefault}
                            />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.priceRow}>
                        <Text style={[styles.price, { color: colors.text }]}>₹{stock.last_price}</Text>
                        <View style={[styles.badge, { backgroundColor: isPositive ? '#dcfce7' : '#fee2e2' }]}>
                            <FontAwesome name={isPositive ? "caret-up" : "caret-down"} size={14} color={isPositive ? "#15803d" : "#b91c1c"} />
                            <Text style={[styles.changeText, { color: isPositive ? "#15803d" : "#b91c1c" }]}>
                                {Math.abs(stock.price_change || 0).toFixed(2)}%
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Price Chart */}
                {chartData.length > 0 && (
                    <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Price Chart</Text>
                        <View style={styles.chartContainer}>
                            <WebView
                                originWhitelist={['*']}
                                source={{ html: chartHtml }}
                                style={{ flex: 1, backgroundColor: isDark ? '#1f2937' : '#ffffff' }}
                                onMessage={() => { }}
                                javaScriptEnabled={true}
                                domStorageEnabled={true}
                                scrollEnabled={false}
                                scalesPageToFit={false}
                            />
                        </View>
                    </View>
                )}

                {/* Stats Grid */}
                <View style={styles.statsContainer}>
                    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={styles.statLabel}>Open</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>₹{stock.open || '--'}</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={styles.statLabel}>High</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>₹{stock.high || '--'}</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={styles.statLabel}>Low</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>₹{stock.low || '--'}</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={styles.statLabel}>Close</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>₹{stock.close || '--'}</Text>
                    </View>
                </View>

                <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
                    <Text style={[styles.description, { color: colors.tabIconDefault }]}>
                        {stock.description || 'No description available for this stock.'}
                    </Text>
                </View>

            </ScrollView>

            {!stock.is_index && (
                <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                    <TouchableOpacity
                        style={[styles.predictButton, { borderColor: colors.tint }]}
                        onPress={() => setPredictionVisible(true)}
                    >
                        <FontAwesome name="bullseye" size={18} color={colors.tint} />
                        <Text style={[styles.predictButtonText, { color: colors.tint }]}>Predict</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.buyButton} onPress={() => setModalVisible(true)}>
                        <Text style={styles.buyButtonText}>Buy {stock.symbol}</Text>
                    </TouchableOpacity>
                </View>
            )}

            <PredictionModal
                stock={stock}
                visible={predictionVisible}
                onClose={() => setPredictionVisible(false)}
            />

            {/* Buy Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: isDark ? colors.card : '#fff' }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Buy {stock.symbol}</Text>

                        <View style={[styles.infoRow, { backgroundColor: isDark ? '#111827' : '#f9f9f9' }]}>
                            <Text style={[styles.infoLabel, { color: colors.tabIconDefault }]}>Current Price:</Text>
                            <Text style={[styles.infoValue, { color: colors.text }]}>₹{stock.last_price}</Text>
                        </View>

                        <Text style={[styles.inputLabel, { color: colors.tabIconDefault }]}>Quantity</Text>
                        <TextInput
                            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: isDark ? '#111827' : '#fff' }]}
                            keyboardType="numeric"
                            value={quantity}
                            onChangeText={setQuantity}
                        />

                        <View style={styles.totalRow}>
                            <Text style={{ color: colors.tabIconDefault }}>Total Cost:</Text>
                            <Text style={{ fontWeight: 'bold', color: colors.text }}>₹{(parseFloat(stock.last_price) * parseInt(quantity || '0')).toFixed(2)}</Text>
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton, { backgroundColor: isDark ? '#374151' : '#f5f5f5' }]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={handleBuy}
                                disabled={tradeLoading}
                            >
                                {tradeLoading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.confirmButtonText}>Confirm Buy</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { justifyContent: 'center', alignItems: 'center' },
    scroll: { padding: 16, paddingBottom: 100 },
    headerCard: { borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 16 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    symbol: { fontSize: 24, fontWeight: 'bold' },
    name: { fontSize: 14, marginTop: 4 },
    priceRow: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
    price: { fontSize: 32, fontWeight: 'bold' },
    badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
    changeText: { fontSize: 14, fontWeight: 'bold' },

    // Chart
    chartCard: { borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 16 },
    chartContainer: { height: 280, borderRadius: 8, overflow: 'hidden', marginTop: 8 },

    statsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
    statCard: { width: '48%', padding: 12, borderRadius: 8, borderWidth: 1 },
    statLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
    statValue: { fontSize: 16, fontWeight: '600' },
    infoCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
    description: { fontSize: 14, lineHeight: 20 },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1, flexDirection: 'row', gap: 12 },
    buyButton: { backgroundColor: '#10b981', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flex: 2 },
    buyButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    predictButton: { height: 50, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center', flex: 1, flexDirection: 'row', gap: 8 },
    predictButtonText: { fontSize: 16, fontWeight: 'bold' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { borderRadius: 12, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, padding: 10, borderRadius: 8 },
    infoLabel: { color: '#666' },
    infoValue: { fontWeight: 'bold' },
    inputLabel: { fontSize: 12, marginBottom: 5 },
    input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 16, marginBottom: 10 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    modalButtons: { flexDirection: 'row', gap: 10 },
    modalButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
    cancelButton: {},
    confirmButton: { backgroundColor: '#10b981' },
    cancelButtonText: { fontWeight: '600' },
    confirmButtonText: { color: '#fff', fontWeight: 'bold' },
});
