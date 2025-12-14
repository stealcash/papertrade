'use client';

import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { MenuIcon, ChevronLeftIcon, ChevronRightIcon, SunIcon, MoonIcon } from '@/components/icons';
import { useTheme } from '@/context/ThemeContext';

interface TopHeaderProps {
    handleMobileToggle: () => void;
    handleDesktopCollapse: () => void;
    isCollapsed: boolean;
}

export default function TopHeader({
    handleMobileToggle,
    handleDesktopCollapse,
    isCollapsed
}: TopHeaderProps) {
    const { user } = useSelector((state: RootState) => state.auth);
    const { theme, toggleTheme } = useTheme();

    return (
        <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white dark:bg-gray-900 shadow-sm border-b dark:border-gray-800 flex items-center justify-between px-4 transition-all duration-300">
            <div className="flex items-center">
                {/* Mobile Hamburger - Only visible on mobile */}
                <button
                    onClick={handleMobileToggle}
                    className="lg:hidden text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white p-2 mr-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <MenuIcon className="w-6 h-6" />
                </button>

                {/* Desktop Branding & Collapse Toggle */}
                <div className="flex items-center space-x-3">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg flex-shrink-0">
                        <span className="text-xl font-bold text-white">PT</span>
                    </div>
                    <span className="font-bold text-xl text-gray-900 dark:text-gray-100 hidden sm:block">
                        PaperTrade Admin
                    </span>

                    {/* Desktop Collapse Toggle - Visible only on Desktop next to title */}
                    <button
                        onClick={handleDesktopCollapse}
                        className="hidden lg:flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 ml-4 transition-colors"
                        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isCollapsed ? <ChevronRightIcon className="w-5 h-5" /> : <ChevronLeftIcon className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Right side - User Profile & Theme Toggle */}
            <div className="flex items-center space-x-4">

                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                    {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
                </button>

                {user && (
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.email}</p>
                        <div className="flex justify-end items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${user.role === 'superadmin' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                user.role === 'admin' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                                }`}>
                                {user.role}
                            </span>
                        </div>
                    </div>
                )}
                {/* Fallback avatar or icon could go here */}
                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-300 font-bold">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
            </div>
        </header>
    );
}
