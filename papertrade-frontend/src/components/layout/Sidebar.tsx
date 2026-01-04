import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home, TrendingUp, Zap, BarChart3, PieChart, Wallet,
  Bell, User, BookOpen, Crown, LogOut
} from "lucide-react";
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '@/store/slices/authSlice';

interface SidebarProps {
  isMobileOpen: boolean;
  isCollapsed: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export default function Sidebar({ isMobileOpen, isCollapsed, setIsMobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state: any) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    router.push('/login');
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Stocks", href: "/stocks", icon: TrendingUp },
    { name: "My Watchlist", href: "/watchlist", icon: BookOpen },
    { name: "History", href: "/stock-history", icon: BookOpen },
    { name: "Options", href: "/options", icon: Zap },
    { name: "Analysis", href: "/market-analysis", icon: BarChart3 },
    { name: "Backtest", href: "/backtest", icon: BarChart3 },
    { name: "Wallet", href: "/wallet", icon: Wallet },
    { name: "Notifications", href: "/notifications", icon: Bell },
    { name: "Profile", href: "/profile", icon: User },
  ];

  if (user?.role === 'admin' || user?.role === 'superadmin') {
    // Admin link could be added here if needed, or handled via separate admin panel redirection
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-16 left-0 h-[calc(100vh-4rem)] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-40 transition-all duration-300 ease-in-out flex flex-col
          ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
`}
      >
        <div className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-gray-200">
          <nav className="px-3 space-y-1">
            {navItems.map(({ name, href, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(`${href}/`);

              return (
                <Link
                  key={name}
                  href={href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative
                    ${isActive
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
                    }
                    ${isCollapsed ? "justify-center" : ""}
                  `}
                  title={isCollapsed ? name : undefined}
                >
                  <Icon
                    size={20}
                    className={`shrink-0 transition-colors ${isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300"}`}
                  />

                  {!isCollapsed && (
                    <span className="truncate">{name}</span>
                  )}

                  {/* Active Indicator Strip */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-blue-600 rounded-r-full" />
                  )}
                </Link>
              );
            })}
          </nav >
        </div >

        {/* Subscription / Upgrade Promo (Optional - hide on collapse) */}
        {
          !isCollapsed && (
            <div className="flex-none p-4 w-full border-t border-gray-100">
              {/* Promo Card */}
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                    <Crown size={16} className="text-amber-500" fill="currentColor" />
                  </div>
                  <span className="font-semibold text-xs text-indigo-900 dark:text-indigo-200 border-b-2 border-indigo-200 dark:border-indigo-700">PRO PLAN</span>
                </div>
                <p className="text-xs text-indigo-700 dark:text-indigo-300 mb-3">Unlock advanced strategies & unlimited backtests.</p>
                <button
                  onClick={() => router.push('/subscription')}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                >
                  Upgrade Now
                </button>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg w-full text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
              >
                <LogOut size={18} />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          )
        }
      </aside >
    </>
  );
}
