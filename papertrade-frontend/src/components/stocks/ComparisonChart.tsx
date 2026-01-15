import { createChart, ColorType, LineSeries, Time } from 'lightweight-charts';
import React, { useEffect, useRef, useState } from 'react';

interface ComparisonChartProps {
    data: { [symbol: string]: { time: string; value: number }[] }; // Normalized data (e.g. % change)
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
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const handleResize = () => {
            if (chartRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current!.clientWidth });
            }
        };

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#9ca3af', // Gray-400
                attributionLogo: false,
            },
            width: chartContainerRef.current.clientWidth,
            height: 400,
            grid: {
                vertLines: { color: 'rgba(197, 203, 206, 0.1)' },
                horzLines: { color: 'rgba(197, 203, 206, 0.1)' },
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            },
            leftPriceScale: { visible: true },
        });

        chartRef.current = chart;

        // Add Series for each stock
        Object.keys(data).forEach((symbol, index) => {
            const seriesData = data[symbol].map(d => ({
                time: d.time as Time,
                value: d.value
            })).sort((a: any, b: any) => (new Date(a.time).getTime() - new Date(b.time).getTime()));

            const color = colors[symbol] || STOCK_COLORS[index % STOCK_COLORS.length];

            const series = chart.addSeries(LineSeries, {
                color: color,
                lineWidth: 2,
                title: symbol,
            });

            series.setData(seriesData);
        });

        chart.timeScale().fitContent();

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data, colors]);

    return (
        <div className="w-full relative">
            <div ref={chartContainerRef} className="w-full" />

            {/* Legend Overlay */}
            <div className="absolute top-2 left-2 flex flex-wrap gap-3 pointer-events-none">
                {Object.keys(data).map((symbol, index) => (
                    <div key={symbol} className="flex items-center gap-1.5 bg-white/80 dark:bg-black/50 px-2 py-1 rounded text-xs font-bold border border-gray-200 dark:border-gray-800">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[symbol] || STOCK_COLORS[index % STOCK_COLORS.length] }}></div>
                        <span className="text-gray-900 dark:text-gray-100">{symbol}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
