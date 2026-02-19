'use client';

import React, { useEffect, useRef, useCallback } from 'react';

interface ComparisonChartProps {
    data: { [symbol: string]: { time: string; value: number }[] };
    colors?: { [symbol: string]: string };
}

const STOCK_COLORS = [
    '#2563eb', // Blue
    '#16a34a', // Green
    '#dc2626', // Red
    '#d97706', // Amber
    '#9333ea', // Purple
];

export const ComparisonChart = ({ data, colors = {} }: ComparisonChartProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayRef = useRef<HTMLCanvasElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const stateRef = useRef<any>({});

    const symbols = Object.keys(data);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const overlay = overlayRef.current;
        if (!canvas || !overlay || !containerRef.current) return;

        const W = containerRef.current.clientWidth;
        const H = 400;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = W * dpr; canvas.height = H * dpr;
        canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
        overlay.width = W * dpr; overlay.height = H * dpr;
        overlay.style.width = W + 'px'; overlay.style.height = H + 'px';

        const ctx = canvas.getContext('2d')!;
        ctx.scale(dpr, dpr);

        const pad = { l: 56, r: 16, t: 16, b: 36 };
        const cW = W - pad.l - pad.r;
        const cH = H - pad.t - pad.b;

        // Build lines
        const lines: { symbol: string; color: string; data: { time: string; value: number }[] }[] = [];
        symbols.forEach((symbol, i) => {
            const sorted = (data[symbol] || []).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
            lines.push({
                symbol,
                color: colors[symbol] || STOCK_COLORS[i % STOCK_COLORS.length],
                data: sorted
            });
        });

        if (!lines.length) return;

        let allVals: number[] = [];
        lines.forEach(l => l.data.forEach(d => allVals.push(d.value)));
        let minV = Math.min(...allVals); let maxV = Math.max(...allVals);
        const range = (maxV - minV) || 1;
        minV -= range * 0.1; maxV += range * 0.1;
        const r = maxV - minV;

        stateRef.current = { W, H, pad, cW, cH, minV, maxV, range: r, lines };

        ctx.clearRect(0, 0, W, H);

        // Grid
        ctx.strokeStyle = 'rgba(197, 203, 206, 0.15)'; ctx.lineWidth = 0.5;
        for (let i = 0; i <= 5; i++) {
            const y = pad.t + cH * (i / 5);
            ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
            const val = maxV - r * (i / 5);
            ctx.fillStyle = '#9ca3af'; ctx.font = '10px -apple-system, sans-serif'; ctx.textAlign = 'right';
            ctx.fillText(val.toFixed(1) + '%', pad.l - 8, y + 3);
        }

        // Zero line
        if (minV < 0 && maxV > 0) {
            const zeroY = pad.t + cH * ((maxV - 0) / r);
            ctx.strokeStyle = 'rgba(156,163,175,0.3)'; ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath(); ctx.moveTo(pad.l, zeroY); ctx.lineTo(W - pad.r, zeroY); ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw lines
        lines.forEach(line => {
            if (!line.data.length) return;
            ctx.strokeStyle = line.color; ctx.lineWidth = 2.5; ctx.beginPath();
            line.data.forEach((d, di) => {
                const x = pad.l + (di / (line.data.length - 1 || 1)) * cW;
                const y = pad.t + ((maxV - d.value) / r) * cH;
                di === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            });
            ctx.stroke();
        });

        // X labels
        const ref = lines[0];
        if (ref && ref.data.length > 0) {
            const lc = Math.min(6, ref.data.length);
            ctx.fillStyle = '#9ca3af'; ctx.font = '9px -apple-system, sans-serif'; ctx.textAlign = 'center';
            for (let i = 0; i < lc; i++) {
                const idx = Math.floor(i * (ref.data.length - 1) / (lc - 1 || 1));
                const dt = new Date(ref.data[idx].time);
                ctx.fillText(dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), pad.l + (idx / (ref.data.length - 1 || 1)) * cW, H - pad.b + 20);
            }
        }
    }, [data, colors, symbols]);

    // Crosshair
    const drawCrosshair = useCallback((px: number, py: number) => {
        const ov = overlayRef.current; const tt = tooltipRef.current;
        if (!ov || !tt) return;
        const s = stateRef.current; if (!s.W) return;

        const dpr = window.devicePixelRatio || 1;
        const ctx = ov.getContext('2d')!;
        ctx.clearRect(0, 0, ov.width, ov.height); ctx.scale(dpr, dpr);

        const x = Math.max(s.pad.l, Math.min(px, s.W - s.pad.r));
        const y = Math.max(s.pad.t, Math.min(py, s.pad.t + s.cH));

        ctx.strokeStyle = 'rgba(156,163,175,0.6)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(x, s.pad.t); ctx.lineTo(x, s.pad.t + s.cH); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s.pad.l, y); ctx.lineTo(s.W - s.pad.r, y); ctx.stroke();
        ctx.setLineDash([]);

        // Y badge
        const yVal = s.maxV - ((y - s.pad.t) / s.cH) * s.range;
        ctx.fillStyle = 'rgba(107,114,128,0.9)';
        ctx.fillRect(s.pad.l - 56, y - 9, 52, 18);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 9px -apple-system, sans-serif'; ctx.textAlign = 'right';
        ctx.fillText(yVal.toFixed(1) + '%', s.pad.l - 8, y + 3);

        if (s.lines.length > 0 && s.lines[0].data.length > 0) {
            const ratio = (x - s.pad.l) / s.cW;
            const idx = Math.max(0, Math.min(Math.round(ratio * (s.lines[0].data.length - 1)), s.lines[0].data.length - 1));

            let ttHtml = '';
            const refDate = s.lines[0].data[idx]?.time || '';
            if (refDate) {
                const dd = new Date(refDate);
                ttHtml += `<div class="text-[10px] font-bold text-blue-400 mb-1">${dd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>`;
            }

            s.lines.forEach((line: any) => {
                if (idx >= line.data.length) return;
                const d = line.data[idx];
                const dx = s.pad.l + (idx / (line.data.length - 1 || 1)) * s.cW;
                const dy = s.pad.t + ((s.maxV - d.value) / s.range) * s.cH;

                ctx.fillStyle = line.color;
                ctx.beginPath(); ctx.arc(dx, dy, 5, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = 'white'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(dx, dy, 5, 0, Math.PI * 2); ctx.stroke();

                const sign = d.value >= 0 ? '+' : '';
                ttHtml += `<div class="flex items-center gap-1.5 text-[9px]"><div class="w-2 h-2 rounded-full flex-shrink-0" style="background:${line.color}"></div><span class="font-semibold min-w-[40px]">${line.symbol}</span><span class="font-bold" style="color:${line.color}">${sign}${d.value.toFixed(2)}%</span></div>`;
            });

            tt.innerHTML = ttHtml; tt.style.display = 'block';
            let tx = x + 14; if (tx + 140 > s.W) tx = x - 150;
            let ty = y - 60; if (ty < 5) ty = y + 12;
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
            <div className="relative" style={{ height: 400 }}>
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
                    className="absolute hidden pointer-events-none bg-gray-900/95 border border-gray-700 rounded-lg px-2.5 py-2 shadow-lg backdrop-blur-sm z-10 min-w-[110px] space-y-0.5"
                    style={{ display: 'none' }}
                />
            </div>

            {/* Legend */}
            <div className="absolute top-2 left-2 flex flex-wrap gap-3 pointer-events-none">
                {symbols.map((symbol, index) => (
                    <div key={symbol} className="flex items-center gap-1.5 bg-white/80 dark:bg-black/50 px-2 py-1 rounded text-xs font-bold border border-gray-200 dark:border-gray-800">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[symbol] || STOCK_COLORS[index % STOCK_COLORS.length] }}></div>
                        <span className="text-gray-900 dark:text-gray-100">{symbol}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
