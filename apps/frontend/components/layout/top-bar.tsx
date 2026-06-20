"use client";

import { usePathname } from "next/navigation";
import { Bell, Plus } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/transactions": "Transaksi",
  "/wallets": "Wallets",
  "/cicilan": "Cicilan",
  "/laporan": "Laporan",
};

interface TopBarProps {
  userName?: string;
  userEmail?: string;
}

export function TopBar({
  userName = "User",
  userEmail = "user@pocketmint.com",
}: TopBarProps) {
  const pathname = usePathname();

  // Find the title by matching the current path
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
      className="flex items-center justify-between"
      style={{
        padding: "14px 22px",
        borderBottom: "0.5px solid #262626",
        backgroundColor: "#131313",
      }}
    >
      {/* Left: Page Title + subtitle */}
      <div>
        <h2
          className="text-[15px] font-[500]"
          style={{ color: "#e4e4e7", fontFamily: "var(--font-hanken)" }}
        >
          {title}
        </h2>
        <p className="text-[11px]" style={{ color: "#71717a", fontFamily: "var(--font-inter)" }}>
          Welcome back! Here&apos;s your financial summary.
        </p>
      </div>

      {/* Right: Export button + bell icon + FAB */}
      <div className="flex items-center gap-3">
        {/* Bell icon */}
        <button
          className="relative flex items-center justify-center"
          style={{ width: "32px", height: "32px" }}
          aria-label="Notifikasi"
        >
          <Bell className="size-5" style={{ color: "#71717a" }} />
          {/* Badge */}
          <span
            className="absolute top-0 right-0 size-4 rounded-full flex items-center justify-center text-[10px] font-medium"
            style={{
              backgroundColor: "#4ade80",
              color: "#003919",
              fontFamily: "var(--font-jetbrains)",
            }}
          >
            3
          </span>
        </button>

        {/* FAB (+) button */}
        <button
          className="flex items-center justify-center rounded-full"
          style={{
            width: "32px",
            height: "32px",
            backgroundColor: "#4ade80",
          }}
          aria-label="Add Transaction"
        >
          <Plus className="size-5" style={{ color: "#003919" }} strokeWidth={2.5} />
        </button>
      </div>
    </header>
  );
}
