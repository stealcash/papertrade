import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ChartProps {
    data: number[];
    labels?: string[]; // Currently removed labels for cleaner look, but kept prop
    highlightLast?: number;
    height?: number;
    barWidth?: number;
    gap?: number;
}

export default function PatternChart({ data, highlightLast = 0, height = 80, barWidth = 6, gap = 4 }: ChartProps) {
    if (!data || data.length === 0) return null;

    // Use a fixed max range or dynamic? Dynamic is better for pattern shape matching visualization.
    // Use symmetric max to keep 0 in center
    const maxAbs = Math.max(...data.map(Math.abs), 0.1);

    return (
        <View style={[styles.container, { height }]}>
            <View style={styles.chartArea}>
                {data.map((val, idx) => {
                    const isPositive = val >= 0;
                    const pct = (Math.abs(val) / maxAbs) * 100; // % of half-height

                    // Highlight logic
                    const isProjection = highlightLast > 0 && idx >= (data.length - highlightLast);
                    const color = isPositive
                        ? (isProjection ? '#4ade80' : '#22c55e')
                        : (isProjection ? '#f87171' : '#ef4444');

                    return (
                        <View key={idx} style={[styles.column, { width: barWidth, marginHorizontal: gap / 2 }]}>
                            {/* Upper Half (Positive) */}
                            <View style={styles.upperHalf}>
                                {isPositive && (
                                    <View style={[styles.bar, { height: `${pct}%`, backgroundColor: color }]} />
                                )}
                            </View>

                            {/* Zero Line visual spacer */}
                            <View style={styles.separator} />

                            {/* Lower Half (Negative) */}
                            <View style={styles.lowerHalf}>
                                {!isPositive && (
                                    <View style={[styles.bar, { height: `${pct}%`, backgroundColor: color }]} />
                                )}
                            </View>
                        </View>
                    );
                })}
            </View>

            {/* Zero Line Overlay */}
            <View style={styles.zeroLine} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        justifyContent: 'center',
        backgroundColor: '#f1f5f9',
        borderRadius: 4,
        position: 'relative',
    },
    chartArea: {
        flexDirection: 'row',
        height: '100%',
        alignItems: 'stretch',
        justifyContent: 'center',
        paddingHorizontal: 4
    },
    column: {
        height: '100%',
        flexDirection: 'column',
    },
    upperHalf: {
        flex: 1,
        justifyContent: 'flex-end', // Bars grow up from bottom
    },
    lowerHalf: {
        flex: 1,
        justifyContent: 'flex-start', // Bars grow down from top
    },
    bar: {
        width: '100%',
        borderRadius: 1,
        minHeight: 2,
    },
    separator: {
        height: 0, // Virtual center
    },
    zeroLine: {
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: '#cbd5e1',
        zIndex: -1,
        opacity: 0.5
    }
});
