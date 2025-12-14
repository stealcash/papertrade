'use client';

import { Menu, User, LogOut, ChevronLeft, ChevronRight, Sun, Moon } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { logout } from '@/store/slices/authSlice';
import { useTheme } from '@/context/ThemeContext';

interface TopHeaderProps {
    handleMobileToggle: () => void;
    handleDesktopToggle: () => void;
    isCollapsed: boolean;
}

export default function TopHeader({ handleMobileToggle, handleDesktopToggle, isCollapsed }: TopHeaderProps) {
    const router = useRouter();
    const dispatch = useDispatch();
    const { user } = useSelector((state: any) => state.auth);
    const { theme, toggleTheme } = useTheme();

    const handleLogout = () => {
        dispatch(logout());
        router.push('/login');
    };

    return (
        <header className="fixed top-0 z-50 w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-16 transition-all duration-300">
            <div className="flex items-center justify-between px-4 h-full">
                <div className="flex items-center gap-3">
                    {/* Mobile Menu Toggle */}
                    <button
                        onClick={handleMobileToggle}
                        className="lg:hidden p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-lg text-white font-bold text-lg">
                            PT
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 hidden sm:block">
                            PaperTrade
                        </span>
                    </div>

                    {/* Desktop Sidebar Toggle */}
                    <button
                        onClick={handleDesktopToggle}
                        className="hidden lg:flex items-center justify-center p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md ml-4 transition-colors"
                        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>

                    {/* User Info */}
                    <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-200 font-semibold text-xs border border-blue-200 dark:border-blue-800">
                            {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || <User size={14} />}
                        </div>
                        <div className="hidden sm:block text-sm">
                            <p className="font-medium text-gray-700 dark:text-gray-200 leading-none">{user?.name || user?.email?.split('@')[0]}</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-0.5">{user?.role}</p>
                        </div>
                    </div>

                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </div>
        </header>
    );
}
