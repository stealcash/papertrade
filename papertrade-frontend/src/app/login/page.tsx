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
      <div className="w-full max-w-lg bg-white shadow-sm border border-gray-200 rounded-2xl p-10 space-y-10">

        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-6">
          <TrendingUp size={36} className="text-black" />
          <h1 className="text-3xl font-bold text-gray-900">PaperTrade</h1>
        </div>

        {/* Title */}
        <div>
          <h2 className="text-3xl font-semibold text-gray-900">Welcome Back</h2>
          <p className="text-gray-500 mt-1">Sign in to continue</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* ---------- Form ---------- */}
        <form onSubmit={submit} className="space-y-6">

          <div>
            <label className="text-gray-700 text-sm font-medium mb-1 block">Email</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                value={data.email}
                onChange={(e) => setData({ ...data, email: e.target.value })}
                className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none"
                placeholder="you@mail.com"
              />
            </div>
          </div>

          <div>
            <label className="text-gray-700 text-sm font-medium mb-1 block">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                value={data.password}
                onChange={(e) => setData({ ...data, password: e.target.value })}
                className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black hover:bg-gray-900 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Signup Link */}
        <div className="text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <Link href="/signup" className="text-black font-medium hover:underline">
            Sign Up
          </Link>
        </div>

      </div>
    </div>
  );
}
