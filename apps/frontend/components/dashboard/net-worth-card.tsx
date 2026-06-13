"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";

interface NetWorthCardProps {
  netWorth: number;
  totalAssets: number;
  totalDebt: number;
  trendPercent?: number;
  isLoading?: boolean;
}

export function NetWorthCard({
  netWorth,
  totalAssets,
  totalDebt,
  trendPercent,
  isLoading,
}: NetWorthCardProps) {
  const isPositiveTrend = trendPercent !== undefined && trendPercent >= 0;

  return (
    <Card className="border border-[#1a1a1a] bg-[#0a0a0a] hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/[0.02] transition-all duration-300">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Wallet className="size-4 text-emerald-400" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Net Worth
            </span>
          </div>
          {trendPercent !== undefined && (
            <div className="flex items-center gap-1 text-xs font-mono text-emerald-400">
              {isPositiveTrend ? (
                <TrendingUp className="size-3" />
              ) : (
                <TrendingDown className="size-3 text-red-400" />
              )}
              <span>{isPositiveTrend ? "+" : ""}{trendPercent.toFixed(1)}%</span>
              <span className="text-zinc-500 ml-1">vs last month</span>
            </div>
          )}
        </div>

        {/* Main Value */}
        {isLoading ? (
          <div className="h-10 w-48 bg-zinc-800 rounded animate-pulse mb-4" />
        ) : (
          <p className="text-3xl lg:text-4xl font-bold tracking-tight text-zinc-50 tabular-nums mb-1">
            {formatCurrency(netWorth)}
          </p>
        )}

        {/* Assets vs Debt */}
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-zinc-400">Assets</span>
            <span className="text-xs font-semibold text-zinc-200 tabular-nums">
              {formatCurrency(totalAssets)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-red-400" />
            <span className="text-xs text-zinc-400">Debt</span>
            <span className="text-xs font-semibold text-red-400/70 tabular-nums">
              {formatCurrency(totalDebt)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
