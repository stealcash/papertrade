'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import { TrendingUp, BarChart3, Shield, Zap } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useSelector((state: any) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);
  return (
    <div className="min-h-screen bg-white flex flex-col text-gray-800">

      {/* Header */}
      <header className="border-b bg-white/90 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">

          {/* Logo */}
          <div className="flex items-center gap-2">
            <TrendingUp size={26} className="text-gray-900" />
            <h1 className="text-xl font-semibold">PaperTrade</h1>
          </div>

          {/* Auth Buttons */}
          <div className="flex gap-3">
            <Link href="/login">
              <button className="px-5 py-2 border border-gray-300 hover:bg-gray-100 rounded-lg text-sm transition">
                Login
              </button>
            </Link>
            <Link href="/signup">
              <button className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm transition">
                Sign Up
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1">

        {/* Hero */}
        <section className="max-w-7xl mx-auto px-6 py-24 text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-4">
            Master Trading Without Risk
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Practice stock & options trading with virtual money. Backtest, refine strategies and learn without losing real money.
          </p>
          <Link href="/signup">
            <button className="px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-base shadow-md transition-all">
              Start Trading Free
            </button>
          </Link>
        </section>

        {/* Features */}
        <section className="max-w-7xl mx-auto px-6 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            <FeatureCard
              icon={<BarChart3 size={22} />}
              title="Virtual Trading"
              desc="Trade using ₹1,00,000 virtual money & learn without any risk."
            />

            <FeatureCard
              icon={<Zap size={22} />}
              title="Real Market Data"
              desc="Fetch live prices of stocks & options for realistic experience."
            />

            <FeatureCard
              icon={<Shield size={22} />}
              title="Advanced Backtesting"
              desc="Test strategies on historical charts before real trading."
            />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2 text-gray-800">
            <TrendingUp size={20} />
            <span className="font-medium">PaperTrade</span>
          </div>

          <p>© 2024 PaperTrade. All rights reserved.</p>

          <div className="flex gap-6">
            <Link href="#" className="hover:text-gray-900">Privacy</Link>
            <Link href="#" className="hover:text-gray-900">Terms</Link>
            <Link href="#" className="hover:text-gray-900">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}


// REUSABLE CARD — clean, white, minimal UI
function FeatureCard({ icon, title, desc }: any) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-8 hover:shadow-lg hover:-translate-y-1 transition-all">
      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-4 text-gray-700">
        {icon}
      </div>
      <h3 className="font-semibold text-lg text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm leading-6">{desc}</p>
    </div>
  );
}
