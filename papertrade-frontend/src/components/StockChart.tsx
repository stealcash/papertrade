'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface CandlestickDataItem {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
}

interface MarkerItem {
    time: string;
    position: 'belowBar' | 'aboveBar';
    color: string;
    shape: 'arrowUp' | 'arrowDown';
    text: string;
    size?: number;
}

interface PriceTarget {
    price: number;
    label: string;
    color: string;
}

interface StockChartProps {
    data: CandlestickDataItem[];
    markers?: MarkerItem[];
    priceTargets?: PriceTarget[];
    colors?: {
        backgroundColor?: string;
        lineColor?: string;
        textColor?: string;
        areaTopColor?: string;
        areaBottomColor?: string;
    };
    height?: number;
}

const PERIODS = ['1M', '3M', '6M', '1Y', 'ALL'] as const;

export const StockChart = (props: StockChartProps) => {
    const {
        data,
        markers = [],
        priceTargets = [],
        height = 400,
        colors: {
            backgroundColor = 'transparent',
            textColor = '#888',
        } = {},
    } = props;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayRef = useRef<HTMLCanvasElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const stateRef = useRef<any>({});
    const [period, setPeriod] = useState('1Y');

    const getFilteredData = useCallback(() => {
        if (!data.length) return [];
        if (period === 'ALL') return data;
        const now = new Date(data[data.length - 1].time);
        const months: Record<string, number> = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 };
        const cutoff = new Date(now);
        cutoff.setMonth(cutoff.getMonth() - (months[period] || 12));
        return data.filter(d => new Date(d.time) >= cutoff);
    }, [data, period]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const overlay = overlayRef.current;
        if (!canvas || !overlay || !containerRef.current) return;

        const filtered = getFilteredData();
        if (!filtered.length) return;

        const W = containerRef.current.clientWidth;
        const H = height;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = W * dpr; canvas.height = H * dpr;
        canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
        overlay.width = W * dpr; overlay.height = H * dpr;
        overlay.style.width = W + 'px'; overlay.style.height = H + 'px';

        const ctx = canvas.getContext('2d')!;
        ctx.scale(dpr, dpr);

        const pad = { l: 60, r: 16, t: 16, b: 36 };
        const cW = W - pad.l - pad.r;
        const cH = H - pad.t - pad.b;

        const allH = filtered.map(d => d.high);
        const allL = filtered.map(d => d.low);
        let maxP = Math.max(...allH);
        let minP = Math.min(...allL);

        // Include price targets in range
        priceTargets.forEach(t => {
            if (t.price > maxP) maxP = t.price;
            if (t.price < minP) minP = t.price;
        });

        const range = (maxP - minP) || 1;
        minP -= range * 0.05; maxP += range * 0.05;
        const r = maxP - minP;

        // Store for crosshair
        stateRef.current = { W, H, pad, cW, cH, minP, maxP, range: r, data: filtered };

        // Background
        if (backgroundColor !== 'transparent') {
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, W, H);
        } else {
            ctx.clearRect(0, 0, W, H);
        }

        // Grid
        const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--grid-color') || 'rgba(197,203,206,0.15)';
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 5; i++) {
            const y = pad.t + cH * (i / 5);
            ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
            const val = maxP - r * (i / 5);
            ctx.fillStyle = textColor; ctx.font = '10px -apple-system, sans-serif'; ctx.textAlign = 'right';
            ctx.fillText('₹' + val.toFixed(1), pad.l - 8, y + 3);
        }

        // Candlesticks
        const barW = Math.max(1, Math.min(10, (cW / filtered.length) * 0.6));
        filtered.forEach((d, i) => {
            const x = pad.l + (i / (filtered.length - 1 || 1)) * cW;
            const isUp = d.close >= d.open;
            const color = isUp ? '#26a69a' : '#ef5350';

            const highY = pad.t + ((maxP - d.high) / r) * cH;
            const lowY = pad.t + ((maxP - d.low) / r) * cH;
            ctx.strokeStyle = color; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(x, highY); ctx.lineTo(x, lowY); ctx.stroke();

            const openY = pad.t + ((maxP - d.open) / r) * cH;
            const closeY = pad.t + ((maxP - d.close) / r) * cH;
            ctx.fillStyle = color;
            ctx.fillRect(x - barW / 2, Math.min(openY, closeY), barW, Math.max(Math.abs(openY - closeY), 1));
        });

        // Price target lines
        priceTargets.forEach(target => {
            const y = pad.t + ((maxP - target.price) / r) * cH;
            ctx.strokeStyle = target.color; ctx.lineWidth = 1.5;
            ctx.setLineDash([6, 4]);
            ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = target.color; ctx.font = 'bold 9px -apple-system, sans-serif'; ctx.textAlign = 'left';
            ctx.fillText(target.label, pad.l + 4, y - 4);
        });

        // Markers
        markers.forEach(marker => {
            const idx = filtered.findIndex(d => d.time === marker.time);
            if (idx < 0) return;
            const x = pad.l + (idx / (filtered.length - 1 || 1)) * cW;
            const d = filtered[idx];
            const isBelow = marker.position === 'belowBar';
            const y = isBelow
                ? pad.t + ((maxP - d.low) / r) * cH + 12
                : pad.t + ((maxP - d.high) / r) * cH - 12;

            ctx.fillStyle = marker.color;
            ctx.beginPath();
            if (isBelow) {
                ctx.moveTo(x, y - 10); ctx.lineTo(x - 5, y); ctx.lineTo(x + 5, y);
            } else {
                ctx.moveTo(x, y + 10); ctx.lineTo(x - 5, y); ctx.lineTo(x + 5, y);
            }
            ctx.fill();

            ctx.fillStyle = marker.color; ctx.font = 'bold 8px -apple-system, sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(marker.text, x, isBelow ? y + 12 : y - 4);
        });

        // X-axis labels
        const labelCount = Math.min(6, filtered.length);
        ctx.fillStyle = textColor; ctx.font = '9px -apple-system, sans-serif'; ctx.textAlign = 'center';
        for (let i = 0; i < labelCount; i++) {
            const idx = Math.floor(i * (filtered.length - 1) / (labelCount - 1 || 1));
            const dt = new Date(filtered[idx].time);
            const label = dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
            const x = pad.l + (idx / (filtered.length - 1 || 1)) * cW;
            ctx.fillText(label, x, H - pad.b + 20);
        }
    }, [getFilteredData, height, backgroundColor, textColor, markers, priceTargets]);

    // Crosshair
    const drawCrosshair = useCallback((px: number, py: number) => {
        const ov = overlayRef.current;
        const tt = tooltipRef.current;
        if (!ov || !tt) return;
        const s = stateRef.current;
        if (!s.W) return;

        const dpr = window.devicePixelRatio || 1;
        const ctx = ov.getContext('2d')!;
        ctx.clearRect(0, 0, ov.width, ov.height);
        ctx.scale(dpr, dpr);

        const x = Math.max(s.pad.l, Math.min(px, s.W - s.pad.r));
        const y = Math.max(s.pad.t, Math.min(py, s.pad.t + s.cH));

        // Dotted lines
        ctx.strokeStyle = 'rgba(156,163,175,0.6)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(x, s.pad.t); ctx.lineTo(x, s.pad.t + s.cH); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s.pad.l, y); ctx.lineTo(s.W - s.pad.r, y); ctx.stroke();
        ctx.setLineDash([]);

        // Y badge
        const yVal = s.maxP - ((y - s.pad.t) / s.cH) * s.range;
        ctx.fillStyle = 'rgba(107, 114, 128, 0.9)';
        ctx.fillRect(s.pad.l - 58, y - 9, 54, 18);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 9px -apple-system, sans-serif'; ctx.textAlign = 'right';
        ctx.fillText('₹' + yVal.toFixed(1), s.pad.l - 8, y + 3);

        // Snap to candle
        const ratio = (x - s.pad.l) / s.cW;
        const idx = Math.round(ratio * (s.data.length - 1));
        const ci = Math.max(0, Math.min(idx, s.data.length - 1));
        const d = s.data[ci];

        if (d) {
            const cx = s.pad.l + (ci / (s.data.length - 1 || 1)) * s.cW;
            const closeY = s.pad.t + ((s.maxP - d.close) / s.range) * s.cH;
            const isUp = d.close >= d.open;

            ctx.fillStyle = isUp ? '#26a69a' : '#ef5350';
            ctx.beginPath(); ctx.arc(cx, closeY, 4, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'white'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(cx, closeY, 4, 0, Math.PI * 2); ctx.stroke();

            const dt = new Date(d.time);
            const cls = isUp ? 'text-emerald-500' : 'text-red-500';
            tt.innerHTML = `
                <div class="text-[10px] font-bold text-blue-400 mb-1">${dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                <div class="text-[9px] leading-relaxed">
                    <span class="text-gray-400">O:</span> ₹${d.open.toFixed(2)}
                    <span class="text-gray-400 ml-1">H:</span> ₹${d.high.toFixed(2)}<br/>
                    <span class="text-gray-400">L:</span> ₹${d.low.toFixed(2)}
                    <span class="text-gray-400 ml-1">C:</span> <span class="${cls} font-bold">₹${d.close.toFixed(2)}</span>
                </div>`;
            tt.style.display = 'block';
            let tx = cx + 14; if (tx + 140 > s.W) tx = cx - 150;
            let ty = closeY - 50; if (ty < 5) ty = closeY + 12;
            tt.style.left = tx + 'px'; tt.style.top = ty + 'px';
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }, []);

    const clearCrosshair = useCallback(() => {
        const ov = overlayRef.current; const tt = tooltipRef.current;
        if (ov) { const ctx = ov.getContext('2d')!; ctx.clearRect(0, 0, ov.width, ov.height); }
        if (tt) tt.style.display = 'none';
    }, []);

    useEffect(() => { draw(); }, [draw]);

    useEffect(() => {
        const onResize = () => { draw(); clearCrosshair(); };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [draw, clearCrosshair]);

    // Mouse events
    const dragging = useRef(false);
    const handleMouseDown = (e: React.MouseEvent) => {
        dragging.current = true;
        const r = overlayRef.current!.getBoundingClientRect();
        drawCrosshair(e.clientX - r.left, e.clientY - r.top);
    };
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragging.current) return;
        const r = overlayRef.current!.getBoundingClientRect();
        drawCrosshair(e.clientX - r.left, e.clientY - r.top);
    };
    const handleMouseUp = () => { dragging.current = false; clearCrosshair(); };

    return (
        <div className="w-full relative" ref={containerRef}>
            {/* Period Selector */}
            <div className="absolute top-2 right-12 z-10 flex gap-1 bg-white/10 p-1 rounded-md backdrop-blur-sm">
                {PERIODS.map((p) => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`px-2 py-0.5 text-xs font-semibold rounded transition ${period === p ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        {p}
                    </button>
                ))}
            </div>

            <div className="relative" style={{ height }}>
                <canvas ref={canvasRef} className="block" />
                <canvas
                    ref={overlayRef}
                    className="absolute top-0 left-0 cursor-crosshair"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                />
                <div
                    ref={tooltipRef}
                    className="absolute hidden pointer-events-none bg-gray-900/95 border border-gray-700 rounded-lg px-2.5 py-2 shadow-lg backdrop-blur-sm z-10 min-w-[120px]"
                    style={{ display: 'none' }}
                />
            </div>
        </div>
    );
};
