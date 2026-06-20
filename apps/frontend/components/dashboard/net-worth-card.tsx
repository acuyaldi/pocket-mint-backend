"use client";

import { formatCurrency } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

interface NetWorthHeroProps {
  netWorth: number;
  totalAssets: number;
  totalDebts: number;
  trendPercent?: number;
  isLoading?: boolean;
}

export function NetWorthHero({
  netWorth,
  totalAssets,
  totalDebts,
  trendPercent,
  isLoading,
}: NetWorthHeroProps) {
  return (
    <div
      className="w-full"
      style={{
        paddingTop: "24px",
        paddingLeft: "22px",
        paddingRight: "22px",
        paddingBottom: "20px",
      }}
    >
      {/* Label */}
      <span
        className="block text-[10px] font-medium uppercase tracking-[0.08em]"
        style={{ color: "#71717a" }}
      >
        Net Worth
      </span>

      {/* Amount */}
      {isLoading ? (
        <div className="h-10 w-48 bg-zinc-800 rounded animate-pulse mt-2" />
      ) : (
        <p
          className="text-[40px] font-[500] leading-none mt-2"
          style={{ color: "#4ade80" }}
        >
          {formatCurrency(netWorth)}
        </p>
      )}

      {/* Badge */}
      {trendPercent !== undefined && (
        <div
          className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full"
          style={{
            backgroundColor: "rgba(74, 222, 128, 0.1)",
            color: "#4ade80",
          }}
        >
          <TrendingUp className="size-3" />
          <span className="text-xs font-medium">+{trendPercent.toFixed(1)}% bulan ini</span>
        </div>
      )}

      {/* Meta items row */}
      <div className="flex items-center gap-7 mt-4">
        {/* Total Aset */}
        <div>
          <p
            className="text-[10px] font-medium uppercase tracking-wide"
            style={{ color: "#71717a" }}
          >
            Total Aset
          </p>
          <p className="text-[13px] font-[500]" style={{ color: "#e4e4e7" }}>
            {formatCurrency(totalAssets)}
          </p>
        </div>

        {/* Total Utang */}
        <div>
          <p
            className="text-[10px] font-medium uppercase tracking-wide"
            style={{ color: "#71717a" }}
          >
            Total Utang
          </p>
          <p className="text-[13px] font-[500]" style={{ color: "#f87171" }}>
            {formatCurrency(totalDebts)}
          </p>
        </div>

        {/* Net Savings */}
        <div>
          <p
            className="text-[10px] font-medium uppercase tracking-wide"
            style={{ color: "#71717a" }}
          >
            Net Savings
          </p>
          <p className="text-[13px] font-[500]" style={{ color: "#f87171" }}>
            {formatCurrency(totalAssets - totalDebts)}
          </p>
        </div>
      </div>
    </div>
  );
}
