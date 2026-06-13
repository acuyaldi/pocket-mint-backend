"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number;
  icon: LucideIcon;
  variant: "balance" | "income" | "expense";
}

const variantStyles = {
  balance: {
    iconBg: "bg-indigo-500/10 border border-indigo-500/20",
    iconColor: "text-indigo-400",
    accentBar: "from-indigo-500 to-violet-500",
    badge: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
  },
  income: {
    iconBg: "bg-emerald-500/10 border border-emerald-500/20",
    iconColor: "text-emerald-400",
    accentBar: "from-emerald-500 to-teal-500",
    badge: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  },
  expense: {
    iconBg: "bg-rose-500/10 border border-rose-500/20",
    iconColor: "text-rose-400",
    accentBar: "from-rose-500 to-orange-500",
    badge: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  variant,
}: StatCardProps) {
  const styles = variantStyles[variant];
  const isPositiveTrend = trend !== undefined && trend >= 0;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="h-full"
    >
      <Card className="relative overflow-hidden bg-zinc-900/50 backdrop-blur-md border border-zinc-800 shadow-sm hover:border-emerald-500/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] transition-all duration-300 group h-full">
        {/* Gradient accent bar on top */}
        <div
          className={cn(
            "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r",
            styles.accentBar
          )}
        />

        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            {/* Icon */}
            <div
              className={cn(
                "p-3 rounded-xl transition-transform duration-200 group-hover:scale-110",
                styles.iconBg
              )}
            >
              <Icon className={cn("size-5", styles.iconColor)} strokeWidth={2} />
            </div>

            {/* Trend Badge */}
            {trend !== undefined && (
              <div
                className={cn(
                  "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full",
                  styles.badge
                )}
              >
                {isPositiveTrend ? (
                  <TrendingUp className="size-3" />
                ) : (
                  <TrendingDown className="size-3" />
                )}
                {Math.abs(trend)}%
              </div>
            )}
          </div>

          <div className="mt-4 space-y-1">
            <p className="text-sm font-medium text-zinc-400">{title}</p>
            <p
              className="text-2xl font-bold tracking-tight text-zinc-50"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              {value}
            </p>
            {subtitle && <p className="text-xs text-zinc-400">{subtitle}</p>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
