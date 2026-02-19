import React from 'react';

interface PatternChartProps {
    data: number[];
    highlightLast?: number;
    height?: number;
    barWidth?: number;
    gap?: number;
}

const PatternChart: React.FC<PatternChartProps> = ({
    data,
    highlightLast = 0,
    height = 60,
    barWidth = 6,
    gap = 2
}) => {
    if (!data || data.length === 0) return null;

    const maxAbs = Math.max(...data.map(Math.abs), 0.1);

    return (
        <div
            className="flex items-stretch justify-center relative bg-slate-50 rounded select-none"
            style={{ height: `${height}px`, width: '100%' }}
        >
            {/* Zero Line */}
            <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-200 z-0" />

            {/* Bars */}
            <div className="flex items-stretch z-10 h-full" style={{ gap: `${gap}px` }}>
                {data.map((val, idx) => {
                    const isPositive = val >= 0;
                    const pct = (Math.abs(val) / maxAbs) * 100; // % of half-height

                    const isProjection = highlightLast > 0 && idx >= (data.length - highlightLast);

                    // Tailwind colors
                    // Green: bg-green-500 (#22c55e), Red: bg-red-500 (#ef4444)
                    // Projection: Lighter or distinct? Let's use same for now, or maybe brighter/different shade
                    let colorClass = isPositive ? 'bg-green-500' : 'bg-red-500';
                    if (isProjection) {
                        colorClass = isPositive ? 'bg-green-400' : 'bg-red-400';
                    }

                    return (
                        <div
                            key={idx}
                            className="flex flex-col h-full justify-center"
                            style={{ width: `${barWidth}px` }}
                        >
                            <div className="flex-1 flex flex-col justify-end">
                                {isPositive && (
                                    <div
                                        className={`w-full rounded-sm ${colorClass}`}
                                        style={{ height: `${pct * 0.45}%` }} // Scale to < 50% to fit
                                    />
                                )}
                            </div>

                            {/* Spacer for zero line alignment */}
                            <div style={{ height: '2px' }} />

                            <div className="flex-1 flex flex-col justify-start">
                                {!isPositive && (
                                    <div
                                        className={`w-full rounded-sm ${colorClass}`}
                                        style={{ height: `${pct * 0.45}%` }}
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PatternChart;
