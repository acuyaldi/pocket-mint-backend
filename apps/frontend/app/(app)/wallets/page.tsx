"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  SlidersHorizontal,
  ChevronDown,
  Plus,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Import components
import WalletSummaryCard from "./components/WalletSummaryCard";
import CreateWalletModal from "./components/CreateWalletModal";
import { WalletCard } from "@/components/WalletCard";

// Import hooks & types
import { useWallets } from "@/src/features/wallets/hooks/useWallets";
import type { Wallet } from "@/src/types/wallet";
import { formatCurrency } from "@/lib/utils";

// Helpers
export function formatRp(amount: number): string {
  return formatCurrency(amount);
}

const DEBT_TYPES = ["CREDIT_CARD", "LOAN_PAYLATER"];

// Derived financial aggregates
function computeAggregates(wallets: Wallet[]) {
  const assets = wallets.filter((w) => !DEBT_TYPES.includes(w.type));
  const debts = wallets.filter((w) => DEBT_TYPES.includes(w.type));

  const totalAssets = assets.reduce((s, w) => s + w.balance, 0);
  const totalDebts = debts.reduce((s, w) => s + Math.abs(w.balance), 0);
  const netWorth = totalAssets - totalDebts;
  const totalCreditLimit = debts.reduce((s, w) => s + (w.creditLimit ?? 0), 0);
  const debtRatio = totalCreditLimit > 0 ? (totalDebts / totalCreditLimit) * 100 : 0;

  return { totalAssets, totalDebts, netWorth, totalCreditLimit, debtRatio };
}

// Filter Pills
type FilterKey = "all" | "asset" | "debt";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All Wallets" },
  { key: "asset", label: "Assets" },
  { key: "debt", label: "Debts" },
];

// Animation Variants
const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

// Connect Account Card
function ConnectAccountCard({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      variants={fadeUp}
      onClick={onClick}
      className="rounded-2xl p-4 flex flex-col items-center justify-center gap-3 min-h-[170px] cursor-pointer group transition-all duration-300"
      style={{
        border: "2px dashed #334155",
        backgroundColor: "transparent",
      }}
    >
      <div
        className="size-10 rounded-full flex items-center justify-center transition-colors"
        style={{ border: "1px solid #334155" }}
      >
        <Plus className="size-4" style={{ color: "#94A3B8" }} />
      </div>
      <div className="text-center">
        <p
          className="text-sm font-medium transition-colors"
          style={{ color: "#94A3B8", fontFamily: "var(--font-inter)" }}
        >
          Connect Account
        </p>
        <p className="text-xs mt-1" style={{ color: "#64748B", fontFamily: "var(--font-inter)" }}>
          Bank, Card, or Investment
        </p>
      </div>
    </motion.div>
  );
}

