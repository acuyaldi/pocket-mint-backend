"use client";

import { usePathname } from "next/navigation";
import { Bell, Plus } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/transactions": "Transaksi",
  "/wallets": "Wallets",
  "/cicilan": "Cicilan",
  
};

interface TopBarProps {
  userName?: string;
  userEmail?: string;
  onAddTransaction?: () => void;
}

export function TopBar({
  userName = "User",
  userEmail = "user@pocketmint.com",
  onAddTransaction,
}: TopBarProps) {
  const pathname = usePathname();

  const title =
    Object.entries(PAGE_TITLES).find(
      ([href]) => pathname === href || pathname.startsWith(href + "/")
    )?.[1] ?? "Pocket Mint";

  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header
      className="flex items-center justify-between sticky top-0 z-40"
      style={{ padding: "20px", borderBottom: "1px solid #334155", backgroundColor: "#0F172A" }}
    >
      {/* Left: Page Title + subtitle */}
      <div>
        <h2
          className="text-[15px] font-semibold tracking-tight"
          style={{ color: "#F8FAFC", fontFamily: "var(--font-hanken)" }}
        >
          {title}
        </h2>
        <p className="text-[11px]" style={{ color: "#94A3B8", fontFamily: "var(--font-inter)" }}>
          Welcome back! Here&rsquo;s your financial summary.
        </p>
      </div>

      {/* Right: Export button + bell icon + FAB */}
      <div className="flex items-center gap-3">
        {/* Bell icon */}
        <button
          className="relative flex items-center justify-center rounded-lg transition-colors"
          style={{ width: "32px", height: "32px" }}
          aria-label="Notifikasi"
        >
          <Bell className="size-5" style={{ color: "#64748B" }} />
          {/* Badge */}
          <span
            className="absolute top-0.5 right-0.5 size-4 rounded-full flex items-center justify-center text-[10px] font-bold"
          style={{
            backgroundColor: "#38BDF8",
            color: "#0F172A",
            fontFamily: "var(--font-jetbrains)",
          }}
          >
            3
          </span>
        </button>

       
      </div>
    </header>
  );
}