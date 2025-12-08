'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { logout } from '@/store/slices/authSlice';
import Button from '@/components/ui/Button';
import { LogOut, User, Wallet } from 'lucide-react';

export default function Header() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    router.push('/login');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-[#0F1419] border-b border-[#1F2937] h-16">
      <div className="h-full px-6 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-white">
          PaperTrade
        </Link>

        {!isAuthenticated ? (
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => router.push('/login')}
              className="text-gray-300 hover:text-white hover:bg-[#1F2937]"
            >
              Login
            </Button>
            <Button
              variant="primary"
              onClick={() => router.push('/signup')}
            >
              Sign Up
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-[#1F2937] rounded-lg border border-[#374151]">
              <User className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-sm font-semibold text-white">{user?.email}</p>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Wallet className="w-3 h-3" />
                  <span>₹{parseFloat(user?.wallet_balance || '0').toLocaleString()}</span>
                </div>
              </div>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}