// Main Page
export default function WalletsPage() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const { data: wallets } = useWallets();

  const allWallets = useMemo(
    () => (wallets ?? []).filter((w) => !w.isArchived),
    [wallets],
  );

  const agg = useMemo(() => computeAggregates(allWallets), [allWallets]);

  // Modal state
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  const filteredWallets = useMemo(
    () => {
      if (filter === "all") return allWallets;
      if (filter === "debt") return allWallets.filter((w) => DEBT_TYPES.includes(w.type));
      return allWallets.filter((w) => !DEBT_TYPES.includes(w.type));
    },
    [filter, allWallets],
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleWalletCreateSuccess = (formData: any) => {
    console.log("=== NEW WALLET CREATED SUCCESS ===", formData);
  };

  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Header Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
        {/* Wallet Summary (Net Worth Card) */}
        <WalletSummaryCard
          netWorth={agg.netWorth}
          totalAset={agg.totalAssets}
          totalUtang={agg.totalDebts}
        />

        {/* Total Debt Ratio Card */}
        <motion.div variants={fadeUp} className="relative overflow-hidden" style={{ backgroundColor: "#1E293B", border: "1px solid #334155", borderRadius: "8px", padding: "16px" }}>
          <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: "rgba(245,158,11,0.03)" }} />
          <p className="uppercase tracking-widest" style={{ fontSize: "11px", fontWeight: 600, color: "#64748B", fontFamily: "var(--font-inter)" }}>Total Debt Ratio</p>
          <div className="flex items-center gap-3 mt-3">
            <p style={{ fontSize: "20px", fontWeight: 600, color: "#F8FAFC", fontFamily: "var(--font-hanken)" }}>{agg.debtRatio.toFixed(1)}%</p>
            {agg.debtRatio < 30 && (
              <span
                className="inline-flex items-center gap-1"
                style={{
                  padding: "3px 10px",
                  borderRadius: "9999px",
                  backgroundColor: "rgba(16,185,129,0.15)",
                  border: "1px solid #10B981",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#10B981",
                  fontFamily: "var(--font-inter)",
                }}
              >
                <ShieldCheck className="size-3" /> Status: Aman
              </span>
            )}
          </div>
          {/* Progress bar */}
          <div className="mt-5 overflow-hidden" style={{ height: "4px", borderRadius: "9999px", backgroundColor: "#334155" }}>
            <motion.div
              className="h-full"
              style={{
                borderRadius: "9999px",
                backgroundColor: agg.debtRatio > 50 ? "#EF4444" : agg.debtRatio > 30 ? "#F59E0B" : "#10B981",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(agg.debtRatio, 100)}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
            />
          </div>
          <div className="flex items-center gap-1.5 mt-2.5">
            <AlertTriangle className="size-3" style={{ color: "#64748B" }} />
            <span style={{ fontSize: "11px", color: "#64748B", fontFamily: "var(--font-inter)" }}>Safe threshold: &lt;30%</span>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-5 pt-5" style={{ borderTop: "1px solid #334155" }}>
            <div>
              <p className="uppercase tracking-wider" style={{ fontSize: "11px", color: "#64748B", fontFamily: "var(--font-inter)" }}>Total Outstanding</p>
              <p className="font-semibold mt-1" style={{ fontSize: "14px", color: "#F8FAFC", fontFamily: "var(--font-inter)" }}>{formatRp(agg.totalDebts)}</p>
            </div>
            <div>
              <p className="uppercase tracking-wider" style={{ fontSize: "11px", color: "#64748B", fontFamily: "var(--font-inter)" }}>Total Credit Limit</p>
              <p className="font-semibold mt-1" style={{ fontSize: "14px", color: "#F8FAFC", fontFamily: "var(--font-inter)" }}>{formatRp(agg.totalCreditLimit)}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filter Bar */}
      <motion.div variants={fadeUp} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: "#1E293B", border: "1px solid #334155" }}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-4 py-1.5 rounded-md text-xs font-medium transition-all duration-200"
              style={{
                backgroundColor: filter === f.key ? "#334155" : "transparent",
                color: filter === f.key ? "#F8FAFC" : "#94A3B8",
                fontFamily: "var(--font-inter)",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
       
          <Button
            onClick={() => setIsCustomModalOpen(true)}
            className="font-semibold h-9 px-5 gap-2 rounded-lg"
            style={{ backgroundColor: "#38BDF8", color: "#0F172A" }}
          >
            <Plus className="size-4" /> Add New Wallet
          </Button>
        </div>
      </motion.div>

      {/* Wallet Cards Grid */}
      <motion.div variants={pageVariants} key={filter} style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
        {filteredWallets.map((wallet) => (
          <WalletCard key={wallet.id} wallet={wallet} variant="full" />
        ))}
        <ConnectAccountCard onClick={() => setIsCustomModalOpen(true)} />
      </motion.div>

      {/* Create New Wallet Modal */}
      <CreateWalletModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onSuccess={handleWalletCreateSuccess}
      />
    </motion.div>
  );
}
