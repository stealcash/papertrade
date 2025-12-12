'use client';

import { useRouter, usePathname } from 'next/navigation';

export default function Navigation() {
    const router = useRouter();
    const pathname = usePathname();

    const navItems = [
        { name: 'Dashboard', path: '/dashboard' },
        { name: 'Stocks', path: '/stocks' },
        { name: 'History', path: '/stock-history' },
        { name: 'Options', path: '/options' },
        { name: 'Analysis', path: '/market-analysis' },
        { name: 'Backtest', path: '/backtest' },
        { name: 'Strategies', path: '/strategy' },
        { name: 'Wallet', path: '/wallet' },
        { name: 'Profile', path: '/profile' },
        { name: 'Plans', path: '/subscription' },
        { name: 'Notifications', path: '/notifications' },
    ];

    return (
        <nav className="bg-white border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex space-x-1 overflow-x-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
                        return (
                            <button
                                key={item.path}
                                onClick={() => router.push(item.path)}
                                className={`px-4 py-4 font-semibold whitespace-nowrap transition-colors ${isActive
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-600 hover:text-blue-600'
                                    }`}
                            >
                                {item.name}
                            </button>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}
