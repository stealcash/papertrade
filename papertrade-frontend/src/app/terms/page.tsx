"use client";

import Link from "next/link";
import { TrendingUp, FileText, CheckCircle2 } from "lucide-react";

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col text-gray-800 dark:text-gray-200 transition-colors duration-300">
            {/* Header */}
            <header className="border-b bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-sm">
                <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-2">
                        <TrendingUp size={26} className="text-gray-900 dark:text-white" />
                        <h1 className="text-xl font-semibold">PaperTrade</h1>
                    </Link>
                    <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                        Back to Login
                    </Link>
                </div>
            </header>

            <main className="flex-1 max-w-4xl mx-auto px-6 py-16">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center text-orange-600">
                        <FileText size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Terms & Conditions</h1>
                        <p className="text-gray-500">Effective Date: January 25, 2026</p>
                    </div>
                </div>

                <div className="prose prose-orange dark:prose-invert max-w-none space-y-8 text-gray-600 dark:text-gray-400">
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">1. Acceptance of Terms</h2>
                        <p>By accessing or using PaperTrade, you agree to be bound by these Terms. If you do not agree to all of these terms, do not use our services.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">2. Virtual Currency Only</h2>
                        <div className="bg-orange-50 dark:bg-orange-900/10 border-l-4 border-orange-500 p-4 mb-4 text-orange-800 dark:text-orange-300">
                            <p className="font-bold flex items-center gap-2 mb-1">
                                <CheckCircle2 size={16} />
                                Important Notice
                            </p>
                            <p className="text-sm text-orange-700 dark:text-orange-400">PaperTrade is a simulation platform. All currency used is virtual. We do not support real-money trading, and virtual balances cannot be withdrawn or converted to real currency.</p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">3. User Conduct</h2>
                        <p>You are responsible for maintaining the confidentiality of your account and password. You agree to use the platform for educational and simulation purposes only, and not for any illegal activity.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">4. Limitation of Liability</h2>
                        <p>PaperTrade provides market data for informational purposes only. We are not responsible for any financial decisions made based on the data or simulations provided on our platform. Trading in real markets involves significant risk.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">5. Modifications</h2>
                        <p>We reserve the right to modify these terms at any time. We will notify users of significant changes by updating the effective date at the top of this page.</p>
                    </section>
                </div>
            </main>

            <footer className="border-t bg-gray-50 dark:bg-gray-900/50 py-12">
                <div className="max-w-4xl mx-auto px-6 text-center text-sm text-gray-500">
                    <p>© 2026 PaperTrade. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
