"use client";

import { useMemo } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Sparkline } from "./Sparkline.tsx";
import { StatCard } from "./StatCard.tsx";
import { formatCurrency } from "@/lib/utils";

interface HeroCardProps {
  total: number;
  trendData: number[];
  activeCount: number;
  totalRemaining: number;
  nearestDue: Date | null;
  status: { text: string; color: string };
}

export function HeroCard({
  total,
  trendData,
  activeCount,
  totalRemaining,
  nearestDue,
  status,
}: HeroCardProps) {
  const trend = useMemo(() => {
    if (trendData.length < 2) return null;
    const first = trendData[0];
    const last = trendData[trendData.length - 1];
    const diff = first - last;
    const pct = first === 0 ? 0 : Math.round((diff / first) * 100);
    return { isLower: diff > 0, pct: Math.abs(pct) };
  }, [trendData]);

  return (
    <div
      className="rounded-lg p-6"
      style={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p
            className="mb-2 text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-mono)" }}
          >
            Total Monthly Payments
          </p>
          <p
            className="text-[32px] font-bold leading-none tracking-tight"
            style={{ color: "var(--color-foreground)", fontFamily: "var(--font-heading)" }}
          >
            {formatCurrency(total)}
          </p>
          {trend && (
            <div
              className="mt-2 inline-flex max-w-full items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium"
              style={{
                backgroundColor: trend.isLower ? "rgba(0,109,54,0.08)" : "rgba(186,26,26,0.08)",
                border: `1px solid ${trend.isLower ? "rgba(0,109,54,0.25)" : "rgba(186,26,26,0.25)"}`,
                color: trend.isLower ? "var(--color-primary)" : "var(--color-destructive)",
              }}
            >
              {trend.isLower ? <TrendingDown className="size-3" /> : <TrendingUp className="size-3" />}
              <span className="break-words">
                {trend.pct}% {trend.isLower ? "lower" : "higher"} than last month
              </span>
            </div>
          )}
        </div>
        <div className="h-12 w-full sm:w-44 sm:shrink-0">
          <Sparkline data={trendData} />
        </div>
      </div>

      <div
        className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 pt-4 sm:grid-cols-4"
        style={{ borderTop: "1px solid rgba(188,202,187,0.5)" }}
      >
        <StatCard label="Active Installments" value={String(activeCount)} color="var(--color-primary)" />
        <StatCard label="Remaining Debt" value={formatCurrency(totalRemaining)} color="var(--color-foreground)" />
        <StatCard
          label="Next Due Date"
          value={
            nearestDue
              ? nearestDue.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
              : "-"
          }
          color="var(--color-foreground)"
        />
        <StatCard label="Status" value={status.text} color={status.color} />
      </div>
    </div>
  );
}
