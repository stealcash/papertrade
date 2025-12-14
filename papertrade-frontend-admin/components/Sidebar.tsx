'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { logout } from '@/store/slices/authSlice';
import {
    DashboardIcon,
    UsersIcon,
    StocksIcon,
    CategoriesIcon,
    SectorsIcon,
    AdminsIcon,
    TablesIcon,
    SyncIcon,
    LogsIcon,
    ConfigIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    XIcon
} from '@/components/icons';

interface SidebarProps {
    isMobileOpen: boolean;
    setIsMobileOpen: (isOpen: boolean) => void;
    isCollapsed: boolean;
    toggleCollapse: () => void;
}

export default function Sidebar({ isMobileOpen, setIsMobileOpen, isCollapsed, toggleCollapse }: SidebarProps) {
    const pathname = usePathname();
    const dispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const isSuperadmin = user?.role === 'superadmin';

    const menuItems = [
        { name: 'Dashboard', path: '/dashboard', icon: DashboardIcon },
        { name: 'User Management', path: '/users', icon: UsersIcon },
        {
            name: 'Stocks',
            path: '/stocks',
            icon: StocksIcon,
            show: isSuperadmin || user?.can_manage_stocks
        },
        {
            name: 'Categories',
            path: '/stock-categories',
            icon: CategoriesIcon,
            show: isSuperadmin || user?.can_manage_stocks
        },
        {
            name: 'Sectors',
            path: '/sectors',
            icon: SectorsIcon,
            show: isSuperadmin || user?.can_manage_stocks
        },
        {
            name: 'Admins',
            path: '/admins',
            icon: AdminsIcon
        },
        {
            name: 'Tables',
            path: '/tables',
            icon: TablesIcon,
            show: isSuperadmin
        },
        {
            name: 'Data Sync',
            path: '/sync',
            icon: SyncIcon,
            show: isSuperadmin
        },
        {
            name: 'Logs',
            path: '/debug-logs',
            icon: LogsIcon,
            show: isSuperadmin
        },
        {
            name: 'System Config',
            path: '/config',
            icon: ConfigIcon,
            show: isSuperadmin || user?.can_manage_config
        },
    ];

    const handleLogout = () => {
        dispatch(logout());
        window.location.href = '/login';
    };

    return (
        <>
            {/* Mobile Overlay - sits below header on mobile? User said "under header slide".
          Common pattern: Overlay covers everything content-wise, but maybe not header.
          Let's try z-40 so it's below the z-50 header.
      */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 top-16 z-40 bg-black bg-opacity-50 lg:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar - top-16 to sit below header */}
            <aside
                className={`fixed top-16 left-0 z-40 bg-white dark:bg-gray-900 shadow-xl lg:shadow-none lg:border-r dark:border-gray-800 transition-all duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static
          h-[calc(100vh-4rem)]
          ${isCollapsed ? 'lg:w-20' : 'lg:w-72'}
          w-72 overflow-y-auto
        `}
            >
                <div className="h-full flex flex-col">
                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                        {menuItems.map((item) => {
                            if (item.show === false) return null;

                            const isActive = pathname === item.path;

                            return (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    onClick={() => setIsMobileOpen(false)}
                                    className={`flex items-center px-3 py-3 rounded-lg transition-all duration-200 group
                    ${isActive
                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400'
                                        }
                  `}
                                    title={isCollapsed ? item.name : ''}
                                >
                                    <item.icon className={`w-6 h-6 flex-shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400'}`} />
                                    <span className={`ml-3 whitespace-nowrap transition-all duration-300 origin-left
                    ${isCollapsed ? 'lg:scale-0 lg:w-0 lg:opacity-0' : 'lg:scale-100 lg:w-auto lg:opacity-100'}
                  `}>
                                        {item.name}
                                    </span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Footer / Logout */}
                    <div className="p-4 border-t dark:border-gray-800">
                        <button
                            onClick={handleLogout}
                            className={`flex items-center w-full px-3 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all group`}
                            title={isCollapsed ? "Logout" : ''}
                        >
                            <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span className={`ml-3 whitespace-nowrap transition-all duration-300 origin-left
                ${isCollapsed ? 'lg:scale-0 lg:w-0 lg:opacity-0' : 'lg:scale-100 lg:w-auto lg:opacity-100'}
              `}>
                                Logout
                            </span>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
