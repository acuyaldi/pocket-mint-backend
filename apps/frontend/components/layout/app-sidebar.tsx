"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  CalendarClock,
  Settings,
  HelpCircle,
  Plus,
} from "lucide-react";
import { PocketMintLogo } from "../Logo";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Wallets", href: "/wallets", icon: Wallet },
  { label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { label: "Installments", href: "/cicilan", icon: CalendarClock },
];

const UTILITY_NAV_ITEMS = [
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Help", href: "/help", icon: HelpCircle },
];

export function AppSidebar() {
  const pathname = usePathname();

  function handleAddTransaction() {
    window.dispatchEvent(new Event("fab-add-transaction"));
  }

  return (
    <aside
      className="hidden lg:flex flex-col flex-shrink-0 w-[240px] h-screen sticky top-0 overflow-y-auto"
      style={{ borderRight: "1px solid #262626" }}
    >
      {/* Logo + Subtitle */}
      <div
        className="flex flex-col justify-center shrink-0"
        style={{ height: "64px", padding: "12px 20px", borderBottom: "1px solid #1a1a1a" }}
      >
        <PocketMintLogo />
        <p style={{ fontFamily: "var(--font-inter)", fontSize: "11px", color: "#bccabb", marginTop: "2px" }}>
          Financial Clarity
        </p>
      </div>

      {/* Nav Items — flex-1 pushes everything below to the bottom */}
      <nav className="flex-1 py-3 overflow-y-auto space-y-0.5 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg transition-all duration-150"
              style={{
                padding: "10px 12px",
                fontFamily: "var(--font-inter)",
                fontSize: "14px",
                fontWeight: isActive ? "600" : "500",
                color: isActive ? "#4ade80" : "#bccabb",
                backgroundColor: isActive ? "rgba(74, 222, 128, 0.08)" : "transparent",
                borderRight: isActive ? "3px solid #4ade80" : "3px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "rgba(74,222,128,0.04)";
                  e.currentTarget.style.color = "#e5e2e1";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "#bccabb";
                }
              }}
            >
              <Icon className="size-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Add Transaction button */}
      <div className="px-3 pb-3 shrink-0" style={{ borderTop: "1px solid #1a1a1a", paddingTop: "12px" }}>
        <button
          onClick={handleAddTransaction}
          className="flex items-center justify-center gap-2 w-full rounded-full transition-all duration-150 hover:brightness-110 active:scale-95"
          style={{
            padding: "10px 16px",
            backgroundColor: "#4ade80",
            color: "#003919",
            fontFamily: "var(--font-inter)",
            fontSize: "14px",
            fontWeight: "600",
            border: "none",
            cursor: "pointer",
          }}
        >
          <Plus className="size-4 shrink-0" />
          Add Transaction
        </button>
      </div>

      {/* Settings + Help — absolute bottom */}
      <div className="px-2 pb-3 space-y-0.5 shrink-0" style={{ borderTop: "1px solid #1a1a1a", paddingTop: "8px" }}>
        {UTILITY_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg transition-all duration-150"
              style={{
                padding: "9px 12px",
                fontFamily: "var(--font-inter)",
                fontSize: "13px",
                fontWeight: "500",
                color: "#bccabb",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(74,222,128,0.04)";
                e.currentTarget.style.color = "#e5e2e1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#bccabb";
              }}
            >
              <Icon className="size-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
