"use client";

import Link from "next/link";
import { TrendingUp, ShieldCheck, Mail } from "lucide-react";

export default function PrivacyPage() {
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
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600">
                        <ShieldCheck size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Privacy Policy</h1>
                        <p className="text-gray-500">Last updated: January 25, 2026</p>
                    </div>
                </div>

                <div className="prose prose-blue dark:prose-invert max-w-none space-y-8 text-gray-600 dark:text-gray-400">
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">1. Information We Collect</h2>
                        <p>We collect information you provide directly to us when you create an account, such as your name and email address. We also collect data related to your virtual trading activities, including trade volume, strategies used, and portfolio performance to provide you with personalized insights.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">2. How We Use Your Information</h2>
                        <p>Your data is used to maintain your account, process your virtual trades, and improve our paper trading platform. We may also use your contact information to send you updates regarding new features or security alerts.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">3. Data Security</h2>
                        <p>We implement industry-standard security measures to protect your information. Since PaperTrade involves virtual currency and no real financial transactions, your personal data security remains our primary focus.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">4. Third-Party Services</h2>
                        <p>We may use third-party analytics tools to help us understand how users interact with our platform. These services may collect information sent by your browser as part of a web page request, such as cookies or your IP address.</p>
                    </section>

                    <section className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-8 border border-gray-100 dark:border-gray-800">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Mail size={20} className="text-blue-500" />
                            Contact Us
                        </h2>
                        <p>If you have any questions about this Privacy Policy, please contact us at:</p>
                        <p className="font-semibold text-gray-900 dark:text-white">support@papertrade.com</p>
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
