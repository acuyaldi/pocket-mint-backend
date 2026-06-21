"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { FullWidthSparkline } from "./FullWidthSparkline";

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

function formatRp(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export default function WalletSummaryCard({ netWorth, totalAset, totalUtang }: WalletSummaryCardProps) {
  const prevNetWorth = netWorth * 0.958;
  const growthPct = ((netWorth - prevNetWorth) / Math.abs(prevNetWorth)) * 100;
  const sparklineData = [
    netWorth * 0.88,
    netWorth * 0.9,
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
        backgroundColor: "#1E293B",
        border: "1px solid #334155",
        borderRadius: "8px",
        padding: "16px",
      }}
    >
      <div className="absolute -top-20 -right-20 w-52 h-52 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: "rgba(56,189,248,0.04)" }} />
      <p
        className="uppercase tracking-widest"
        style={{ fontSize: "11px", fontWeight: 600, color: "#64748B", fontFamily: "var(--font-inter)" }}
      >
        Net Worth
      </p>
      <p
        className="tracking-tight mt-3"
        style={{
          fontSize: "20px",
          fontWeight: 600,
          color: "#38BDF8",
          fontFamily: "var(--font-hanken)",
        }}
      >
        {formatRp(netWorth)}
      </p>
      <div
        className="inline-flex items-center gap-1.5 mt-2"
        style={{
          padding: "3px 10px",
          borderRadius: "9999px",
          backgroundColor: "rgba(16,185,129,0.15)",
          border: "1px solid #10B981",
        }}
      >
        <ArrowUpRight className="size-3" style={{ color: "#10B981" }} />
        <span
          className="font-semibold"
          style={{ fontSize: "11px", color: "#10B981", fontFamily: "var(--font-inter)" }}
        >
          +{growthPct.toFixed(1)}% this month
        </span>
      </div>
      <div className="absolute right-6 top-6">
        <FullWidthSparkline data={sparklineData} color="#38BDF8" />
      </div>
      <div className="flex gap-8 mt-6 pt-5" style={{ borderTop: "1px solid #334155" }}>
        <div>
          <p
            className="uppercase tracking-wider"
            style={{ fontSize: "11px", color: "#64748B", fontFamily: "var(--font-inter)" }}
          >
            Assets
          </p>
          <p
            className="font-semibold mt-1"
            style={{ fontSize: "14px", color: "#F8FAFC", fontFamily: "var(--font-inter)" }}
          >
            {formatRp(totalAset)}
          </p>
        </div>
        <div>
          <p
            className="uppercase tracking-wider"
            style={{ fontSize: "11px", color: "#64748B", fontFamily: "var(--font-inter)" }}
          >
            Debts
          </p>
          <p
            className="font-semibold mt-1"
            style={{ fontSize: "14px", color: "#F8FAFC", fontFamily: "var(--font-inter)" }}
          >
            {formatRp(totalUtang)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
