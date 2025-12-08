import React from 'react';

interface StatsCardProps {
    title: string;
    value: string | number;
    change?: number;
    icon?: React.ReactNode;
    trend?: 'up' | 'down' | 'neutral';
    className?: string;
}

export default function StatsCard({ title, value, change, icon, trend = 'neutral', className = '' }: StatsCardProps) {
    const getTrendColor = () => {
        if (trend === 'up') return 'text-green-400';
        if (trend === 'down') return 'text-red-400';
        return 'text-gray-400';
    };

    const getTrendIcon = () => {
        if (trend === 'up') return '↑';
        if (trend === 'down') return '↓';
        return '→';
    };

    return (
        <div className={`stat-card ${className}`}>
            <div className="flex items-start justify-between mb-3">
                <span className="text-gray-400 text-sm font-medium uppercase tracking-wide">{title}</span>
                {icon && <div className="text-purple-400 opacity-60">{icon}</div>}
            </div>

            <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold text-white">{value}</h3>
                {change !== undefined && (
                    <span className={`text-sm font-semibold flex items-center gap-1 ${getTrendColor()}`}>
                        <span>{getTrendIcon()}</span>
                        <span>{Math.abs(change)}%</span>
                    </span>
                )}
            </div>
        </div>
    );
}
