import { createChart, ColorType, CandlestickData, CandlestickSeries, SeriesMarker, Time, createSeriesMarkers } from 'lightweight-charts';
import React, { useEffect, useRef, useState } from 'react';

interface StockChartProps {
    data: CandlestickData[]; // Array of { time: 'yyyy-mm-dd', open, high, low, close }
    markers?: SeriesMarker<Time>[];
    priceTargets?: { price: number; label: string; color: string }[];
    colors?: {
        backgroundColor?: string;
        lineColor?: string;
        textColor?: string;
        areaTopColor?: string;
        areaBottomColor?: string;
    };
    height?: number;
}

export const StockChart = (props: StockChartProps) => {
    const {
        data,
        markers = [],
        height = 400,
        colors: {
            backgroundColor = 'transparent',
            textColor = '#D9D9D9',
        } = {},
    } = props;

    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const seriesRef = useRef<any>(null);

    // Zoom state
    const [period, setPeriod] = useState('1Y');

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const handleResize = () => {
            if (chartRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current!.clientWidth });
            }
        };

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: backgroundColor },
                textColor,
                attributionLogo: false,
            },
            width: chartContainerRef.current.clientWidth,
            height: height,
            grid: {
                vertLines: { color: 'rgba(197, 203, 206, 0.1)' },
                horzLines: { color: 'rgba(197, 203, 206, 0.1)' },
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            },
            handleScroll: {
                mouseWheel: true,
                pressedMouseMove: true,
                horzTouchDrag: true,
                vertTouchDrag: true,
            },
            handleScale: {
                axisPressedMouseMove: true,
                mouseWheel: true,
                pinch: true,
            },
        });

        chartRef.current = chart;

        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });

        seriesRef.current = candlestickSeries;

        candlestickSeries.setData(data);

        // Ensure markers are valid and sorted
        if (markers && markers.length > 0) {
            const validMarkers = markers.map(m => ({
                ...m,
                time: m.time as Time, // Ensure type compatibility
            })).sort((a: any, b: any) => (new Date(a.time).getTime() - new Date(b.time).getTime()));

            createSeriesMarkers(candlestickSeries, validMarkers);
        }

        // Add Price Lines for Targets
        if (props.priceTargets) {
            props.priceTargets.forEach(target => {
                candlestickSeries.createPriceLine({
                    price: target.price,
                    color: target.color,
                    lineWidth: 2,
                    lineStyle: 1, // LineStyle.Dashed is 1
                    axisLabelVisible: true,
                    title: target.label,
                });
            });
        }

        chart.timeScale().fitContent();

        // Subscribe to crosshair move for tooltip
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data, markers, props.priceTargets, backgroundColor, textColor]);

    // Handle Period Change logic could be complex without full historical data, 
    // but we can set visible range if we had enough data loaded. 
    // For now, we will simulate it by just fitting content as we don't have separate API calls per period in this component.

    return (
        <div className="w-full relative">
            <div className="absolute top-2 right-12 z-10 flex gap-1 bg-white/10 p-1 rounded-md backdrop-blur-sm">
                {['1M', '3M', '6M', '1Y', 'ALL'].map((p) => (
                    <button
                        key={p}
                        onClick={() => {
                            setPeriod(p);
                            if (chartRef.current) chartRef.current.timeScale().fitContent();
                        }}
                        className={`px-2 py-0.5 text-xs font-semibold rounded ${period === p ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        {p}
                    </button>
                ))}
            </div>
            <div ref={chartContainerRef} className="w-full" />
        </div>
    );
};
