'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

export default function AdminHomePage() {
  const router = useRouter();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-3xl mb-8 shadow-2xl">
          <span className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            PT
          </span>
        </div>
        <h1 className="text-5xl font-bold text-white mb-4">
          PaperTrade Admin
        </h1>
        <p className="text-xl text-blue-200 mb-8">
          System Administration Portal
        </p>
        <button
          onClick={() => router.push('/login')}
          className="bg-white text-blue-900 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-50 transition-all shadow-lg"
        >
          Access Admin Portal
        </button>
      </div>
    </div>
  );
}
