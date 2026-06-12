import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number; // percentage, positive = up
  icon: LucideIcon;
  variant: "balance" | "income" | "expense";
}

const variantStyles = {
  balance: {
    iconBg: "bg-[var(--balance-muted)]",
    iconColor: "text-[var(--balance)]",
    accentBar: "from-[var(--balance)] to-indigo-400",
    badge: "bg-[var(--balance-muted)] text-[var(--balance)]",
  },
  income: {
    iconBg: "bg-[var(--income-muted)]",
    iconColor: "text-[var(--income)]",
    accentBar: "from-[var(--income)] to-emerald-400",
    badge: "bg-[var(--income-muted)] text-[var(--income)]",
  },
  expense: {
    iconBg: "bg-[var(--expense-muted)]",
    iconColor: "text-[var(--expense)]",
    accentBar: "from-[var(--expense)] to-orange-400",
    badge: "bg-[var(--expense-muted)] text-[var(--expense)]",
  },
};

export function StatCard({ title, value, subtitle, trend, icon: Icon, variant }: StatCardProps) {
  const styles = variantStyles[variant];
  const isPositiveTrend = trend !== undefined && trend >= 0;

  return (
    <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow duration-300 group">
      {/* Gradient accent bar on top */}
      <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", styles.accentBar)} />

      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          {/* Icon */}
          <div className={cn("p-3 rounded-xl transition-transform duration-200 group-hover:scale-110", styles.iconBg)}>
            <Icon className={cn("size-5", styles.iconColor)} strokeWidth={2} />
          </div>

          {/* Trend Badge */}
          {trend !== undefined && (
            <div className={cn("flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full", styles.badge)}>
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
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
