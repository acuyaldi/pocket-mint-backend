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
import WalletList from "./components/WalletList";
import CreateWalletModal from "./components/CreateWalletModal";
import { cn, formatCurrency } from "@/lib/utils";

// Types
export type WalletCategory = "asset" | "debt";
export type WalletKind = "cash" | "bank" | "e_wallet" | "credit_card" | "paylater";

// New type for asset sub-categories
export type AssetSubType = "bank_account" | "e_wallet" | "cash_on_hand" | "piutang";

// New type for debt sub-categories
export type DebtSubType = "credit_card" | "paylater" | "utang_personal" | "line_of_credit";

export interface WalletBase {
  id: string;
  name: string;
  category: WalletCategory;
  kind: WalletKind;
  balance: number;
  icon: "landmark" | "creditcard" | "coins" | "smartphone" | "bitcoin" | "wallet" | "banknote" | "handshake";
  sparklineData?: number[];
}

export interface AssetWallet extends WalletBase {
  category: "asset";
}

export interface DebtWallet extends WalletBase {
  category: "debt";
  creditLimit: number;
  outstanding: number;
}

export type WalletItem = AssetWallet | DebtWallet;

// Helpers
export function formatRp(amount: number): string {
  return formatCurrency(amount);
}

// Mock Data
const MOCK_WALLETS: WalletItem[] = [
  {
    id: "w1",
    name: "Main Savings",
    category: "asset",
    kind: "bank",
    balance: 24_850_000,
    icon: "landmark",
    sparklineData: [18, 20, 19, 22, 21, 24, 24.85],
  },
  {
    id: "w2",
    name: "GoPay",
    category: "asset",
    kind: "e_wallet",
    balance: 1_340_000,
    icon: "wallet",
    sparklineData: [2.1, 1.8, 1.5, 1.9, 1.2, 1.4, 1.34],
  },
  {
    id: "w3",
    name: "Cash on Hand",
    category: "asset",
    kind: "cash",
    balance: 850_000,
    icon: "banknote",
    sparklineData: [1.2, 1.0, 0.9, 1.1, 0.8, 0.9, 0.85],
  },
  {
    id: "w4",
    name: "Bitcoin Wallet",
    category: "asset",
    kind: "e_wallet",
    balance: 8_500_000,
    icon: "wallet",
    sparklineData: [6.2, 7.0, 6.8, 7.5, 8.0, 8.2, 8.5],
  },
  {
    id: "w5",
    name: "Kredivo",
    category: "debt",
    kind: "paylater",
    balance: 3_200_000,
    creditLimit: 10_000_000,
    outstanding: 3_200_000,
    icon: "creditcard",
  },
  {
    id: "w6",
    name: "Spaylater",
    category: "debt",
    kind: "paylater",
    balance: 1_750_000,
    creditLimit: 5_000_000,
    outstanding: 1_750_000,
    icon: "creditcard",
  },
];

// Derived financial aggregates
function computeAggregates(wallets: WalletItem[]) {
  const assets = wallets.filter((w) => w.category === "asset");
  const debts = wallets.filter((w) => w.category === "debt") as DebtWallet[];

  const totalAssets = assets.reduce((s, w) => s + w.balance, 0);
  const totalDebts = debts.reduce((s, w) => s + w.outstanding, 0);
  const netWorth = totalAssets - totalDebts;
  const totalCreditLimit = debts.reduce((s, w) => s + w.creditLimit, 0);
  const debtRatio = totalCreditLimit > 0 ? (totalDebts / totalCreditLimit) * 100 : 0;

  const prevNetWorth = netWorth * 0.958;
  const growthPct = ((netWorth - prevNetWorth) / Math.abs(prevNetWorth)) * 100;

  return { totalAssets, totalDebts, netWorth, totalCreditLimit, debtRatio, growthPct };
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
      className={cn(
        "rounded-2xl border-2 border-dashed border-white/[0.08] bg-transparent p-4",
        "flex flex-col items-center justify-center gap-3 min-h-[170px] cursor-pointer",
        "hover:border-emerald-500/30 hover:bg-emerald-500/[0.02] transition-all duration-300",
        "group",
      )}
    >
      <div className="size-10 rounded-full border border-white/10 flex items-center justify-center group-hover:border-emerald-500/30 transition-colors">
        <Plus className="size-4 text-white/40 group-hover:text-emerald-400 transition-colors" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-white/60 group-hover:text-white/80 transition-colors">
          Connect Account
        </p>
        <p className="text-xs text-white/30 mt-1">Bank, Card, or Investment</p>
      </div>
    </motion.div>
  );
}

