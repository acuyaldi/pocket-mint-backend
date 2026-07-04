"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { FullWidthSparkline } from "./FullWidthSparkline";
import { formatCurrency } from "@/lib/utils";

interface WalletSummaryCardProps {
  netWorth: number;
  totalAset: number;
  totalUtang: number;
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

export default function WalletSummaryCard({ netWorth, totalAset, totalUtang }: WalletSummaryCardProps) {
  const prevNetWorth = netWorth * 0.958;
  const growthPct = ((netWorth - prevNetWorth) / Math.abs(prevNetWorth || 1)) * 100;
  const sparklineData = [
    netWorth * 0.88,
    netWorth * 0.90,
    netWorth * 0.87,
    netWorth * 0.92,
    netWorth * 0.95,
    netWorth * 0.958,
    netWorth,
  ];

  return (
    <motion.div
      variants={fadeUp}
      className="relative overflow-hidden"
      style={{
        backgroundColor: "#0e0e0e",
        border: "1px solid #262626",
        borderRadius: "8px",
        padding: "20px",
      }}
    >
      <p
        className="uppercase tracking-widest"
        style={{ fontSize: "11px", fontWeight: 600, color: "#bccabb", fontFamily: "var(--font-mono)" }}
      >
        Net Worth
      </p>

      <p
        className="tracking-tight mt-3"
        style={{ fontSize: "28px", fontWeight: 700, color: "#e5e2e1", fontFamily: "var(--font-heading)" }}
      >
        {formatCurrency(netWorth)}
      </p>

      <div
        className="inline-flex items-center gap-1.5 mt-2"
        style={{
          padding: "3px 10px",
          borderRadius: "9999px",
          backgroundColor: "rgba(74,222,128,0.12)",
          border: "1px solid rgba(74,222,128,0.25)",
        }}
      >
        <ArrowUpRight className="size-3" style={{ color: "#4ade80" }} />
        <span
          className="font-semibold"
          style={{ fontSize: "11px", color: "#4ade80", fontFamily: "var(--font-mono)" }}
        >
          +{growthPct.toFixed(1)}% this month
        </span>
      </div>

      {/* Sparkline top-right */}
      <div className="absolute right-5 top-5">
        <FullWidthSparkline data={sparklineData} color="#4ade80" />
      </div>

      {/* Bottom stats */}
      <div className="flex gap-8 mt-6 pt-4" style={{ borderTop: "1px solid #1a1a1a" }}>
        <div>
          <p
            className="uppercase tracking-wider"
            style={{ fontSize: "11px", color: "#bccabb", fontFamily: "var(--font-mono)" }}
          >
            Assets
          </p>
          <p
            className="font-semibold mt-1"
            style={{ fontSize: "14px", color: "#4ade80", fontFamily: "var(--font-heading)" }}
          >
            {formatCurrency(totalAset)}
          </p>
        </div>
        <div>
          <p
            className="uppercase tracking-wider"
            style={{ fontSize: "11px", color: "#bccabb", fontFamily: "var(--font-mono)" }}
          >
            Debts
          </p>
          <p
            className="font-semibold mt-1"
            style={{ fontSize: "14px", color: "#ffb4ab", fontFamily: "var(--font-heading)" }}
          >
            {formatCurrency(totalUtang)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
