import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { StyleSheet, View, Text, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { stocksAPI } from '@/services/stocks';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import DateTimePicker from '@react-native-community/datetimepicker';

type ViewMode = 'CHART' | 'TABLE' | 'GRID';

const CHART_COLORS = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#9333ea'];

export default function CompareChartsScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';

    // State
    const [selectedStockIds, setSelectedStockIds] = useState<number[]>([]);
    const [selectedStocks, setSelectedStocks] = useState<any[]>([]);
    const [prices, setPrices] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('CHART');

    // Search
    const [isSelectionOpen, setIsSelectionOpen] = useState(false);
    const [allStocks, setAllStocks] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loadingStocks, setLoadingStocks] = useState(false);
    const [autoFetched, setAutoFetched] = useState(false);

    // Dates
    const [startDate, setStartDate] = useState(new Date(Date.now() - 15 * 24 * 60 * 60 * 1000));
    const [endDate, setEndDate] = useState(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    // Fetch all stocks on mount and auto-select first 2
    useEffect(() => {
        fetchAllStocksForAutoSelect();
    }, []);

    const fetchAllStocksForAutoSelect = async () => {
        try {
            const res = await stocksAPI.getAll({ page_size: 50 });
            const data = res.data?.data || res.data;
            const list = data.stocks || data.results || [];
            const stockList = Array.isArray(list) ? list : [];
            setAllStocks(stockList);

            if (stockList.length >= 2 && !autoFetched) {
                const sorted = [...stockList].sort((a: any, b: any) => a.symbol.localeCompare(b.symbol));
                const first2 = [sorted[0], sorted[1]];
                setSelectedStockIds(first2.map((s: any) => s.id));
                setSelectedStocks(first2);
                setAutoFetched(true);
                autoFetchPrices(first2.map((s: any) => s.id));
            }
        } catch (error) {
            console.error('Failed to load stocks', error);
        }
    };

    const autoFetchPrices = async (stockIds: number[]) => {
        setLoading(true);
        try {
            const params = {
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0],
                stock_ids: stockIds.join(',')
            };
            const res = await stocksAPI.getPrices(params);
            const data = res.data?.data || res.data;
            setPrices(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch prices', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPrices = async () => {
        const validIds = selectedStockIds.filter(id => !isNaN(id) && id > 0);
        if (validIds.length === 0) {
            Alert.alert("Error", "Please select at least one stock");
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
            Alert.alert("Error", "Failed to load comparison data.");
            setPrices([]);
        } finally {
            setLoading(false);
        }
    };

    // Process data
    const processedData = useMemo(() => {
        if (!prices.length) return { stocks: [], rows: [], chartLines: [], gridData: {} as Record<string, any[]> };

        const dateMap = new Map<string, { [symbol: string]: number }>();
        const stockSet = new Set<string>();
        const pricesByStock: { [symbol: string]: any[] } = {};

        prices.forEach(p => {
            const sym = p.stock_symbol;
            if (!pricesByStock[sym]) pricesByStock[sym] = [];
            pricesByStock[sym].push(p);
            if (!dateMap.has(p.date)) dateMap.set(p.date, {});
            dateMap.get(p.date)![sym] = Number(p.close_price);
            stockSet.add(sym);
        });

        const stockSymbols = Array.from(stockSet).sort();
        const dates = Array.from(dateMap.keys()).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

        const chartLines: any[] = [];
        const gridData: Record<string, any[]> = {};

        stockSymbols.forEach((symbol, index) => {
            const stockPrices = (pricesByStock[symbol] || [])
                .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

            if (stockPrices.length > 0) {
                const startPrice = Number(stockPrices[0].close_price);
                chartLines.push({
                    symbol,
                    color: CHART_COLORS[index % CHART_COLORS.length],
                    data: stockPrices.map((p: any) => ({
                        time: p.date,
                        value: startPrice !== 0 ? ((Number(p.close_price) - startPrice) / startPrice) * 100 : 0
                    }))
                });
                gridData[symbol] = stockPrices.map((p: any) => ({
                    time: p.date,
                    open: Number(p.open_price),
                    high: Number(p.high_price),
                    low: Number(p.low_price),
                    close: Number(p.close_price),
                }));
            }
        });

        // Table rows
        const datesAsc = [...dates].reverse();
        const prevPriceMap: { [symbol: string]: number } = {};
        const rowsWithChange = datesAsc.map(date => {
            const rowPrices = dateMap.get(date) || {};
            const rowChanges: { [symbol: string]: number | null } = {};
            stockSymbols.forEach(s => {
                const current = rowPrices[s];
                const prev = prevPriceMap[s];
                if (current !== undefined && prev !== undefined) {
                    rowChanges[s] = ((current - prev) / prev) * 100;
                } else {
                    rowChanges[s] = null;
                }
                if (current !== undefined) prevPriceMap[s] = current;
            });
            return { date, prices: rowPrices, changes: rowChanges };
        });

        return { stocks: stockSymbols, rows: rowsWithChange.reverse(), chartLines, gridData };
    }, [prices]);

    // Build self-contained WebView HTML with Canvas charts (no CDN)
    const buildChartHtml = useCallback(() => {
        const bg = isDark ? '#1f2937' : '#ffffff';
        const text = isDark ? '#e5e7eb' : '#1f2937';
        const gridC = isDark ? '#374151' : '#e5e7eb';
        const subBg = isDark ? '#111827' : '#f9fafb';
        const borderC = isDark ? '#374151' : '#e5e7eb';

        if (viewMode === 'CHART') {
            const chartData = JSON.stringify(processedData.chartLines);
            return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:${bg};font-family:-apple-system,sans-serif;-webkit-user-select:none;user-select:none;overflow:hidden}
.chart-wrap{position:relative}
canvas{display:block}
#overlay{position:absolute;top:0;left:0;pointer-events:auto;touch-action:none}
.legend{display:flex;flex-wrap:wrap;gap:12px;padding:10px 16px}
.legend-item{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;color:${text}}
.legend-dot{width:10px;height:10px;border-radius:50%}
.title{padding:12px 16px 0;font-size:15px;font-weight:700;color:${text}}
.subtitle{padding:2px 16px 8px;font-size:11px;color:#9ca3af}
#tooltip{position:absolute;display:none;padding:8px 10px;border-radius:8px;font-size:10px;line-height:1.6;pointer-events:none;z-index:10;
  background:${isDark ? 'rgba(17,24,39,0.92)' : 'rgba(255,255,255,0.95)'};
  border:1px solid ${isDark ? '#374151' : '#e5e7eb'};
  box-shadow:0 4px 12px rgba(0,0,0,0.15);color:${text};min-width:100px;backdrop-filter:blur(4px)}
.tt-date{font-weight:700;font-size:11px;margin-bottom:4px;color:${isDark ? '#93c5fd' : '#2563eb'}}
.tt-row{display:flex;align-items:center;gap:6px}
.tt-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.tt-sym{font-weight:600;min-width:45px}
.tt-val{font-weight:700}
</style></head><body>
<div class="title">Relative Performance</div>
<div class="subtitle">Base indexed to 0% at start · Touch to inspect</div>
<div class="legend" id="legend"></div>
<div class="chart-wrap" id="wrap">
  <canvas id="c"></canvas>
  <canvas id="overlay"></canvas>
  <div id="tooltip"></div>
</div>
<script>
var lines=${chartData};
var colors=${JSON.stringify(CHART_COLORS)};
var chartState={};

function draw(){
  var canvas=document.getElementById('c');
  var overlay=document.getElementById('overlay');
  var legend=document.getElementById('legend');
  var W=window.innerWidth;
  var H=window.innerHeight-legend.offsetTop-legend.offsetHeight-8;
  canvas.width=W*2;canvas.height=H*2;canvas.style.width=W+'px';canvas.style.height=H+'px';
  overlay.width=W*2;overlay.height=H*2;overlay.style.width=W+'px';overlay.style.height=H+'px';
  var ctx=canvas.getContext('2d');ctx.scale(2,2);
  var pad={l:50,r:16,t:16,b:40};
  var cW=W-pad.l-pad.r;var cH=H-pad.t-pad.b;

  if(!lines.length)return;
  var allVals=[];
  lines.forEach(function(l){l.data.forEach(function(d){allVals.push(d.value)})});
  var minV=Math.min.apply(null,allVals);var maxV=Math.max.apply(null,allVals);
  var range=maxV-minV||1;minV-=range*0.1;maxV+=range*0.1;range=maxV-minV;

  // Store state for crosshair
  chartState={W:W,H:H,pad:pad,cW:cW,cH:cH,minV:minV,maxV:maxV,range:range};

  ctx.fillStyle='${bg}';ctx.fillRect(0,0,W,H);

  // Grid
  ctx.strokeStyle='${gridC}';ctx.lineWidth=0.5;
  for(var i=0;i<=5;i++){
    var y=pad.t+cH*(i/5);
    ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(W-pad.r,y);ctx.stroke();
    ctx.fillStyle='#9ca3af';ctx.font='10px -apple-system,sans-serif';ctx.textAlign='right';
    ctx.fillText((maxV-range*(i/5)).toFixed(1)+'%',pad.l-6,y+3);
  }

  // Zero line
  if(minV<0&&maxV>0){
    var zeroY=pad.t+cH*((maxV-0)/range);
    ctx.strokeStyle='${isDark ? '#4b5563' : '#d1d5db'}';ctx.lineWidth=1;
    ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(pad.l,zeroY);ctx.lineTo(W-pad.r,zeroY);ctx.stroke();ctx.setLineDash([]);
  }

  // Lines
  lines.forEach(function(line){
    if(!line.data.length)return;
    ctx.strokeStyle=line.color;ctx.lineWidth=2.5;ctx.beginPath();
    line.data.forEach(function(d,di){
      var x=pad.l+(di/(line.data.length-1||1))*cW;
      var y=pad.t+((maxV-d.value)/range)*cH;
      di===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    });ctx.stroke();
  });

  // X labels
  var ref=lines[0];
  if(ref&&ref.data.length>0){
    var lc=Math.min(5,ref.data.length);
    ctx.fillStyle='#9ca3af';ctx.font='9px -apple-system,sans-serif';ctx.textAlign='center';
    for(var i=0;i<lc;i++){
      var idx=Math.floor(i*(ref.data.length-1)/(lc-1||1));
      var d=new Date(ref.data[idx].time);
      ctx.fillText(d.getDate()+'/'+(d.getMonth()+1),pad.l+(idx/(ref.data.length-1||1))*cW,H-pad.b+20);
    }
  }

  // Legend
  legend.innerHTML='';
  lines.forEach(function(line){
    var item=document.createElement('div');item.className='legend-item';
    var dot=document.createElement('div');dot.className='legend-dot';dot.style.background=line.color;
    var txt=document.createElement('span');txt.textContent=line.symbol;
    item.appendChild(dot);item.appendChild(txt);legend.appendChild(item);
  });
}

// Crosshair logic
function drawCrosshair(px,py){
  var ov=document.getElementById('overlay');
  var tt=document.getElementById('tooltip');
  var ctx=ov.getContext('2d');
  var s=chartState;if(!s.W)return;
  ctx.clearRect(0,0,ov.width,ov.height);ctx.scale(2,2);

  // Clamp to chart area
  var x=Math.max(s.pad.l,Math.min(px,s.W-s.pad.r));
  var y=Math.max(s.pad.t,Math.min(py,s.H-s.pad.b));

  // Dotted vertical line
  ctx.strokeStyle='${isDark ? '#6b7280' : '#9ca3af'}';ctx.lineWidth=1;ctx.setLineDash([3,3]);
  ctx.beginPath();ctx.moveTo(x,s.pad.t);ctx.lineTo(x,s.pad.t+s.cH);ctx.stroke();
  // Dotted horizontal line
  ctx.beginPath();ctx.moveTo(s.pad.l,y);ctx.lineTo(s.W-s.pad.r,y);ctx.stroke();
  ctx.setLineDash([]);

  // Y-axis label badge
  var yVal=s.maxV-((y-s.pad.t)/s.cH)*s.range;
  ctx.fillStyle='${isDark ? '#374151' : '#e5e7eb'}';
  var badgeW=44,badgeH=16;
  ctx.fillRect(s.pad.l-badgeW-4,y-badgeH/2,badgeW,badgeH);
  ctx.fillStyle='${text}';ctx.font='bold 9px -apple-system,sans-serif';ctx.textAlign='right';
  ctx.fillText(yVal.toFixed(1)+'%',s.pad.l-8,y+3);

  // Find nearest data index and show dots + tooltip
  if(lines.length>0&&lines[0].data.length>0){
    var ratio=(x-s.pad.l)/s.cW;
    var idx=Math.round(ratio*(lines[0].data.length-1));
    idx=Math.max(0,Math.min(idx,lines[0].data.length-1));

    var ttHtml='';
    var refDate=lines[0].data[idx]?lines[0].data[idx].time:'';
    if(refDate){
      var dd=new Date(refDate);
      ttHtml+='<div class="tt-date">'+dd.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})+'</div>';
    }

    lines.forEach(function(line,li){
      if(idx>=line.data.length)return;
      var d=line.data[idx];
      var dx=s.pad.l+(idx/(line.data.length-1||1))*s.cW;
      var dy=s.pad.t+((s.maxV-d.value)/s.range)*s.cH;

      // Dot on line
      ctx.fillStyle=line.color;
      ctx.beginPath();ctx.arc(dx,dy,5,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='${bg}';ctx.lineWidth=2;ctx.beginPath();ctx.arc(dx,dy,5,0,Math.PI*2);ctx.stroke();

      var sign=d.value>=0?'+':'';
      ttHtml+='<div class="tt-row"><div class="tt-dot" style="background:'+line.color+'"></div><span class="tt-sym">'+line.symbol+'</span><span class="tt-val" style="color:'+line.color+'">'+sign+d.value.toFixed(2)+'%</span></div>';
    });

    tt.innerHTML=ttHtml;tt.style.display='block';
    // Position tooltip — offset well above finger
    var ttX=x+14;var ttY=y-100;
    if(ttX+130>s.W)ttX=x-140;
    if(ttY<5)ttY=y+30;
    tt.style.left=ttX+'px';tt.style.top=ttY+'px';
  }
  ctx.setTransform(1,0,0,1,0,0);
}

function clearCrosshair(){
  var ov=document.getElementById('overlay');
  var ctx=ov.getContext('2d');ctx.clearRect(0,0,ov.width,ov.height);
  document.getElementById('tooltip').style.display='none';
}

// Touch & Mouse events
var ovEl=null;
function initEvents(){
  ovEl=document.getElementById('overlay');
  ovEl.addEventListener('touchstart',function(e){e.preventDefault();onMove(e.touches[0])},{passive:false});
  ovEl.addEventListener('touchmove',function(e){e.preventDefault();onMove(e.touches[0])},{passive:false});
  ovEl.addEventListener('touchend',function(){clearCrosshair()});
  ovEl.addEventListener('mousedown',function(e){onMove(e);ovEl._dragging=true});
  ovEl.addEventListener('mousemove',function(e){if(ovEl._dragging)onMove(e)});
  ovEl.addEventListener('mouseup',function(){ovEl._dragging=false;clearCrosshair()});
  ovEl.addEventListener('mouseleave',function(){ovEl._dragging=false;clearCrosshair()});
}
function onMove(e){
  var rect=ovEl.getBoundingClientRect();
  drawCrosshair(e.clientX-rect.left,e.clientY-rect.top);
}

draw();initEvents();
window.addEventListener('resize',function(){draw();clearCrosshair()});
</script></body></html>`;

        } else if (viewMode === 'GRID') {
            // Grid: individual candlestick charts per stock
            const gridData = processedData.gridData;
            const symbols = processedData.stocks;
            const dataStr = JSON.stringify(gridData);
            const symbolsStr = JSON.stringify(symbols);

            return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:${bg};font-family:-apple-system,sans-serif;padding:8px;-webkit-user-select:none;user-select:none}
.card{background:${subBg};border:1px solid ${borderC};border-radius:10px;margin-bottom:12px;padding:12px;position:relative}
.card-title{font-size:14px;font-weight:700;color:${text};margin-bottom:8px;display:flex;justify-content:space-between;align-items:center}
.card-subtitle{font-size:10px;color:#9ca3af}
.chart-area{position:relative}
canvas{display:block;width:100%}
.ov{position:absolute;top:0;left:0;width:100%;touch-action:none}
.gtt{position:absolute;display:none;padding:6px 8px;border-radius:6px;font-size:9px;line-height:1.5;pointer-events:none;z-index:10;
  background:${isDark ? 'rgba(17,24,39,0.92)' : 'rgba(255,255,255,0.95)'};
  border:1px solid ${isDark ? '#374151' : '#e5e7eb'};
  box-shadow:0 2px 8px rgba(0,0,0,0.12);color:${text};white-space:nowrap;backdrop-filter:blur(4px)}
.gtt-date{font-weight:700;color:${isDark ? '#93c5fd' : '#2563eb'};margin-bottom:2px}
.gtt-up{color:#10b981}.gtt-down{color:#ef4444}
</style></head><body>
<script>
var gridData=${dataStr};var symbols=${symbolsStr};
var bg='${bg}';var textC='${text}';var gridC='${gridC}';

symbols.forEach(function(symbol){
  var data=gridData[symbol]||[];
  if(!data.length)return;

  var card=document.createElement('div');card.className='card';
  var title=document.createElement('div');title.className='card-title';
  title.innerHTML=symbol+'<span class="card-subtitle">Touch to inspect</span>';
  card.appendChild(title);

  var area=document.createElement('div');area.className='chart-area';
  var canvas=document.createElement('canvas');
  var overlay=document.createElement('canvas');overlay.className='ov';
  var tooltip=document.createElement('div');tooltip.className='gtt';
  area.appendChild(canvas);area.appendChild(overlay);area.appendChild(tooltip);
  card.appendChild(area);
  document.body.appendChild(card);

  setTimeout(function(){
    var W=canvas.clientWidth;var H=220;
    canvas.width=W*2;canvas.height=H*2;canvas.style.height=H+'px';
    overlay.width=W*2;overlay.height=H*2;overlay.style.height=H+'px';
    var ctx=canvas.getContext('2d');ctx.scale(2,2);

    var pad={l:50,r:10,t:10,b:30};
    var cW=W-pad.l-pad.r;var cH=H-pad.t-pad.b;

    var allH=data.map(function(d){return d.high});var allL=data.map(function(d){return d.low});
    var maxP=Math.max.apply(null,allH);var minP=Math.min.apply(null,allL);
    var range=maxP-minP||1;minP-=range*0.05;maxP+=range*0.05;range=maxP-minP;

    ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);

    // Grid
    ctx.strokeStyle=gridC;ctx.lineWidth=0.5;
    for(var i=0;i<=4;i++){
      var y=pad.t+cH*(i/4);
      ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(W-pad.r,y);ctx.stroke();
      ctx.fillStyle='#9ca3af';ctx.font='9px -apple-system,sans-serif';ctx.textAlign='right';
      ctx.fillText((maxP-range*(i/4)).toFixed(1),pad.l-6,y+3);
    }

    // Candlesticks
    var barW=Math.max(2,Math.min(8,(cW/data.length)*0.6));
    data.forEach(function(d,i){
      var x=pad.l+(i/(data.length-1||1))*cW;
      var isUp=d.close>=d.open;var color=isUp?'#10b981':'#ef4444';
      var highY=pad.t+((maxP-d.high)/range)*cH;var lowY=pad.t+((maxP-d.low)/range)*cH;
      ctx.strokeStyle=color;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,highY);ctx.lineTo(x,lowY);ctx.stroke();
      var openY=pad.t+((maxP-d.open)/range)*cH;var closeY=pad.t+((maxP-d.close)/range)*cH;
      ctx.fillStyle=color;ctx.fillRect(x-barW/2,Math.min(openY,closeY),barW,Math.max(Math.abs(openY-closeY),1));
    });

    // X labels
    var lc=Math.min(4,data.length);
    ctx.fillStyle='#9ca3af';ctx.font='9px -apple-system,sans-serif';ctx.textAlign='center';
    for(var i=0;i<lc;i++){
      var idx=Math.floor(i*(data.length-1)/(lc-1||1));var dt=new Date(data[idx].time);
      ctx.fillText(dt.getDate()+'/'+(dt.getMonth()+1),pad.l+(idx/(data.length-1||1))*cW,H-pad.b+18);
    }

    // Crosshair for this card
    var st={W:W,H:H,pad:pad,cW:cW,cH:cH,minP:minP,maxP:maxP,range:range};

    function drawCH(px,py){
      var oc=overlay.getContext('2d');oc.clearRect(0,0,overlay.width,overlay.height);oc.scale(2,2);
      var x=Math.max(st.pad.l,Math.min(px,st.W-st.pad.r));
      var y=Math.max(st.pad.t,Math.min(py,st.pad.t+st.cH));

      oc.strokeStyle='${isDark ? '#6b7280' : '#9ca3af'}';oc.lineWidth=1;oc.setLineDash([3,3]);
      oc.beginPath();oc.moveTo(x,st.pad.t);oc.lineTo(x,st.pad.t+st.cH);oc.stroke();
      oc.beginPath();oc.moveTo(st.pad.l,y);oc.lineTo(st.W-st.pad.r,y);oc.stroke();
      oc.setLineDash([]);

      // Y badge
      var yVal=st.maxP-((y-st.pad.t)/st.cH)*st.range;
      oc.fillStyle='${isDark ? '#374151' : '#e5e7eb'}';oc.fillRect(st.pad.l-48,y-8,44,16);
      oc.fillStyle='${text}';oc.font='bold 9px -apple-system,sans-serif';oc.textAlign='right';
      oc.fillText('₹'+yVal.toFixed(1),st.pad.l-8,y+3);

      // Snap to nearest candle
      var ratio=(x-st.pad.l)/st.cW;
      var idx=Math.round(ratio*(data.length-1));idx=Math.max(0,Math.min(idx,data.length-1));
      var d=data[idx];
      var cx=st.pad.l+(idx/(data.length-1||1))*st.cW;
      var isUp=d.close>=d.open;

      // Highlight dot
      var closeY=st.pad.t+((st.maxP-d.close)/st.range)*st.cH;
      oc.fillStyle=isUp?'#10b981':'#ef4444';
      oc.beginPath();oc.arc(cx,closeY,4,0,Math.PI*2);oc.fill();
      oc.strokeStyle=bg;oc.lineWidth=1.5;oc.beginPath();oc.arc(cx,closeY,4,0,Math.PI*2);oc.stroke();

      // Tooltip
      var dd=new Date(d.time);
      var cls=isUp?'gtt-up':'gtt-down';
      tooltip.innerHTML='<div class="gtt-date">'+dd.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})+'</div>'
        +'<div>O: ₹'+d.open.toFixed(2)+' H: ₹'+d.high.toFixed(2)+'</div>'
        +'<div>L: ₹'+d.low.toFixed(2)+' C: <span class="'+cls+'">₹'+d.close.toFixed(2)+'</span></div>';
      tooltip.style.display='block';
      var tx=cx+14;if(tx+110>st.W)tx=cx-120;
      var ty=closeY-90;if(ty<5)ty=closeY+30;
      tooltip.style.left=tx+'px';tooltip.style.top=ty+'px';
      oc.setTransform(1,0,0,1,0,0);
    }

    function clearCH(){
      var oc=overlay.getContext('2d');oc.clearRect(0,0,overlay.width,overlay.height);
      tooltip.style.display='none';
    }

    overlay.addEventListener('touchstart',function(e){e.preventDefault();var r=overlay.getBoundingClientRect();drawCH(e.touches[0].clientX-r.left,e.touches[0].clientY-r.top)},{passive:false});
    overlay.addEventListener('touchmove',function(e){e.preventDefault();var r=overlay.getBoundingClientRect();drawCH(e.touches[0].clientX-r.left,e.touches[0].clientY-r.top)},{passive:false});
    overlay.addEventListener('touchend',function(){clearCH()});
  },50);
});
</script></body></html>`;
        }

        return `<!DOCTYPE html><html><body style="background:${bg};display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:${text}"><p>No data</p></body></html>`;
    }, [processedData, viewMode, isDark]);

    // Stock search
    const fetchStocksForSearch = async () => {
        setLoadingStocks(true);
        try {
            const res = await stocksAPI.getAll({ page_size: 50, search: searchQuery });
            const data = res.data?.data || res.data;
            const list = data.stocks || data.results || [];
            setAllStocks(Array.isArray(list) ? list : []);
        } catch (error) {
            setAllStocks([]);
        } finally {
            setLoadingStocks(false);
        }
    };

    useEffect(() => {
        if (isSelectionOpen) fetchStocksForSearch();
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

    // Table View
    const renderTableView = () => {
        if (processedData.rows.length === 0) return renderEmpty();
        const screenW = Dimensions.get('window').width;
        const stockCount = processedData.stocks.length;
        const dateColW = 80;
        const minPriceColW = 110;
        // If few stocks, expand cells to fill screen
        const totalFixedW = dateColW + minPriceColW * stockCount;
        const priceColW = totalFixedW < screenW ? Math.floor((screenW - dateColW) / stockCount) : minPriceColW;
        const tableW = dateColW + priceColW * stockCount;

        return (
            <ScrollView style={styles.tableContainer} horizontal={tableW > screenW}>
                <View style={{ minWidth: Math.max(tableW, screenW) }}>
                    <View style={[styles.tableRow, styles.tableHeader, { backgroundColor: isDark ? '#1f2937' : '#f9fafb' }]}>
                        <View style={[styles.tableCell, { width: dateColW }]}>
                            <Text style={[styles.tableHeaderText, { color: colors.tabIconDefault }]}>Date</Text>
                        </View>
                        {processedData.stocks.map(symbol => (
                            <View key={symbol} style={[styles.tableCell, { width: priceColW, alignItems: 'center' as const }]}>
                                <Text style={[styles.tableHeaderText, { color: colors.tabIconDefault }]}>{symbol}</Text>
                            </View>
                        ))}
                    </View>
                    <ScrollView style={{ maxHeight: 500 }}>
                        {processedData.rows.map((row, idx) => (
                            <View key={row.date} style={[styles.tableRow, { backgroundColor: idx % 2 === 0 ? (isDark ? '#111827' : '#ffffff') : (isDark ? '#1a2332' : '#f9fafb') }]}>
                                <View style={[styles.tableCell, { width: dateColW, justifyContent: 'center' as const }]}>
                                    <Text style={[styles.tableDateText, { color: colors.text }]}>
                                        {new Date(row.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                    </Text>
                                </View>
                                {processedData.stocks.map(symbol => {
                                    const price = row.prices[symbol];
                                    const change = row.changes[symbol];
                                    return (
                                        <View key={`${row.date}-${symbol}`} style={[styles.tableCell, { width: priceColW, alignItems: 'center' as const, justifyContent: 'center' as const }]}>
                                            <Text style={[styles.tablePriceText, { color: colors.text }]}>
                                                {price !== undefined ? `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                                            </Text>
                                            {change !== null && change !== undefined && (
                                                <Text style={[styles.tableChangeText, { color: change > 0 ? '#16a34a' : change < 0 ? '#dc2626' : '#9ca3af' }]}>
                                                    {change > 0 ? '+' : ''}{change.toFixed(2)}%
                                                </Text>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </ScrollView>
        );
    };

    const renderEmpty = () => (
        <View style={[styles.emptyState, { backgroundColor: colors.background }]}>
            <Feather name="bar-chart-2" size={48} color={colors.tabIconDefault} />
            <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
                Select stocks and click Apply to compare
            </Text>
        </View>
    );

    // Use a key to force WebView remount when data or viewMode changes
    const webViewKey = useMemo(() => {
        return `${viewMode}-${processedData.stocks.join('-')}-${isDark ? 'd' : 'l'}`;
    }, [viewMode, processedData.stocks, isDark]);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ title: 'Compare Charts', headerShown: true }} />

            {/* Controls */}
            <View style={[styles.controlsContainer, { borderBottomColor: colors.border }]}>
                <View style={styles.searchRow}>
                    <TouchableOpacity
                        style={[styles.searchButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => setIsSelectionOpen(true)}
                    >
                        <Feather name="search" size={14} color={colors.tabIconDefault} />
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

                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.dateButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => setShowStartPicker(true)}
                    >
                        <Feather name="calendar" size={12} color={colors.text} />
                        <Text style={[styles.dateText, { color: colors.text }]} numberOfLines={1}>
                            {startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - {endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.applyButton, { backgroundColor: colors.tint, opacity: loading ? 0.7 : 1 }]}
                        onPress={fetchPrices}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.applyText}>Apply</Text>}
                    </TouchableOpacity>

                    <View style={[styles.viewToggleContainer, { backgroundColor: isDark ? '#374151' : '#f3f4f6' }]}>
                        {(['CHART', 'TABLE', 'GRID'] as ViewMode[]).map(mode => (
                            <TouchableOpacity
                                key={mode}
                                onPress={() => setViewMode(mode)}
                                style={[
                                    styles.viewToggleButton,
                                    viewMode === mode && { backgroundColor: isDark ? '#4b5563' : '#ffffff' }
                                ]}
                            >
                                <FontAwesome
                                    name={mode === 'CHART' ? 'line-chart' : mode === 'TABLE' ? 'table' : 'th-large'}
                                    size={13}
                                    color={viewMode === mode ? colors.tint : colors.tabIconDefault}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>

            {/* Content */}
            <View style={styles.contentContainer}>
                {loading ? (
                    <View style={styles.emptyState}>
                        <ActivityIndicator size="large" color={colors.tint} />
                        <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>Fetching comparison data...</Text>
                    </View>
                ) : prices.length === 0 ? (
                    renderEmpty()
                ) : viewMode === 'TABLE' ? (
                    renderTableView()
                ) : (
                    <WebView
                        key={webViewKey}
                        originWhitelist={['*']}
                        source={{ html: buildChartHtml() }}
                        style={{ flex: 1, backgroundColor: isDark ? '#1f2937' : '#ffffff' }}
                        onMessage={() => { }}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        scrollEnabled={viewMode === 'GRID'}
                        scalesPageToFit={false}
                    />
                )}
            </View>

            {/* Date Pickers */}
            {showStartPicker && (
                <DateTimePicker
                    value={startDate}
                    mode="date"
                    display="default"
                    onChange={(e, d) => { setShowStartPicker(false); if (d) { setStartDate(d); setShowEndPicker(true); } }}
                />
            )}
            {showEndPicker && (
                <DateTimePicker
                    value={endDate}
                    mode="date"
                    display="default"
                    onChange={(e, d) => { setShowEndPicker(false); if (d) setEndDate(d); }}
                />
            )}

            {/* Stock Selection Modal */}
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
    controlsContainer: { padding: 10, borderBottomWidth: 1 },
    searchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
    searchButton: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10,
        height: 30, borderRadius: 15, borderWidth: 1, gap: 5
    },
    searchText: { fontSize: 11 },
    chip: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8,
        height: 30, borderRadius: 15, borderWidth: 1, gap: 4
    },
    chipText: { fontSize: 11, fontWeight: '600' },

    actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dateButton: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        height: 36, borderRadius: 8, borderWidth: 1, gap: 6
    },
    dateText: { fontSize: 11, fontWeight: '500' },
    applyButton: {
        width: 60, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center'
    },
    applyText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

    viewToggleContainer: { flexDirection: 'row', borderRadius: 8, padding: 3, gap: 2 },
    viewToggleButton: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 },

    contentContainer: { flex: 1 },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    emptyText: { fontSize: 14, textAlign: 'center' },

    // Table
    tableContainer: { flex: 1 },
    tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb' },
    tableHeader: { borderBottomWidth: 1.5 },
    tableCell: { paddingVertical: 10, paddingHorizontal: 12 },
    dateCellHeader: { width: 80 },
    priceCellHeader: { width: 110, alignItems: 'center' },
    dateCell: { width: 80, justifyContent: 'center' },
    priceCell: { width: 110, alignItems: 'center', justifyContent: 'center' },
    tableHeaderText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    tableDateText: { fontSize: 12, fontWeight: '500' },
    tablePriceText: { fontSize: 13, fontWeight: '600' },
    tableChangeText: { fontSize: 10, fontWeight: '500', marginTop: 2 },

    // Modal
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
