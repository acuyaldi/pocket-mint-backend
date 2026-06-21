"use client";

import { formatCurrency } from "@/lib/utils";

interface MonthlyPnLCardProps {
  income: number;
  expenses: number;
  isLoading?: boolean;
}

export function MonthlyPnLCard({ income, expenses, isLoading }: MonthlyPnLCardProps) {
  // Net Savings = Income - Expenses (atomic, no double-counting)
  const netSavings = income - expenses;

  return (
    <div
      style={{
        backgroundColor: "#1E293B",
        border: "1px solid #334155",
        borderRadius: "8px",
        padding: "16px",
      }}
    >
      {/* Title */}
      <span
        className="uppercase font-semibold"
        style={{
          fontFamily: "var(--font-inter)",
          fontSize: "11px",
          fontWeight: 600,
          color: "#64748B",
          letterSpacing: "0.05em",
        }}
      >
        Monthly P&L
      </span>

      {isLoading ? (
        <div className="space-y-2 mt-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 rounded animate-pulse" style={{ backgroundColor: "#334155" }} />
          ))}
        </div>
      ) : (
        <div style={{ marginTop: "12px" }}>
          {/* Income row */}
          <div className="flex items-center justify-between" style={{ padding: "8px 0" }}>
            <div className="flex items-center gap-2">
              <div style={{ width: "5px", height: "5px", borderRadius: "9999px", backgroundColor: "#10B981" }} />
              <span style={{ fontFamily: "var(--font-inter)", fontSize: "12px", color: "#94A3B8" }}>Pemasukan</span>
            </div>
            <span style={{ fontFamily: "var(--font-inter)", fontSize: "12px", fontWeight: 600, color: "#10B981" }}>
              {formatCurrency(income)}
            </span>
          </div>
          
          <div style={{ height: "1px", backgroundColor: "#334155" }} />

          {/* Expenses row */}
          <div className="flex items-center justify-between" style={{ padding: "8px 0" }}>
            <div className="flex items-center gap-2">
              <div style={{ width: "5px", height: "5px", borderRadius: "9999px", backgroundColor: "#EF4444" }} />
              <span style={{ fontFamily: "var(--font-inter)", fontSize: "12px", color: "#94A3B8" }}>Pengeluaran</span>
            </div>
            <span style={{ fontFamily: "var(--font-inter)", fontSize: "12px", fontWeight: 600, color: "#EF4444" }}>
              {formatCurrency(expenses)}
            </span>
          </div>
          
          <div style={{ height: "1px", backgroundColor: "#334155" }} />

          {/* Net Savings row */}
          <div className="flex items-center justify-between" style={{ padding: "8px 0" }}>
            <div className="flex items-center gap-2">
              <div style={{ width: "5px", height: "5px", borderRadius: "9999px", backgroundColor: netSavings >= 0 ? "#10B981" : "#EF4444" }} />
              <span style={{ fontFamily: "var(--font-inter)", fontSize: "12px", color: "#94A3B8" }}>Net Savings</span>
            </div>
            <span style={{ fontFamily: "var(--font-inter)", fontSize: "12px", fontWeight: 600, color: netSavings >= 0 ? "#F8FAFC" : "#EF4444" }}>
              {formatCurrency(netSavings)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
