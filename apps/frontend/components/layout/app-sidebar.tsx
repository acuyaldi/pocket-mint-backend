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
  LogOut,
  Loader2,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Wallets", href: "/wallets", icon: Wallet },
  { label: "Cicilan", href: "/cicilan", icon: CalendarClock },
  { label: "Transaksi", href: "/transactions", icon: ArrowLeftRight },
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
        width: "var(--sidebar-width)",
        backgroundColor: "#0F172A",
        borderRight: "1px solid #334155",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5"
        style={{ padding: "12px 16px", borderBottom: "1px solid #334155" }}
      >
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            backgroundColor: "rgba(var(--brand-rgb), 0.1)",
          }}
        >
          <Wallet
            className="size-5 flex-shrink-0"
            style={{ color: "#38BDF8" }}
          />
        </div>
        <span
          className="text-[14px] font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-hanken)", color: "#F8FAFC" }}
        >
          Pocket Mint
        </span>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 transition-all duration-150"
              style={{
                padding: "10px 20px",
                fontFamily: "var(--font-inter)",
                fontSize: "14px",
                fontWeight: "500",
                color: isActive ? "#38BDF8" : "#94A3B8",
                backgroundColor: isActive
                  ? "rgba(56, 189, 248, 0.08)"
                  : "transparent",
                borderRight: isActive
                  ? "2px solid #38BDF8"
                  : "2px solid transparent",
              }}
            >
              <Icon className="size-[18px] flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User info - pinned bottom */}
      <div className="px-4 py-4" style={{ borderTop: "1px solid #334155" }}>
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className="size-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
            style={{
              backgroundColor: "rgba(56, 189, 248, 0.08)",
              color: "#38BDF8",
              fontFamily: "var(--font-hanken)",
            }}
          >
            {initials}
          </div>

          {/* Name + Email */}
          <div className="flex-1 min-w-0">
            <p
              className="text-[12px] font-medium truncate"
              style={{ fontFamily: "var(--font-inter)", color: "#F8FAFC" }}
            >
              {userName}
            </p>
            <p
              className="text-[11px] truncate"
              style={{ fontFamily: "var(--font-inter)", color: "#94A3B8" }}
            >
              {userEmail}
            </p>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-muted-foreground hover:text-destructive transition-colors duration-150 disabled:opacity-50 flex-shrink-0"
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
