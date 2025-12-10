'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

export default function SuperAdminPage() {
    const router = useRouter();
    const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        if (!isAuthenticated) {
            router.push('/login');
            return;
        }

        if (user?.role !== 'superadmin') {
            router.push('/dashboard');
        }
    }, [isAuthenticated, user, mounted, router]);

    if (!mounted || !isAuthenticated || user?.role !== 'superadmin') {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-12 w-12 bg-blue-600 rounded-full mb-4"></div>
                    <div className="h-4 w-32 bg-gray-700 rounded"></div>
                </div>
            </div>
        );
    }

    const cards = [
        {
            title: "Manage Admins",
            description: "View, edit, and control admin privileges",
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            ),
            bg: "from-blue-500 to-indigo-600",
            link: "/admins"
        },
        {
            title: "Create Admin",
            description: "Onboard new administrators to the platform",
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
            ),
            bg: "from-green-500 to-emerald-600",
            link: "/create-admin"
        },
        {
            title: "System Config",
            description: "Global platform settings and feature flags",
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
            bg: "from-purple-500 to-fuchsia-600",
            link: "/config"
        },
        {
            title: "Database Tables",
            description: "Direct view of database schemas and records",
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
            ),
            bg: "from-orange-500 to-red-600",
            link: "/tables"
        },
        {
            title: "Data Sync",
            description: "Trigger market data synchronization jobs",
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
            ),
            bg: "from-pink-500 to-rose-600",
            link: "/sync"
        },
        {
            title: "Debug Logs",
            description: "Inspect system and synchronization logs",
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            bg: "from-gray-600 to-gray-800",
            link: "/debug-logs"
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header */}
            <header className="bg-white shadow-sm border-b sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-2 rounded-lg shadow-lg">
                                <span className="text-xl font-bold text-white tracking-wider">SA</span>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
                                    Superadmin Console
                                </h1>
                                <p className="text-sm text-gray-500 font-medium">Elevated Previleges • {user?.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="bg-white text-gray-700 px-5 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all font-medium flex items-center shadow-sm"
                        >
                            <span className="mr-2">←</span> Return to Dashboard
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
                {/* Welcome Banner */}
                <div className="mb-10 bg-gradient-to-r from-gray-900 to-black rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

                    <div className="relative z-10">
                        <h2 className="text-3xl font-bold text-white mb-2">Welcome, Supreme Commander</h2>
                        <p className="text-gray-300 max-w-2xl text-lg">
                            This is the restricted superadmin zone. Here you have complete control over the system configuration, database records, and user management hierarchies. Proceed with caution.
                        </p>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cards.map((card, index) => (
                        <div
                            key={index}
                            onClick={() => router.push(card.link)}
                            className="group bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:border-transparent transition-all duration-300 cursor-pointer relative overflow-hidden"
                        >
                            <div className={`absolute top-0 right-0 p-3 rounded-bl-2xl bg-gradient-to-br ${card.bg} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                {card.icon}
                            </div>

                            <div className="mt-8">
                                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                                    {card.title}
                                </h3>
                                <p className="text-gray-500 text-sm leading-relaxed">
                                    {card.description}
                                </p>
                            </div>

                            <div className="mt-6 flex items-center text-sm font-medium text-blue-600 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                                Access Tool <span className="ml-1">→</span>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
