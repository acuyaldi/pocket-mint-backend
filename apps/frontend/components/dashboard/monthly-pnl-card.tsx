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
        backgroundColor: "#131313",
        border: "0.5px solid #262626",
        borderRadius: "10px",
        padding: "14px 16px",
      }}
    >
      {/* Title */}
      <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "#71717a" }}>
        Monthly P&L
      </span>

      {isLoading ? (
        <div className="space-y-2 mt-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-zinc-900 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="mt-3">
          {/* Income row */}
          <div>
            <div className="flex items-center gap-2" style={{ padding: "8px 0" }}>
              <div className="size-[5px] rounded-full" style={{ backgroundColor: "#4ade80" }} />
              <span className="text-[12px]" style={{ color: "#71717a" }}>Pemasukan</span>
              <span className="text-[12px] font-[500] ml-auto" style={{ color: "#4ade80" }}>
                {formatCurrency(income)}
              </span>
            </div>
          </div>
          
          <div className="h-px" style={{ backgroundColor: "#262626" }} />

          {/* Expenses row */}
          <div>
            <div className="flex items-center gap-2" style={{ padding: "8px 0" }}>
              <div className="size-[5px] rounded-full" style={{ backgroundColor: "#f87171" }} />
              <span className="text-[12px]" style={{ color: "#71717a" }}>Pengeluaran</span>
              <span className="text-[12px] font-[500] ml-auto" style={{ color: "#f87171" }}>
                {formatCurrency(expenses)}
              </span>
            </div>
          </div>
          
          <div className="h-px" style={{ backgroundColor: "#262626" }} />

          {/* Net Savings row */}
          <div>
            <div className="flex items-center gap-2" style={{ padding: "8px 0" }}>
              <div className="size-[5px] rounded-full" style={{ backgroundColor: "#f87171" }} />
              <span className="text-[12px]" style={{ color: "#71717a" }}>Net Savings</span>
              <span className="text-[12px] font-[500] ml-auto" style={{ color: "#f87171" }}>
                {formatCurrency(netSavings)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
