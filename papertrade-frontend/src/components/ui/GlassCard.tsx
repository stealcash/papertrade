import React from 'react';

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
    onClick?: () => void;
}

export default function GlassCard({ children, className = '', hover = true, onClick }: GlassCardProps) {
    return (
        <div
            className={`bg-white border border-gray-200 shadow-sm rounded-xl p-6 ${hover ? 'hover:shadow-md transition-shadow' : ''} ${className}`}
            onClick={onClick}
            style={{ cursor: onClick ? 'pointer' : 'default' }}
        >
            {children}
        </div>
    );
}
