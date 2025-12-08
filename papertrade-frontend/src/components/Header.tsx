'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { logout } from '@/store/slices/authSlice';

export default function Header() {
    const router = useRouter();
    const pathname = usePathname();
    const dispatch = useDispatch();
    const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

    const handleLogout = () => {
        dispatch(logout());
        router.push('/login');
    };

    if (!isAuthenticated) {
        return null;
    }

    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

    const navItems = [
        { name: 'Dashboard', path: '/dashboard', icon: '📊' },
        { name: 'Stocks', path: '/stocks', icon: '📈' },
        { name: 'History', path: '/stock-history', icon: '📅' },
        { name: 'Backtest', path: '/backtest', icon: '🔬' },
        { name: 'Strategies', path: '/strategy', icon: '🎯' },
        { name: 'Wallet', path: '/wallet', icon: '💰' },
    ];

    if (isAdmin) {
        navItems.push({ name: 'Admin', path: '/admin', icon: '⚙️' });
    }

    if (user?.role === 'superadmin') {
        navItems.push({ name: 'Superadmin', path: '/superadmin', icon: '👑' });
    }

    return (
        <header className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo/Brand */}
                    <div className="flex items-center space-x-3">
                        <div className="bg-white p-2 rounded-lg">
                            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                PT
                            </span>
                        </div>
                        <span className="text-white text-xl font-bold hidden sm:block">PaperTrade</span>
                    </div>

                    {/* Navigation Buttons */}
                    <nav className="hidden md:flex items-center space-x-2">
                        {navItems.map((item) => {
                            const isActive = pathname === item.path;
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => router.push(item.path)}
                                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${isActive
                                        ? 'bg-white text-blue-600 shadow-lg'
                                        : 'text-white hover:bg-white/20'
                                        }`}
                                >
                                    <span className="mr-1">{item.icon}</span>
                                    {item.name}
                                </button>
                            );
                        })}
                    </nav>

                    {/* User Info & Logout */}
                    <div className="flex items-center space-x-4">
                        <div className="hidden lg:flex flex-col items-end">
                            <span className="text-white text-sm font-semibold">{user?.email?.split('@')[0]}</span>
                            <span className="text-blue-200 text-xs capitalize">{user?.role}</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-all shadow-md"
                        >
                            Logout
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                <div className="md:hidden pb-3 flex space-x-2 overflow-x-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <button
                                key={item.path}
                                onClick={() => router.push(item.path)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${isActive
                                    ? 'bg-white text-blue-600'
                                    : 'text-white bg-white/20'
                                    }`}
                            >
                                {item.icon} {item.name}
                            </button>
                        );
                    })}
                </div>
            </div>
        </header>
    );
}
