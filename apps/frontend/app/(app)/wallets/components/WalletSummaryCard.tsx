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
    <motion.div variants={fadeUp} className="relative rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-6 overflow-hidden">
      <div className="absolute -top-20 -right-20 w-52 h-52 rounded-full bg-emerald-500/[0.04] blur-3xl pointer-events-none" />
      <p className="text-xs font-semibold text-white uppercase tracking-widest">Net Worth</p>
      <p className="text-4xl font-bold text-emerald-400 tracking-tight mt-3">{formatRp(netWorth)}</p>
      <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
        <ArrowUpRight className="size-3 text-emerald-400" />
        <span className="text-xs text-emerald-400 font-semibold">+{growthPct.toFixed(1)}% this month</span>
      </div>
      <div className="absolute right-6 top-6">
        <FullWidthSparkline data={sparklineData} color="#10B981" />
      </div>
      <div className="flex gap-8 mt-6 pt-5 border-t border-white/[0.04]">
        <div>
          <p className="text-[11px] text-white/35 uppercase tracking-wider">Assets</p>
          <p className="text-sm font-semibold text-white/80 mt-1">{formatRp(totalAset)}</p>
        </div>
        <div>
          <p className="text-[11px] text-white/35 uppercase tracking-wider">Debts</p>
          <p className="text-sm font-semibold text-white/80 mt-1">{formatRp(totalUtang)}</p>
        </div>
      </div>
    </motion.div>
  );
}
