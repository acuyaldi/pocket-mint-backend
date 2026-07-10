"use client";

import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { fadeUp } from "./constants";
import { formatCurrency } from "@/lib/utils";

interface TransactionBreakdownChartProps {
  income: number;
  expense: number;
}

// Minimal, permissive shape — avoids Recharts' strict generic Tooltip typing.
interface TooltipDatum {
  name?: string;
  value?: number;
  payload?: { color?: string };
}

function ChartTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: TooltipDatum[];
  total?: number;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const value = item.value ?? 0;
  const pct = total && total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
        <span
          className="inline-block size-2 rounded-full"
          style={{ backgroundColor: item.payload?.color }}
        />
        {item.name}
      </p>
      <p className="mt-0.5 font-mono text-[13px] font-semibold text-foreground">
        {formatCurrency(value)}
      </p>
      <p className="font-mono text-[10px] text-muted-foreground">{pct}% of flow</p>
    </div>
  );
}

export function TransactionBreakdownChart({
  income,
  expense,
}: TransactionBreakdownChartProps) {
  const total = income + expense;
  const net = income - expense;
  const hasData = total > 0;

  const data = [
    { name: "Income", value: income, color: "var(--color-primary)" },
    { name: "Expense", value: expense, color: "var(--color-destructive)" },
  ];

  return (
    <motion.div
      variants={fadeUp}
      className="surface-card flex flex-col rounded-2xl border border-white/80 p-5"
    >
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
        Income vs Expense
      </p>

      <div className="relative mt-2">
        {hasData ? (
          <ResponsiveContainer width="100%" height={168}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={54}
                outerRadius={78}
                paddingAngle={2}
                stroke="none"
                startAngle={90}
                endAngle={-270}
              >
                {data.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip total={total} />} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[168px] items-center justify-center">
            <div className="size-[156px] rounded-full border-[24px] border-muted" />
          </div>
        )}

        {/* Center label — net flow */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Net
          </span>
          <span
            className={`font-mono text-sm font-bold ${
              net >= 0 ? "text-primary" : "text-destructive"
            }`}
          >
            {formatCurrency(net)}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-center gap-5">
        <div className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-primary" />
          <span className="text-[11px] text-muted-foreground">Income</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-destructive" />
          <span className="text-[11px] text-muted-foreground">Expense</span>
        </div>
      </div>
    </motion.div>
  );
}
