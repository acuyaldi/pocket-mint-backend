"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, PiggyBank } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface MonthlyPnLCardProps {
  income: number;
  expenses: number;
  isLoading?: boolean;
}

export function MonthlyPnLCard({ income, expenses, isLoading }: MonthlyPnLCardProps) {
  // Net Savings = Income - Expenses (atomic, no double-counting)
  const netSavings = income - expenses;
  const isPositive = netSavings >= 0;

  return (
    <Card className="border border-[#1a1a1a] bg-[#0a0a0a] hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/[0.02] transition-all duration-300">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Monthly P&L
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-zinc-900 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Income */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10">
                  <TrendingUp className="size-3.5 text-emerald-400" />
                </div>
                <span className="text-xs text-zinc-400">Income</span>
              </div>
              <span className="text-sm font-semibold text-zinc-50 tabular-nums">
                {formatCurrency(income)}
              </span>
            </div>

            {/* Expenses */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-500/10">
                  <TrendingDown className="size-3.5 text-red-400/70" />
                </div>
                <span className="text-xs text-zinc-400">Expenses</span>
              </div>
              <span className="text-sm font-semibold text-red-400/70 tabular-nums">
                {formatCurrency(expenses)}
              </span>
            </div>

            {/* Divider */}
            <div className="h-px bg-zinc-800" />

            {/* Net Savings */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${isPositive ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                  <PiggyBank className={`size-3.5 ${isPositive ? "text-emerald-400" : "text-red-400"}`} />
                </div>
                <span className="text-xs text-zinc-400">Net Savings</span>
              </div>
              <span className={`text-sm font-bold tabular-nums ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                {isPositive ? "+" : ""}{formatCurrency(netSavings)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
