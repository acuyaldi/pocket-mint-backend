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
      className="hidden lg:flex flex-col fixed left-0 top-0 h-full"
      style={{
        width: "172px",
        backgroundColor: "#0e0e0e",
        borderRight: "0.5px solid #262626",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5"
        style={{ padding: "9px 18px", borderBottom: "0.5px solid #262626" }}
      >
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: "26px",
            height: "26px",
            borderRadius: "6px",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
          }}
        >
          <Wallet className="size-5 text-mint flex-shrink-0" style={{ color: "#4ade80" }} />
        </div>
        <span
          className="text-[14px] font-[500]"
          style={{ fontFamily: "var(--font-hanken)", color: "#e4e4e7" }}
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
              className="flex items-center gap-3 rounded-[6px] text-sm transition-colors duration-150 ease-out"
              style={{
                padding: "9px 18px",
                fontFamily: "var(--font-inter)",
                color: isActive ? "#4ade80" : "#71717a",
                backgroundColor: isActive ? "rgba(74, 222, 128, 0.08)" : "transparent",
                borderRight: isActive ? "2px solid #4ade80" : "2px solid transparent",
              }}
            >
              <Icon className="size-[15px] flex-shrink-0" />
              <span className="text-[13px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User info - pinned bottom */}
      <div
        className="border-t border-divider px-5 py-4"
        style={{ borderTop: "0.5px solid #262626" }}
      >
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
              className="text-[12px] font-[500] truncate"
              style={{ fontFamily: "var(--font-inter)", color: "#e4e4e7" }}
            >
              {userName}
            </p>
            <p
              className="text-[11px] truncate"
              style={{ fontFamily: "var(--font-inter)", color: "#71717a" }}
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
            style={{ color: "#71717a" }}
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
