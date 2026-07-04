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

export function HeroCard({ total, trendData, activeCount, totalRemaining, nearestDue, status }: HeroCardProps) {
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
      style={{ backgroundColor: "#0e0e0e", border: "1px solid #262626" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className="mb-2 text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "#bccabb", fontFamily: "var(--font-mono)" }}
          >
            Total Beban Cicilan / Bulan
          </p>
          <p
            className="text-[32px] font-bold leading-none tracking-tight"
            style={{ color: "#e5e2e1", fontFamily: "var(--font-heading)" }}
          >
            {formatCurrency(total)}
          </p>
          {trend && (
            <div
              className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium"
              style={{
                backgroundColor: trend.isLower ? "rgba(74,222,128,0.12)" : "rgba(255,180,171,0.12)",
                border: `1px solid ${trend.isLower ? "rgba(74,222,128,0.25)" : "rgba(255,180,171,0.25)"}`,
                color: trend.isLower ? "#4ade80" : "#ffb4ab",
              }}
            >
              {trend.isLower ? <TrendingDown className="size-3" /> : <TrendingUp className="size-3" />}
              <span>{trend.pct}% {trend.isLower ? "lebih rendah" : "lebih tinggi"} dari bulan lalu</span>
            </div>
          )}
        </div>
        <div className="w-44 h-12 shrink-0">
          <Sparkline data={trendData} />
        </div>
      </div>

      <div className="mt-5 flex pt-4" style={{ borderTop: "1px solid #1a1a1a" }}>
        <StatCard label="Cicilan Aktif" value={String(activeCount)} color="#4ade80" />
        <StatCard label="Total Sisa Hutang" value={formatCurrency(totalRemaining)} color="#e5e2e1" />
        <StatCard
          label="Jatuh Tempo Terdekat"
          value={nearestDue
            ? nearestDue.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
            : "—"}
          color="#e5e2e1"
        />
        <StatCard label="Status" value={status.text} color={status.color} />
      </div>
    </div>
  );
}
