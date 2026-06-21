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
        style={{ backgroundColor: "#1E293B", border: "1px solid #334155", borderRadius: "8px", padding: "16px" }}
      >
        {/* Top section: icon + name + type */}
        <div className="flex items-center gap-2" style={{ marginBottom: "8px" }}>
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              backgroundColor: "rgba(56, 189, 248, 0.1)",
            }}
          >
            <Icon className="size-4" style={{ color: "#38BDF8" }} />
          </div>
          <div className="min-w-0">
            <p style={{ fontFamily: "var(--font-inter)", fontSize: "13px", fontWeight: 500, color: "#F8FAFC" }}>
              {wallet.name}
            </p>
            <p style={{ fontFamily: "var(--font-inter)", fontSize: "11px", color: "#94A3B8" }}>
              {wallet.type.replace("_", " ")}
            </p>
          </div>
        </div>

        {/* Amount */}
        <p style={{ fontFamily: "var(--font-hanken)", fontSize: "20px", fontWeight: 600, color: "#F8FAFC" }}>
          {formatCurrency(wallet.balance)}
        </p>

        {/* Detail text */}
        <p style={{ fontFamily: "var(--font-inter)", fontSize: "12px", color: "#94A3B8", marginTop: "4px" }}>
          Saldo tersedia
        </p>
      </div>
    );
  }

  // Debt wallets: Credit Card or Paylater
  return (
    <div
      style={{ backgroundColor: "#1E293B", border: "1px solid #334155", borderRadius: "8px", padding: "16px" }}
    >
      {/* Top section: icon + name + type */}
      <div className="flex items-center gap-2" style={{ marginBottom: "8px" }}>
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
          }}
        >
          <Icon className="size-4" style={{ color: "#EF4444" }} />
        </div>
        <div className="min-w-0">
          <p style={{ fontFamily: "var(--font-inter)", fontSize: "13px", fontWeight: 500, color: "#F8FAFC" }}>
            {wallet.name}
          </p>
          <p style={{ fontFamily: "var(--font-inter)", fontSize: "11px", color: "#94A3B8" }}>
            {wallet.type.replace("_", " ")}
          </p>
        </div>
      </div>

      {/* Amount - red for debt */}
      <p style={{ fontFamily: "var(--font-hanken)", fontSize: "20px", fontWeight: 600, color: "#EF4444", marginBottom: "4px" }}>
        {formatCurrency(creditUsed)}
      </p>

      {/* Detail text */}
      <p style={{ fontFamily: "var(--font-inter)", fontSize: "12px", color: "#94A3B8" }}>
        Sisa limit: {formatCurrency(wallet.creditLimit - creditUsed)}
      </p>

      {/* Utilization bar for credit cards */}
      {wallet.type === "CREDIT_CARD" && hasCreditLimit && (
        <div style={{ marginTop: "12px" }}>
          <div
            style={{
              height: "4px",
              backgroundColor: "#334155",
              borderRadius: "9999px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${utilization}%`,
                height: "100%",
                borderRadius: "9999px",
                backgroundColor: utilization >= 80 ? "#EF4444" : utilization >= 30 ? "#F59E0B" : "#10B981",
              }}
            />
          </div>
          <p style={{ fontFamily: "var(--font-inter)", fontSize: "12px", color: "#94A3B8", marginTop: "4px" }}>
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
      <div className="grid grid-cols-2" style={{ gap: "24px" }}>
        {[1, 2].map((i) => (
          <div key={i} className="h-28 rounded animate-pulse" style={{ backgroundColor: "#334155", border: "1px solid #334155" }} />
        ))}
      </div>
    );
  }

  if (displayWallets.length === 0) {
    return (
      <div
        className="flex flex-col items-center"
        style={{
          backgroundColor: "#1E293B",
          border: "1px solid #334155",
          borderRadius: "8px",
          padding: "16px",
          gap: "12px",
        }}
      >
        <p style={{ fontFamily: "var(--font-inter)", fontSize: "14px", color: "#94A3B8" }}>No wallets yet.</p>
        {onAddWallet && (
          <button
            onClick={onAddWallet}
            style={{ fontFamily: "var(--font-inter)", fontSize: "12px", fontWeight: 500, color: "#38BDF8" }}
            className="hover:underline"
          >
            + Add your first wallet
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2" style={{ gap: "24px" }}>
      {displayWallets.map((w) => (
        <WalletCard key={w.id} wallet={w} />
      ))}
    </div>
  );
}