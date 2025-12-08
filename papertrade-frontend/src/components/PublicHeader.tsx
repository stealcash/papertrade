'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function PublicHeader() {
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        // Check for token in localStorage to determine auth state
        const token = localStorage.getItem('access_token');
        setIsLoggedIn(!!token);
    }, []);

    return (
        <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">
            <div className="w-full max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    {/* Logo */}
                    <div
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={() => router.push('/')}
                    >
                        <div className="p-2 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-lg shadow-md group-hover:shadow-purple-500/30 transition-all duration-300">
                            <span className="text-xl font-bold text-white">PT</span>
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                            PaperTrade
                        </span>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-8">
                        {['Features', 'Pricing', 'About'].map((item) => (
                            <a
                                key={item}
                                href={`#${item.toLowerCase()}`}
                                className="font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                                {item}
                            </a>
                        ))}
                    </nav>

                    {/* Desktop Auth Buttons */}
                    <div className="hidden md:flex items-center gap-4">
                        {isLoggedIn ? (
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-500 hover:to-purple-500 transition-all shadow-md hover:shadow-lg"
                            >
                                Dashboard
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => router.push('/login')}
                                    className="px-5 py-2 font-semibold text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                >
                                    Login
                                </button>
                                <button
                                    onClick={() => router.push('/signup')}
                                    className="px-5 py-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-indigo-500 hover:to-pink-500 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                                >
                                    Sign Up
                                </button>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? (
                            <span className="text-xl font-bold">✕</span>
                        ) : (
                            <span className="text-xl font-bold">☰</span>
                        )}
                    </button>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden py-4 border-t border-gray-200 dark:border-gray-800 animate-fade-in">
                        <nav className="flex flex-col gap-4">
                            {['Features', 'Pricing', 'About'].map((item) => (
                                <a
                                    key={item}
                                    href={`#${item.toLowerCase()}`}
                                    className="font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-2"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {item}
                                </a>
                            ))}
                            <div className="flex flex-col gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                                {isLoggedIn ? (
                                    <button
                                        onClick={() => {
                                            router.push('/dashboard');
                                            setMobileMenuOpen(false);
                                        }}
                                        className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg shadow-md"
                                    >
                                        Dashboard
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => {
                                                router.push('/login');
                                                setMobileMenuOpen(false);
                                            }}
                                            className="px-6 py-3 font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                        >
                                            Login
                                        </button>
                                        <button
                                            onClick={() => {
                                                router.push('/signup');
                                                setMobileMenuOpen(false);
                                            }}
                                            className="px-6 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-semibold rounded-lg shadow-md"
                                        >
                                            Sign Up
                                        </button>
                                    </>
                                )}
                            </div>
                        </nav>
                    </div>
                )}
            </div>
        </header>
    );
}
