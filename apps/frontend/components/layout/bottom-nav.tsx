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
  { label: "Transaksi", href: "/transactions", icon: ArrowLeftRight },
  { label: "Wallets", href: "/wallets", icon: Wallet },
  { label: "Cicilan", href: "/cicilan", icon: CalendarClock },
  { label: "Laporan", href: "/laporan", icon: BarChart2 },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 h-[60px] border-t border-divider z-20 flex items-center justify-around"
      style={{
        backgroundColor: "#0e0e0e",
        paddingBottom: "env(safe-area-inset-bottom)",
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
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors duration-150 ease-out ${
              isActive ? "text-mint" : "text-text-secondary"
            }`}
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
