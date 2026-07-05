"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  ShieldCheck,
  AlertTriangle,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Import components
import WalletSummaryCard from "./components/WalletSummaryCard";
import CreateWalletModal, { type CreateWalletFormData } from "./components/CreateWalletModal";
import EditWalletModal from "./components/EditWalletModal";
import { WalletCard } from "@/components/WalletCard";

// Import hooks & types
import { useWallets, useCreateWallet } from "@/src/features/wallets/hooks/useWallets";
import { isDebtWallet, type Wallet, type WalletType } from "@/src/types/wallet";
import { formatCurrency } from "@/lib/utils";

// Modal sub-types → backend WalletType
const TYPE_FROM_SUBTYPE: Record<string, WalletType> = {
  bank_account: "BANK",
  e_wallet: "E_WALLET",
  cash_on_hand: "CASH",
  piutang: "CASH", // ponytail: no receivable type in schema; closest asset bucket
  credit_card: "CREDIT_CARD",
  paylater: "LOAN_PAYLATER",
  utang_personal: "LOAN_PAYLATER",
  line_of_credit: "LOAN_PAYLATER",
};

// Derived financial aggregates
function computeAggregates(wallets: Wallet[]) {
  const assets = wallets.filter((w) => !isDebtWallet(w.type));
  const debts = wallets.filter((w) => isDebtWallet(w.type));

  const totalAssets = assets.reduce((s, w) => s + w.balance, 0);
  const totalDebts = debts.reduce((s, w) => s + Math.abs(w.balance), 0);
  const netWorth = totalAssets - totalDebts;
  const totalCreditLimit = debts.reduce((s, w) => s + (w.creditLimit ?? 0), 0);
  const debtRatio = totalCreditLimit > 0 ? (totalDebts / totalCreditLimit) * 100 : 0;

  return { totalAssets, totalDebts, netWorth, totalCreditLimit, debtRatio };
}

// Filter Pills
type FilterKey = "all" | "asset" | "debt";
type SortKey = "default" | "balance";

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
      className="rounded-xl p-4 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200 hover:opacity-80 min-h-40 border-2 border-dashed border-border bg-transparent"
    >
      <div className="size-10 rounded-full flex items-center justify-center border border-border bg-muted">
        <Plus className="size-4 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground font-sans">
          Connect Account
        </p>
        <p className="text-xs mt-1 text-[#3d4a3e] font-sans">
          Bank, Card, or Investment
        </p>
      </div>
    </motion.div>
  );
}

