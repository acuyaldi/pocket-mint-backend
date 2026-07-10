"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Landmark,
  CreditCard,
  Smartphone,
  Banknote,
  Receipt,
  LucideIcon,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { isDebtWallet, type Wallet } from "@/src/types/wallet";
import { WalletSparkline } from "@/components/WalletSparkline";
import { useDeleteWallet } from "@/src/features/wallets/hooks/useWallets";

// ── Constants ──────────────────────────────────────────────────────────────────

const INSTALLMENT_TYPES = ["LOAN_PAYLATER"];

const WALLET_ICON_MAP: Record<string, LucideIcon> = {
  CASH: Banknote,
  BANK: Landmark,
  E_WALLET: Smartphone,
  CREDIT_CARD: CreditCard,
  LOAN_PAYLATER: Receipt,
};

const TYPE_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK: "Bank Account",
  E_WALLET: "E-Wallet",
  CREDIT_CARD: "Credit Card",
  LOAN_PAYLATER: "Loan / Paylater",
};

// ── Props ──────────────────────────────────────────────────────────────────────

interface WalletCardProps {
  wallet: Wallet;
  variant?: "compact" | "full";
  onEdit?: (wallet: Wallet) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

// Utilization threshold color: warning (amber) token for the mid band
function utilBarClass(pct: number): string {
  return pct >= 80 ? "bg-destructive" : pct >= 30 ? "bg-warning" : "bg-primary";
}
function utilTextClass(pct: number): string {
  return pct >= 80 ? "text-destructive" : pct >= 30 ? "text-warning" : "text-primary";
}

// ── Component ──────────────────────────────────────────────────────────────────

export function WalletCard({ wallet, onEdit }: WalletCardProps) {
  const Icon = WALLET_ICON_MAP[wallet.type] ?? Banknote;
  const isDebt = isDebtWallet(wallet.type);
  const typeLabel = TYPE_LABELS[wallet.type] ?? wallet.type;

  // Debt calculations
  const outstanding = isDebt ? Math.abs(wallet.balance) : 0;
  const creditLimit = wallet.creditLimit ?? 0;
  const remaining = isDebt ? Math.max(creditLimit - outstanding, 0) : 0;
  const utilization =
    isDebt && creditLimit > 0
      ? Math.min(Math.round((outstanding / creditLimit) * 100), 100)
      : 0;

  const isInstallment = INSTALLMENT_TYPES.includes(wallet.type);
  const accentBorder = isInstallment
    ? "border-l-warning"
    : isDebt
    ? "border-l-destructive"
    : "border-l-primary";
  const iconBg = isInstallment ? "bg-warning/10" : isDebt ? "bg-destructive/10" : "bg-primary/10";
  const iconColor = isInstallment ? "text-warning" : isDebt ? "text-destructive" : "text-primary";

  // ── Kebab menu state ──
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const deleteWallet = useDeleteWallet();

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showMenu]);

  const handleDeleteConfirm = useCallback(async () => {
    setIsDeleting(true);
    try {
      await deleteWallet.mutateAsync(wallet.id);
      setShowDeleteModal(false);
      setShowMenu(false);
    } catch (err) {
      console.error("Failed to delete wallet:", err);
    } finally {
      setIsDeleting(false);
    }
  }, [wallet.id, deleteWallet, setShowDeleteModal]);

  return (
    <div className={`surface-card relative rounded-xl border border-white/80 p-4 border-l-4 ${accentBorder}`}>
      {/* ── Top row: icon + name + kebab ── */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`flex items-center justify-center shrink-0 size-8 rounded-lg border border-border ${iconBg}`}>
          <Icon className={`size-4 ${iconColor}`} />
        </div>
        <span className="text-sm font-medium text-foreground font-sans">
          {wallet.name}
        </span>
        <span className="text-xs text-muted-foreground font-sans ml-auto">
          {typeLabel}
        </span>

        {/* Kebab menu button */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center justify-center size-7 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
          >
            <MoreVertical className="size-4" />
          </button>

          {/* Dropdown menu */}
          {showMenu && (
            <div className="absolute top-8 right-0 min-w-32.5 whitespace-nowrap bg-card border border-border rounded-lg z-50 overflow-hidden">
              {onEdit && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onEdit(wallet);
                  }}
                  className="flex items-center gap-2 w-full px-3.5 py-2 text-[13px] text-foreground hover:bg-accent transition-colors cursor-pointer font-sans"
                >
                  <Pencil className="size-3.5" />
                  Edit wallet
                </button>
              )}
              <button
                onClick={() => {
                  setShowMenu(false);
                  setShowDeleteModal(true);
                }}
                className="flex items-center gap-2 w-full px-3.5 py-2 text-[13px] text-destructive hover:bg-accent transition-colors cursor-pointer font-sans"
              >
                <Trash2 className="size-3.5" />
                Delete wallet
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── ASSET ── */}
      {!isDebt && (
        <>
          <p className="uppercase text-[11px] font-semibold text-muted-foreground tracking-[0.05em] font-sans mb-1">
            Available Balance
          </p>
          <p className="text-xl font-semibold text-foreground font-heading">
            {formatCurrency(wallet.balance)}
          </p>
        </>
      )}

      {/* ── DEBT ── */}
      {isDebt && (
        <>
          {/* Labels */}
          <div className="flex items-center justify-between mb-1">
            <span className="uppercase text-[11px] font-semibold text-muted-foreground tracking-[0.05em] font-sans">
              Outstanding
            </span>
            <span className="uppercase text-[11px] font-semibold text-muted-foreground tracking-[0.05em] font-sans">
              Remaining
            </span>
          </div>

          {/* Values */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xl font-semibold text-destructive font-heading">
              {formatCurrency(outstanding)}
            </span>
            <span className="text-xl font-semibold text-foreground font-heading">
              {formatCurrency(remaining)}
            </span>
          </div>

          {/* Utilization bar */}
          <div className="h-1 bg-border rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${utilBarClass(utilization)}`}
              style={{ width: `${utilization}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs text-muted-foreground font-sans">Utilization</span>
            <span className={`text-xs font-semibold font-mono ${utilTextClass(utilization)}`}>
              {utilization}%
            </span>
          </div>
        </>
      )}

      {/* ── Sparkline (asset wallets only, both variants) ── */}
      {!isDebt && (
        <div className="mt-3.5 border-t border-border pt-3.5 -mx-4 -mb-4">
          <WalletSparkline walletId={wallet.id} isDebt={false} />
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center"
          onClick={() => { if (!isDeleting) setShowDeleteModal(false); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-lg p-5 max-w-[360px] w-full mx-4"
          >
            <h3 className="text-[15px] font-semibold text-foreground font-heading mb-2">
              Delete wallet?
            </h3>
            <p className="text-[13px] text-muted-foreground font-sans mb-5 leading-normal">
              {wallet.name} will be permanently deleted. Linked transaction history will not be removed.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => { if (!isDeleting) setShowDeleteModal(false); }}
                className="border border-border text-muted-foreground px-3.5 py-[7px] rounded text-[13px] font-sans cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground font-medium px-3.5 py-[7px] rounded text-[13px] font-sans disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
