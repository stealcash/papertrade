'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { authAPI } from '@/lib/api';
import { setCredentials } from '@/store/slices/authSlice';
import { Mail, Lock, User, ArrowRight, TrendingUp, Phone, ShieldCheck } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((s: RootState) => s.auth);

  const [data, setData] = useState({
    name: "",
    email: "",
    password: "",
    confirm_password: "",
    phone: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.push("/dashboard");
  }, [isAuthenticated, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (data.password !== data.confirm_password) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.signup(data);
      const { token, user } = res.data.data;

      localStorage.setItem("access_token", token);
      dispatch(setCredentials({ user, token }));
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "Error creating account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6 transition-colors duration-300">

      {/* Container */}
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-none p-10 space-y-8">

        {/* Logo & Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center gap-3 justify-center mb-4">
            <div className="p-2 bg-black dark:bg-blue-600 rounded-lg">
              <TrendingUp size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">PaperTrade</h1>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create Account</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Join thousands of traders today</p>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-1 uppercase">Full Name</label>
              <div className="relative group">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" />
                <input
                  required
                  type="text"
                  placeholder="John Doe"
                  value={data.name}
                  onChange={(e) => setData({ ...data, name: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-black/5 dark:focus:ring-blue-500/20 focus:border-black dark:focus:border-blue-500 outline-none transition-all placeholder-gray-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-1 uppercase">Email Address</label>
              <div className="relative group">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" />
                <input
                  required
                  type="email"
                  placeholder="john@example.com"
                  value={data.email}
                  onChange={(e) => setData({ ...data, email: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-black/5 dark:focus:ring-blue-500/20 focus:border-black dark:focus:border-blue-500 outline-none transition-all placeholder-gray-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-1 uppercase">Phone Number</label>
              <div className="relative group">
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" />
                <input
                  required
                  type="tel"
                  placeholder="9876543210"
                  value={data.phone}
                  onChange={(e) => setData({ ...data, phone: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-black/5 dark:focus:ring-blue-500/20 focus:border-black dark:focus:border-blue-500 outline-none transition-all placeholder-gray-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-1 uppercase">Password</label>
                <div className="relative group">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" />
                  <input
                    required
                    type="password"
                    placeholder="••••••••"
                    value={data.password}
                    onChange={(e) => setData({ ...data, password: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-black/5 dark:focus:ring-blue-500/20 focus:border-black dark:focus:border-blue-500 outline-none transition-all placeholder-gray-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-1 uppercase">Confirm</label>
                <div className="relative group">
                  <ShieldCheck size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" />
                  <input
                    required
                    type="password"
                    placeholder="••••••••"
                    value={data.confirm_password}
                    onChange={(e) => setData({ ...data, confirm_password: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-black/5 dark:focus:ring-blue-500/20 focus:border-black dark:focus:border-blue-500 outline-none transition-all placeholder-gray-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black dark:bg-blue-600 hover:bg-gray-800 dark:hover:bg-blue-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 shadow-lg shadow-black/10 mt-6"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Creating Account...
              </span>
            ) : (
              <>
                Create Free Account
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{" "}
          <Link href="/login" className="text-black dark:text-blue-400 font-bold hover:underline underline-offset-4">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
