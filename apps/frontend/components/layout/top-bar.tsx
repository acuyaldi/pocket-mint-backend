"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

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
      className="sticky top-0 z-10 h-16 border-b border-divider flex items-center justify-between px-6"
      style={{ backgroundColor: "#131313" }}
    >
      {/* Left: Page Title */}
      <h2
        className="text-xl font-medium text-text-primary"
        style={{ fontFamily: "var(--font-hanken)" }}
      >
        {title}
      </h2>

      {/* Right: Notification + Avatar */}
      <div className="flex items-center gap-4">
        {/* Notification bell */}
        <button
          className="relative text-text-secondary hover:text-text-primary transition-colors duration-150 ease-out"
          aria-label="Notifikasi"
        >
          <Bell className="size-5" />
          {/* Badge */}
          <span
            className="absolute -top-1 -right-1 size-4 rounded-full flex items-center justify-center text-[10px] font-medium"
            style={{
              backgroundColor: "#4ade80",
              color: "#003919",
              fontFamily: "var(--font-jetbrains)",
            }}
          >
            3
          </span>
        </button>

        {/* User Avatar */}
        <div
          className="size-8 rounded-full flex items-center justify-center text-sm font-semibold"
          style={{
            backgroundColor: "#1c1b1b",
            color: "#4ade80",
            fontFamily: "var(--font-hanken)",
          }}
          title={`${userName} — ${userEmail}`}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
