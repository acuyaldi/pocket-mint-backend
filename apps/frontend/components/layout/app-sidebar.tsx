"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { useState } from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  CalendarClock,
  BarChart2,
  LogOut,
  Loader2,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Transaksi", href: "/transactions", icon: ArrowLeftRight },
  { label: "Wallets", href: "/wallets", icon: Wallet },
  { label: "Cicilan", href: "/cicilan", icon: CalendarClock },
  { label: "Laporan", href: "/laporan", icon: BarChart2 },
];

interface AppSidebarProps {
  userName?: string;
  userEmail?: string;
}

export function AppSidebar({
  userName = "User",
  userEmail = "user@pocketmint.com",
}: AppSidebarProps) {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
  }

  return (
    <aside
      className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-60 border-r border-divider z-20"
      style={{ backgroundColor: "#0e0e0e" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-6 border-b border-divider">
        <Wallet className="size-5 text-mint flex-shrink-0" />
        <span
          className="text-lg font-semibold text-text-primary"
          style={{ fontFamily: "var(--font-hanken)" }}
        >
          Pocket Mint
        </span>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-[6px] text-sm transition-colors duration-150 ease-out ${
                isActive
                  ? "text-mint border-l-2 border-mint bg-mint/8"
                  : "text-text-secondary hover:bg-surface-high hover:text-text-primary border-l-2 border-transparent"
              }`}
              style={{
                padding: isActive ? "10px 12px 10px 10px" : "10px 12px",
                fontFamily: "var(--font-inter)",
              }}
            >
              <Icon className="size-[18px] flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info - pinned bottom */}
      <div className="border-t border-divider px-5 py-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className="size-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold"
            style={{
              backgroundColor: "#1c1b1b",
              color: "#4ade80",
              fontFamily: "var(--font-hanken)",
            }}
          >
            {initials}
          </div>

          {/* Name + Email */}
          <div className="flex-1 min-w-0">
            <p
              className="text-sm text-text-primary truncate"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              {userName}
            </p>
            <p
              className="text-xs text-text-secondary truncate"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              {userEmail}
            </p>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-text-secondary hover:text-error transition-colors duration-150 ease-out disabled:opacity-50 flex-shrink-0"
            title="Keluar"
          >
            {loggingOut ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
