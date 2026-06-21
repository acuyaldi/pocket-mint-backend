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
        backgroundColor: "#1E293B",
        border: "1px solid #334155",
        borderRadius: "8px",
        padding: "16px",
      }}
    >
      {/* Label */}
      <span
        className="block uppercase font-semibold"
        style={{
          fontFamily: "var(--font-inter)",
          fontSize: "11px",
          fontWeight: 600,
          color: "#64748B",
          letterSpacing: "0.05em",
        }}
      >
        Net Worth
      </span>

      {/* Amount */}
      {isLoading ? (
        <div className="h-10 w-48 rounded animate-pulse mt-2" style={{ backgroundColor: "#334155" }} />
      ) : (
        <p
          style={{
            fontFamily: "var(--font-hanken)",
            fontSize: "40px",
            fontWeight: 600,
            color: "#38BDF8",
            lineHeight: 1.1,
            marginTop: "8px",
          }}
        >
          {formatCurrency(netWorth)}
        </p>
      )}

      {/* Badge */}
      {trendPercent !== undefined && (
        <div
          className="inline-flex items-center gap-1"
          style={{
            marginTop: "12px",
            borderRadius: "9999px",
            padding: "3px 10px",
            backgroundColor: trendPercent >= 0 ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
            border: trendPercent >= 0 ? "1px solid #10B981" : "1px solid #EF4444",
            fontFamily: "var(--font-inter)",
            fontSize: "11px",
            fontWeight: 600,
            color: trendPercent >= 0 ? "#10B981" : "#EF4444",
          }}
        >
          <TrendingUp className="size-3" />
          <span>{trendPercent >= 0 ? "+" : ""}{trendPercent.toFixed(1)}% bulan ini</span>
        </div>
      )}

      {/* Meta items row */}
      <div className="flex items-center gap-7" style={{ marginTop: "16px" }}>
        {/* Total Aset */}
        <div>
          <p
            className="uppercase font-semibold"
            style={{
              fontFamily: "var(--font-inter)",
              fontSize: "11px",
              fontWeight: 600,
              color: "#64748B",
              letterSpacing: "0.05em",
            }}
          >
            Total Aset
          </p>
          <p style={{ fontFamily: "var(--font-inter)", fontSize: "14px", fontWeight: 500, color: "#F8FAFC", marginTop: "4px" }}>
            {formatCurrency(totalAssets)}
          </p>
        </div>

        {/* Total Utang */}
        <div>
          <p
            className="uppercase font-semibold"
            style={{
              fontFamily: "var(--font-inter)",
              fontSize: "11px",
              fontWeight: 600,
              color: "#64748B",
              letterSpacing: "0.05em",
            }}
          >
            Total Utang
          </p>
          <p style={{ fontFamily: "var(--font-inter)", fontSize: "14px", fontWeight: 500, color: "#EF4444", marginTop: "4px" }}>
            {formatCurrency(totalDebts)}
          </p>
        </div>

        {/* Net Savings */}
        <div>
          <p
            className="uppercase font-semibold"
            style={{
              fontFamily: "var(--font-inter)",
              fontSize: "11px",
              fontWeight: 600,
              color: "#64748B",
              letterSpacing: "0.05em",
            }}
          >
            Net Savings
          </p>
          <p style={{ fontFamily: "var(--font-inter)", fontSize: "14px", fontWeight: 500, color: (totalAssets - totalDebts) >= 0 ? "#F8FAFC" : "#EF4444", marginTop: "4px" }}>
            {formatCurrency(totalAssets - totalDebts)}
          </p>
        </div>
      </div>
    </div>
  );
}
