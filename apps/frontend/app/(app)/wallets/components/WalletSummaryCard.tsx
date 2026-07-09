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
      className="surface-card relative overflow-hidden rounded-2xl border border-white/80 p-5"
    >
      <p className="uppercase tracking-widest text-[11px] font-semibold text-muted-foreground font-mono">
        Net Worth
      </p>

      <p className="tracking-tight mt-3 text-[28px] font-bold text-foreground font-heading">
        {formatCurrency(netWorth)}
      </p>

      <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-[3px] rounded-full bg-primary/10 border border-primary/25">
        <ArrowUpRight className="size-3 text-primary" />
        <span className="font-semibold text-[11px] text-primary font-mono">
          +{growthPct.toFixed(1)}% this month
        </span>
      </div>

      {/* Sparkline top-right */}
      <div className="absolute right-5 top-5">
        <FullWidthSparkline data={sparklineData} color="#006d36" />
      </div>

      {/* Bottom stats */}
      <div className="mt-6 flex gap-8 border-t border-border/70 pt-4">
        <div>
          <p className="uppercase tracking-wider text-[11px] text-muted-foreground font-mono">
            Assets
          </p>
          <p className="font-semibold mt-1 text-[14px] text-primary font-heading">
            {formatCurrency(totalAset)}
          </p>
        </div>
        <div>
          <p className="uppercase tracking-wider text-[11px] text-muted-foreground font-mono">
            Debts
          </p>
          <p className="font-semibold mt-1 text-[14px] text-destructive font-heading">
            {formatCurrency(totalUtang)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