// Main Page
export default function WalletsPage() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("default");
  const { data: wallets } = useWallets();

  const allWallets = useMemo(
    () => (wallets ?? []).filter((w) => !w.isArchived),
    [wallets],
  );

  const agg = useMemo(() => computeAggregates(allWallets), [allWallets]);

  // Modal state
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const createWallet = useCreateWallet();

  const filteredWallets = useMemo(() => {
    let list = allWallets;
    if (filter === "debt") list = allWallets.filter((w) => isDebtWallet(w.type));
    else if (filter === "asset") list = allWallets.filter((w) => !isDebtWallet(w.type));
    if (sort === "balance") list = [...list].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
    return list;
  }, [filter, sort, allWallets]);

  const handleWalletCreateSuccess = async (d: CreateWalletFormData) => {
    const type =
      TYPE_FROM_SUBTYPE[d.subType ?? ""] ?? (d.category === "debt" ? "LOAN_PAYLATER" : "CASH");
    try {
      await createWallet.mutateAsync({
        name: d.name,
        type,
        // Debt wallets store outstanding as a negative balance
        balance: d.category === "debt" ? -(d.outstanding ?? 0) : d.balance ?? 0,
        creditLimit: d.creditLimit,
        interestRate: d.interestRate,
        // Modal collects admin fee as % of principal
        adminFee: d.adminFee,
        ...(d.adminFee !== undefined && { adminFeeType: "PERCENT" as const }),
        color: d.color,
        icon: d.icon,
      });
    } catch (err) {
      console.error("Gagal membuat wallet:", err);
    }
  };

  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Header Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
        {/* Wallet Summary (Net Worth Card) */}
        <WalletSummaryCard
          netWorth={agg.netWorth}
          totalAset={agg.totalAssets}
          totalUtang={agg.totalDebts}
        />

        {/* Total Debt Ratio Card — lighter surface (bg-accent) per mockup */}
        <motion.div
          variants={fadeUp}
          className="relative overflow-hidden bg-accent border border-border rounded-xl p-5"
        >
          <p className="uppercase tracking-widest text-[11px] font-semibold text-muted-foreground font-mono">
            Total Debt Ratio
          </p>
          <div className="flex items-center gap-3 mt-3">
            <p className="text-[32px] font-bold text-foreground font-heading">
              {agg.debtRatio.toFixed(1)}%
            </p>
            {agg.debtRatio < 30 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full bg-primary/10 border border-primary/25 text-[11px] font-semibold text-primary font-mono">
                <ShieldCheck className="size-3" /> Status: Aman
              </span>
            )}
          </div>
          {/* Progress bar (track darker than the lighter card surface) */}
          <div className="mt-4 overflow-hidden h-1 rounded-full bg-muted">
            <motion.div
              className={`h-full rounded-full ${
                agg.debtRatio > 50 ? "bg-destructive" : agg.debtRatio > 30 ? "bg-[#facc15]" : "bg-primary"
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(agg.debtRatio, 100)}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
            />
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <AlertTriangle className="size-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground font-sans">
              Safe threshold: &lt;30%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-[#1a1a1a]">
            <div>
              <p className="uppercase tracking-wider text-[11px] text-muted-foreground font-mono">
                Total Outstanding
              </p>
              <p className="font-semibold mt-1 text-[14px] text-destructive font-heading">
                {formatCurrency(agg.totalDebts)}
              </p>
            </div>
            <div>
              <p className="uppercase tracking-wider text-[11px] text-muted-foreground font-mono">
                Total Credit Limit
              </p>
              <p className="font-semibold mt-1 text-[14px] text-foreground font-heading">
                {formatCurrency(agg.totalCreditLimit)}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filter Bar */}
      <motion.div variants={fadeUp} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 p-1 rounded-lg bg-muted border border-border">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all duration-200 font-sans ${
                filter === f.key ? "bg-accent text-foreground" : "text-muted-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSort(sort === "balance" ? "default" : "balance")}
            className={`flex items-center gap-2 h-9 px-4 rounded-lg text-xs font-medium transition-all duration-200 font-sans border ${
              sort === "balance"
                ? "bg-primary/10 border-primary/25 text-primary"
                : "bg-muted border-border text-muted-foreground"
            }`}
          >
            <ArrowUpDown className="size-3.5" />
            Sort by Balance
          </button>
          <Button
            onClick={() => setIsCustomModalOpen(true)}
            className="font-semibold h-9 px-5 gap-2 rounded-lg bg-primary text-primary-foreground"
          >
            <Plus className="size-4" /> Add New Wallet
          </Button>
        </div>
      </motion.div>

      {/* Wallet Cards Grid */}
      <motion.div
        variants={pageVariants}
        key={filter}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {filteredWallets.map((wallet) => (
          <WalletCard key={wallet.id} wallet={wallet} variant="full" onEdit={setEditingWallet} />
        ))}
        <ConnectAccountCard onClick={() => setIsCustomModalOpen(true)} />
      </motion.div>

      {/* Create New Wallet Modal */}
      <CreateWalletModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onSuccess={handleWalletCreateSuccess}
      />

      {/* Edit Wallet Modal */}
      <EditWalletModal wallet={editingWallet} onClose={() => setEditingWallet(null)} />
    </motion.div>
  );
}
