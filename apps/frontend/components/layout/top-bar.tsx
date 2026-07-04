"use client";

import { Bell, Search, User } from "lucide-react";

export function TopBar() {
  return (
    <header className="flex items-center gap-4 w-full mb-6 border-b border-[#1a1a1a] pb-4">
      {/* Search bar */}
      <div className="flex-1 relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 size-4 pointer-events-none"
          style={{ color: "#bccabb" }}
        />
        <input
          type="text"
          placeholder="Search transactions, wallets..."
          className="w-full h-10 pl-9 pr-4 rounded-full text-sm outline-none"
          style={{
            backgroundColor: "#1c1b1b",
            border: "1px solid #262626",
            color: "#e5e2e1",
            fontFamily: "var(--font-inter)",
          }}
        />
      </div>

      {/* Right: Bell + User */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          className="relative flex items-center justify-center rounded-lg"
          style={{ width: "36px", height: "36px" }}
          aria-label="Notifikasi"
        >
          <Bell className="size-5" style={{ color: "#bccabb" }} />
          <span
            className="absolute top-0.5 right-0.5 size-4 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{ backgroundColor: "#4ade80", color: "#003919", fontFamily: "var(--font-mono)" }}
          >
            3
          </span>
        </button>

        <button
          className="flex items-center justify-center rounded-full size-[36px]"
          style={{
            backgroundColor: "rgba(74,222,128,0.12)",
            border: "1px solid rgba(74,222,128,0.2)",
            color: "#4ade80",
          }}
          aria-label="User profile"
        >
          <User className="size-4" />
        </button>
      </div>
    </header>
  );
}
