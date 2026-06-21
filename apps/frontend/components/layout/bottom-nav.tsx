"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  CalendarClock,
  BarChart2,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Wallets", href: "/wallets", icon: Wallet },
  { label: "Cicilan", href: "/cicilan", icon: CalendarClock },
    { label: "Transaksi", href: "/transactions", icon: ArrowLeftRight },

];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 h-[60px] z-20 flex items-center justify-around"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        backgroundColor: "#0F172A",
        borderTop: "1px solid #334155",
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors duration-150"
            style={{
              color: isActive ? "#38BDF8" : "#94A3B8",
              fontWeight: "500",
            }}
          >
            <Icon className="size-5" />
            <span
              className="text-[10px] leading-tight"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
