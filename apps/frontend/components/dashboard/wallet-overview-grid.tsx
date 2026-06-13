"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { Wallet } from "@/src/types/wallet";
import { useMemo } from "react";
import { Landmark, CreditCard, Receipt, Banknote, Smartphone, LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { WalletSparkline } from "@/components/dashboard/WalletSparkline";

interface WalletOverviewGridProps {
  wallets: Wallet[];
  isLoading?: boolean;
  onAddWallet?: () => void;
}

function getWalletIcon(type: string): LucideIcon {
  switch (type) {
    case "BANK": return Landmark;
    case "E_WALLET": return Smartphone;
    case "CREDIT_CARD": return CreditCard;
    case "LOAN_PAYLATER": return Receipt;
    default: return Banknote;
  }
}

const WALLET_ICON_MAP: Record<string, LucideIcon> = {
  BANK: Landmark,
  E_WALLET: Smartphone,
  CREDIT_CARD: CreditCard,
  LOAN_PAYLATER: Receipt,
};

const ASSET_TYPES = ["CASH", "BANK", "E_WALLET"];

// ── Individual wallet card ──────────────────────────────────────────────────────
function WalletCard({ wallet }: { wallet: Wallet }) {
  const Icon = WALLET_ICON_MAP[wallet.type] ?? Banknote;
  const isDebt = wallet.type === "CREDIT_CARD" || wallet.type === "LOAN_PAYLATER";
  const hasCreditLimit = wallet.creditLimit > 0;

  // Credit card: show "Credit Used" = |balance|, utilization = |balance| / limit * 100
  // Paylater: show "Remaining debt" = |balance|, tenor progress if available
  const creditUsed = isDebt ? Math.abs(wallet.balance) : 0;
  const utilization = hasCreditLimit
    ? Math.min(Math.round((creditUsed / wallet.creditLimit) * 100), 100)
    : 0;

  // Mock installment data for paylater wallets (until API supports real installment tracking)
  const isPaylater = wallet.type === "LOAN_PAYLATER";
  // Derive installment progress from wallet metadata or use sensible defaults
  const totalMonths = isPaylater && wallet.interestRate > 0 ? 12 : 0;
  const monthsElapsed = isPaylater && totalMonths > 0 ? 4 : 0; // TODO: derive from real data
  const tenorPercent = totalMonths > 0 ? Math.round((monthsElapsed / totalMonths) * 100) : 0;
  // Next payment estimate: |balance| / remaining months
  const remainingMonths = Math.max(totalMonths - monthsElapsed, 1);
  const nextPaymentAmount = isPaylater && totalMonths > 0
    ? Math.abs(wallet.balance) / remainingMonths
    : 0;

  // For asset wallets just show balance
  if (!isDebt) {
    return (
      <Card className="border border-[#1a1a1a] bg-[#0a0a0a] hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/[0.02] transition-all duration-300 overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Icon className="size-4 text-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-50 truncate">{wallet.name}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide">{wallet.type.replace("_", " ")}</p>
            </div>
          </div>
          <p className="text-xl font-bold text-zinc-50 tabular-nums">{formatCurrency(wallet.balance)}</p>
        </CardContent>
        <WalletSparkline walletId={wallet.id} isDebt={false} />
      </Card>
    );
  }

  // Debt wallets: Credit Card or Paylater
  return (
    <Card className="border border-[#1a1a1a] bg-[#0a0a0a] hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/[0.02] transition-all duration-300 overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <Icon className="size-4 text-red-400/70" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-50 truncate">{wallet.name}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">{wallet.type.replace("_", " ")}</p>
          </div>
        </div>

        {/* Credit Used amount */}
        <p className="text-xl font-bold text-zinc-50 tabular-nums mb-1">
          {formatCurrency(creditUsed)}
        </p>

        {/* Credit card: utilization progress bar */}
        {wallet.type === "CREDIT_CARD" && hasCreditLimit && (
          <div className="space-y-1.5 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wide">
                {utilization}% Used
              </span>
              <span className={`text-[10px] font-semibold tabular-nums ${
                utilization >= 80 ? "text-red-400" : utilization >= 50 ? "text-yellow-400" : "text-emerald-400"
              }`}>
                {utilization}%
              </span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  utilization >= 80 ? "bg-red-500" : utilization >= 50 ? "bg-yellow-500" : "bg-emerald-500"
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${utilization}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
             <p className="text-[10px] text-zinc-500">
              Limit: <span className="text-zinc-400 font-medium">{formatCurrency(wallet.creditLimit)}</span>
            </p>
          </div>
        )}

        {/* Paylater: tenor progress + next payment */}
        {isPaylater && totalMonths > 0 && (
          <div className="space-y-1.5 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wide">
                {monthsElapsed} of {totalMonths} Months
              </span>
              <span className="text-[10px] font-semibold text-emerald-400 tabular-nums">
                {tenorPercent}%
              </span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${tenorPercent}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <p className="text-[10px] text-zinc-500">
              Next payment:{" "}
              <span className="text-zinc-400 font-medium">{formatCurrency(nextPaymentAmount)}</span>
              <span className="text-zinc-600"> on Oct 1</span>
            </p>
          </div>
        )}

        {/* Paylater without installment data: just show remaining debt */}
        {isPaylater && totalMonths === 0 && (
          <div className="space-y-1 mt-2">
            <p className="text-[10px] text-neutral-400">
              Remaining debt balance
            </p>
          </div>
        )}
      </CardContent>
      <WalletSparkline walletId={wallet.id} isDebt={true} />
    </Card>
  );
}

export function WalletOverviewGrid({ wallets, isLoading, onAddWallet }: WalletOverviewGridProps) {
  // Show up to 4 wallets max
  const displayWallets = wallets.filter((w) => !w.isArchived).slice(0, 4);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-36 rounded-lg animate-pulse bg-zinc-900 border border-[#1a1a1a]" />
        ))}
      </div>
    );
  }

  if (displayWallets.length === 0) {
    return (
      <Card className="border border-[#1a1a1a] bg-[#0a0a0a]">
        <CardContent className="p-6 flex flex-col items-center gap-3">
          <p className="text-sm text-zinc-500">No wallets yet.</p>
          {onAddWallet && (
            <button
              onClick={onAddWallet}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              + Add your first wallet
            </button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {displayWallets.map((w) => (
        <WalletCard key={w.id} wallet={w} />
      ))}
    </div>
  );
}