// Main Page
export default function WalletsPage() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const agg = useMemo(() => computeAggregates(MOCK_WALLETS), []);

  // Modal state
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  const filteredWallets = useMemo(
    () => (filter === "all" ? MOCK_WALLETS : MOCK_WALLETS.filter((w) => w.category === filter)),
    [filter],
  );

  const handleWalletClick = (wallet: WalletItem) => {
    console.log("=== WALLET CLICKED ===", wallet);
  };

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
        <motion.div variants={fadeUp} className="relative rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-6 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-amber-500/[0.03] blur-3xl pointer-events-none" />
          <p className="text-xs font-semibold text-white uppercase tracking-widest">Total Debt Ratio</p>
          <div className="flex items-center gap-3 mt-3">
            <p className="text-4xl font-bold text-white tracking-tight">{agg.debtRatio.toFixed(1)}%</p>
            {agg.debtRatio < 30 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
                <ShieldCheck className="size-3" /> Status: Aman
              </span>
            )}
          </div>
          <div className="mt-5 h-3.5 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className={cn("h-full rounded-full", agg.debtRatio > 50 ? "bg-red-500/80" : agg.debtRatio > 30 ? "bg-amber-500/70" : "bg-emerald-500/70")}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(agg.debtRatio, 100)}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
            />
          </div>
          <div className="flex items-center gap-1.5 mt-2.5">
            <AlertTriangle className="size-3 text-white/30" />
            <span className="text-[11px] text-white/35">Safe threshold: &lt;30%</span>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-white/[0.04]">
            <div>
              <p className="text-[11px] text-white/35 uppercase tracking-wider">Total Outstanding</p>
              <p className="text-sm font-semibold text-white/80 mt-1">{formatRp(agg.totalDebts)}</p>
            </div>
            <div>
              <p className="text-[11px] text-white/35 uppercase tracking-wider">Total Credit Limit</p>
              <p className="text-sm font-semibold text-white/80 mt-1">{formatRp(agg.totalCreditLimit)}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filter Bar */}
      <motion.div variants={fadeUp} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 p-1 rounded-lg bg-white/[0.03] border border-white/[0.04]">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)} className={cn("px-4 py-1.5 rounded-md text-xs font-medium transition-all duration-200", filter === f.key ? "bg-white/[0.08] text-white shadow-sm" : "text-white/40 hover:text-white/60 hover:bg-white/[0.03]")}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium text-white/50 bg-white/[0.03] border border-white/[0.06] hover:text-white/70 hover:border-white/[0.1] transition-all">
            <SlidersHorizontal className="size-3.5" /> Sort by Balance <ChevronDown className="size-3" />
          </button>
          <Button onClick={() => setIsCustomModalOpen(true)} className="bg-emerald-500 hover:bg-emerald-400 text-[#003919] font-semibold h-9 px-5 gap-2 rounded-lg shadow-lg shadow-emerald-500/10">
            <Plus className="size-4" /> Add New Wallet
          </Button>
        </div>
      </motion.div>

      {/* Wallet Cards Grid */}
      <motion.div variants={pageVariants} key={filter} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <WalletList
          wallets={filteredWallets}
          onWalletClick={handleWalletClick}
        />
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
