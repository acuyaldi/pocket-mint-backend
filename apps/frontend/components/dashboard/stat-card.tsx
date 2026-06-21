"use client";

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
    iconBg: "rgba(56, 189, 248, 0.1)",
    iconColor: "#38BDF8",
    accentBar: "linear-gradient(90deg, #38BDF8, #0ea5e9)",
    badge: { bg: "rgba(56, 189, 248, 0.15)", border: "1px solid #38BDF8", color: "#38BDF8" },
  },
  income: {
    iconBg: "rgba(16, 185, 129, 0.1)",
    iconColor: "#10B981",
    accentBar: "linear-gradient(90deg, #10B981, #059669)",
    badge: { bg: "rgba(16, 185, 129, 0.15)", border: "1px solid #10B981", color: "#10B981" },
  },
  expense: {
    iconBg: "rgba(239, 68, 68, 0.1)",
    iconColor: "#EF4444",
    accentBar: "linear-gradient(90deg, #EF4444, #dc2626)",
    badge: { bg: "rgba(239, 68, 68, 0.15)", border: "1px solid #EF4444", color: "#EF4444" },
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
      <div
        style={{
          backgroundColor: "#1E293B",
          border: "1px solid #334155",
          borderRadius: "8px",
          padding: "16px",
          position: "relative",
          overflow: "hidden",
        }}
        className="group h-full transition-all duration-300 hover:border-[#38BDF8]"
      >
        {/* Gradient accent bar on top */}
        <div
          className="absolute top-0 left-0 right-0"
          style={{ height: "4px", background: styles.accentBar }}
        />

        <div className="flex items-start justify-between" style={{ marginTop: "4px" }}>
          {/* Icon */}
          <div
            className="flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              backgroundColor: styles.iconBg,
            }}
          >
            <Icon className="size-5" style={{ color: styles.iconColor }} strokeWidth={2} />
          </div>

          {/* Trend Badge */}
          {trend !== undefined && (
            <div
              className="flex items-center gap-1"
              style={{
                borderRadius: "9999px",
                padding: "3px 10px",
                backgroundColor: styles.badge.bg,
                border: styles.badge.border,
                fontFamily: "var(--font-inter)",
                fontSize: "11px",
                fontWeight: 600,
                color: styles.badge.color,
              }}
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

        <div style={{ marginTop: "16px" }}>
          <p style={{ fontFamily: "var(--font-inter)", fontSize: "12px", fontWeight: 500, color: "#94A3B8" }}>{title}</p>
          <p
            style={{
              fontFamily: "var(--font-hanken)",
              fontSize: "20px",
              fontWeight: 600,
              color: "#F8FAFC",
              marginTop: "4px",
            }}
          >
            {value}
          </p>
          {subtitle && <p style={{ fontFamily: "var(--font-inter)", fontSize: "12px", color: "#94A3B8", marginTop: "4px" }}>{subtitle}</p>}
        </div>
      </div>
    </motion.div>
  );
}
