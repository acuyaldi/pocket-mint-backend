"use client";

import type { Wallet } from "@/src/types/wallet";
import { useMemo } from "react";
import { Landmark, CreditCard, Receipt, Banknote, Smartphone, LucideIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

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
  CASH: Banknote,
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
  const creditUsed = isDebt ? Math.abs(wallet.balance) : 0;
  const utilization = hasCreditLimit
    ? Math.min(Math.round((creditUsed / wallet.creditLimit) * 100), 100)
    : 0;

  // For asset wallets just show balance
  if (!isDebt) {
    return (
      <div
        className="flex-1"
        style={{
          backgroundColor: "#131313",
          border: "0.5px solid #262626",
          borderRadius: "10px",
          padding: "14px 16px",
        }}
      >
        {/* Top section: icon + name + type */}
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "6px",
              backgroundColor: "rgba(16, 185, 129, 0.1)",
            }}
          >
            <Icon className="size-4" style={{ color: "#10b981" }} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-[500]" style={{ color: "#e4e4e7" }}>
              {wallet.name}
            </p>
            <p className="text-[11px]" style={{ color: "#71717a" }}>
              {wallet.type.replace("_", " ")}
            </p>
          </div>
        </div>

        {/* Amount */}
        <p className="text-[20px] font-[500]" style={{ color: "#e4e4e7" }}>
          {formatCurrency(wallet.balance)}
        </p>

        {/* Detail text */}
        <p className="text-[11px] mt-0.5" style={{ color: "#71717a" }}>
          Saldo tersedia
        </p>
      </div>
    );
  }

  // Debt wallets: Credit Card or Paylater
  return (
    <div
      className="flex-1"
      style={{
        backgroundColor: "#131313",
        border: "0.5px solid #262626",
        borderRadius: "10px",
        padding: "14px 16px",
      }}
    >
      {/* Top section: icon + name + type */}
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: "26px",
            height: "26px",
            borderRadius: "6px",
            backgroundColor: "rgba(248, 113, 113, 0.1)",
          }}
        >
          <Icon className="size-4" style={{ color: "#f87171" }} />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-[500]" style={{ color: "#e4e4e7" }}>
            {wallet.name}
          </p>
          <p className="text-[11px]" style={{ color: "#71717a" }}>
            {wallet.type.replace("_", " ")}
          </p>
        </div>
      </div>

      {/* Amount - red for debt */}
      <p className="text-[20px] font-[500] mb-1" style={{ color: "#f87171" }}>
        {formatCurrency(creditUsed)}
      </p>

      {/* Detail text */}
      <p className="text-[11px]" style={{ color: "#71717a" }}>
        Sisa limit: {formatCurrency(wallet.creditLimit - creditUsed)}
      </p>

      {/* Utilization bar for credit cards */}
      {wallet.type === "CREDIT_CARD" && hasCreditLimit && (
        <div className="mt-3">
          <div
            className="w-full overflow-hidden"
            style={{
              height: "3px",
              backgroundColor: "#262626",
              borderRadius: "1.5px",
            }}
          >
            <div
              style={{
                width: `${utilization}%`,
                height: "100%",
                backgroundColor: "#f87171",
              }}
            />
          </div>
          <p className="text-[10px] mt-1.5" style={{ color: "#71717a" }}>
            Utilisasi {utilization}%
          </p>
        </div>
      )}
    </div>
  );
}

export function WalletOverviewGrid({ wallets, isLoading, onAddWallet }: WalletOverviewGridProps) {
  // Show up to 4 wallets max, split into separate cards side by side
  const displayWallets = wallets.filter((w) => !w.isArchived).slice(0, 4);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2.5">
        {[1, 2].map((i) => (
          <div key={i} className="h-28 rounded-lg animate-pulse bg-zinc-900 border border-[#262626]" />
        ))}
      </div>
    );
  }

  if (displayWallets.length === 0) {
    return (
      <div
        className="rounded-lg border p-6 flex flex-col items-center gap-3"
        style={{
          backgroundColor: "#131313",
          border: "0.5px solid #262626",
          borderRadius: "10px",
          padding: "14px 16px",
        }}
      >
        <p className="text-sm text-zinc-500">No wallets yet.</p>
        {onAddWallet && (
          <button
            onClick={onAddWallet}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
          >
            + Add your first wallet
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2.5" style={{ paddingLeft: "22px", paddingRight: "22px" }}>
      {displayWallets.map((w) => (
        <WalletCard key={w.id} wallet={w} />
      ))}
    </div>
  );
}
