'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials } from '@/store/slices/authSlice';
import { authAPI } from '@/lib/api';
import { Mail, Lock, User, ArrowRight, TrendingUp } from 'lucide-react';

export default function SignupPage() {

  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state: any) => state.auth);

  const [f, setF] = useState({ full_name: '', email: '', password: '', confirm_password: '' });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [strength, setStrength] = useState(0);

  useEffect(() => { calcStrength(f.password); }, [f.password]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  function calcStrength(p: string) {
    let s = 0;
    if (p.length >= 8) s += 25;
    if (/[a-z]/.test(p)) s += 25;
    if (/[A-Z]/.test(p)) s += 25;
    if (/[0-9]/.test(p)) s += 25;
    setStrength(s);
  }

  function strengthColor() {
    if (strength === 100) return "bg-green-500";
    if (strength >= 75) return "bg-yellow-500";
    if (strength >= 50) return "bg-orange-500";
    return "bg-red-500";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError("");

    if (f.password !== f.confirm_password) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await authAPI.signup(f);
      const { token, user } = res.data.data;

      localStorage.setItem("access_token", token);
      // localStorage.setItem("refresh_token", refresh);
      dispatch(setCredentials({ user, token }));

      router.push("/dashboard");

    } catch (err: any) {
      setError(err.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }


  return (

    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">

      {/* -------- SIGN UP CARD ---------- */}
      <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 shadow-sm p-10 space-y-8">

        {/* Logo */}
        <div className="flex items-center gap-3 justify-center">
          <TrendingUp size={36} className="text-black" />
          <h1 className="text-3xl font-bold text-gray-900">PaperTrade</h1>
        </div>

        <div>
          <h2 className="text-3xl font-semibold text-gray-900">Create Account</h2>
          <p className="text-gray-500 mt-1">Start with a free virtual ₹1,00,000</p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}


        {/* ------- FORM ------- */}
        <form onSubmit={submit} className="space-y-6">

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Full Name</label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                required
                value={f.full_name}
                onChange={(e) => setF({ ...f, full_name: e.target.value })}
                placeholder="John Doe"
                className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                value={f.email}
                onChange={(e) => setF({ ...f, email: e.target.value })}
                placeholder="you@email.com"
                className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                value={f.password}
                onChange={(e) => setF({ ...f, password: e.target.value })}
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none"
              />
            </div>

            {f.password && (
              <>
                <div className="flex gap-1 h-1 mt-2">
                  {[25, 50, 75, 100].map(l => (
                    <div key={l}
                      className={`flex-1 rounded-full transition-all ${strength >= l ? strengthColor() : "bg-gray-300"}`}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {strength === 100 ? "Strong" : strength >= 50 ? "Medium" : "Weak"} password
                </p>
              </>
            )}

          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Confirm Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                value={f.confirm_password}
                onChange={(e) => setF({ ...f, confirm_password: e.target.value })}
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none"
              />
            </div>
          </div>


          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black hover:bg-gray-900 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Account"}
            <ArrowRight size={18} />
          </button>

        </form>

        <div className="text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-black hover:underline">Sign In</Link>
        </div>

      </div>

    </div>
  );
}
