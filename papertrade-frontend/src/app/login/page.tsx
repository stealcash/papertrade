'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { setCredentials } from '@/store/slices/authSlice';
import { authAPI } from '@/lib/api';
import { Mail, Lock, ArrowRight, TrendingUp } from 'lucide-react';

export default function LoginPage() {

  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((s: RootState) => s.auth);

  const [data, setData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.push("/dashboard");
  }, [isAuthenticated]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);

    try {
      const res = await authAPI.login(data);
      const { token, user } = res.data.data;

      localStorage.setItem("access_token", token);
      // localStorage.setItem("refresh_token",refresh); // Backend doesn't return refresh token currently
      dispatch(setCredentials({ user, token }));
      router.push("/dashboard");

    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">

      {/* ------------ Login Card ------------- */}
      <div className="w-full max-w-lg bg-white shadow-xl shadow-gray-200/50 border border-gray-200 rounded-2xl p-10 space-y-10">

        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-6">
          <div className="p-2 bg-black rounded-lg">
            <TrendingUp size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">PaperTrade</h1>
        </div>

        {/* Title */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
          <p className="text-gray-500 mt-2 text-sm">Sign in to continue to your dashboard</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm text-center">
            {error}
          </div>
        )}

        {/* ---------- Form ---------- */}
        <form onSubmit={submit} className="space-y-6">

          <div className="space-y-2">
            <label className="text-gray-700 text-sm font-semibold ml-1">Email</label>
            <div className="relative group">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" />
              <input
                type="email"
                required
                value={data.email}
                onChange={(e) => setData({ ...data, email: e.target.value })}
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all placeholder-gray-400 text-gray-900"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-gray-700 text-sm font-semibold ml-1">Password</label>
            <div className="relative group">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" />
              <input
                type="password"
                required
                value={data.password}
                onChange={(e) => setData({ ...data, password: e.target.value })}
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all placeholder-gray-400 text-gray-900"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black hover:bg-gray-800 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 mt-2 transition-transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-black/20"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Signing in...
              </span>
            ) : (
              <>
                Sign In
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Signup Link */}
        <div className="text-center text-sm text-gray-500">
          Don't have an account?{" "}
          <Link href="/signup" className="text-black font-semibold hover:underline underline-offset-4">
            Sign Up
          </Link>
        </div>

      </div>
    </div>
  );
}
