"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, TrendingUp, Zap, BarChart3, PieChart, Wallet,
  Bell, User, LogOut
} from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Stocks", href: "/stocks", icon: TrendingUp },
  { name: "Market Analysis", href: "/market-analysis", icon: BarChart3 },
  { name: "Stock History", href: "/stock-history", icon: BarChart3 }, // Reusing icon for now or change
  { name: "Options", href: "/options", icon: Zap },
  { name: "Backtest", href: "/backtest", icon: BarChart3 },
  { name: "Strategy", href: "/strategy", icon: PieChart },
  { name: "Wallet", href: "/wallet", icon: Wallet },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Profile", href: "/profile", icon: User },
];

export default function Sidebar() {
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.location.href = "/login";
  };

  return (
    <aside className="sticky top-0 left-0 h-screen w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">

      {/* Brand */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <h1 className="text-lg font-semibold tracking-normal text-gray-800">PaperTrade</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-5 space-y-1">
        {navItems.map(({ name, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={name}
              href={href}
              className={`flex items-center gap-3 px-6 py-4 rounded-lg text-sm transition-all
                ${active
                  ? "bg-gray-900 text-white font-medium shadow-sm"
                  : "text-gray-700 hover:bg-gray-100"
                }`}
            >
              <Icon size={17} className={`${active ? "text-white" : "text-gray-600"}`} />
              <span>{name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg w-full text-sm text-red-600 hover:bg-red-50 transition"
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </aside>
  );
}
