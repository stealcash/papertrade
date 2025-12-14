'use client';

import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { logout } from '@/store/slices/authSlice';

export default function Header() {
    const router = useRouter();
    const dispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);

    const handleLogout = () => {
        dispatch(logout());
        router.push('/login');
    };

    return (
        <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                            <span className="text-xl font-bold text-white">PT</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">PaperTrade</h1>
                            <div className="flex items-center space-x-2 mt-1">
                                <p className="text-sm text-gray-600">{user?.email}</p>
                                <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded font-medium capitalize">
                                    {user?.role || 'User'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Wallet Balance Placeholder - could be real later */}
                        <div className="bg-gray-100 px-4 py-2 rounded-lg text-sm font-medium text-gray-700">
                            Wallet: ₹{user?.wallet_balance ? parseFloat(user.wallet_balance).toLocaleString('en-IN') : '0.00'}
                        </div>

                        <button
                            onClick={handleLogout}
                            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all font-medium text-sm"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
