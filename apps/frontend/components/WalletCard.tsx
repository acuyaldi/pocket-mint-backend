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
import type { Wallet } from "@/src/types/wallet";
import { WalletSparkline } from "@/components/dashboard/WalletSparkline";
import { useDeleteWallet } from "@/src/features/wallets/hooks/useWallets";

// ── Constants ──────────────────────────────────────────────────────────────────

const ASSET_TYPES = ["CASH", "BANK", "E_WALLET"];
const DEBT_TYPES = ["CREDIT_CARD", "LOAN_PAYLATER"];

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

function isDebtWallet(type: string): boolean {
  return DEBT_TYPES.includes(type);
}

function getUtilizationColor(pct: number): string {
  if (pct >= 80) return "#EF4444";
  if (pct >= 30) return "#F59E0B";
  return "#10B981";
}

// ── Component ──────────────────────────────────────────────────────────────────

export function WalletCard({ wallet, variant = "full", onEdit }: WalletCardProps) {
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
  const utilColor = getUtilizationColor(utilization);

  const iconBg = isDebt ? "rgba(239,68,68,0.1)" : "rgba(56,189,248,0.1)";
  const iconColor = isDebt ? "#EF4444" : "#38BDF8";

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
      console.error("Gagal menghapus wallet:", err);
    } finally {
      setIsDeleting(false);
    }
  }, [wallet.id, deleteWallet]);

  return (
    <div
      style={{
        background: "#1E293B",
        border: "1px solid #334155",
        borderRadius: "8px",
        padding: "16px",
        position: "relative",
      }}
    >
      {/* ── Top row: icon + name + kebab ── */}
      <div className="flex items-center gap-2" style={{ marginBottom: "12px" }}>
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            backgroundColor: iconBg,
            border: "1px solid #334155",
          }}
        >
          <Icon className="size-4" style={{ color: iconColor }} />
        </div>
        <span
          style={{
            fontFamily: "var(--font-inter)",
            fontSize: "14px",
            fontWeight: 500,
            color: "#F8FAFC",
          }}
        >
          {wallet.name}
        </span>
        <span
          style={{
            fontFamily: "var(--font-inter)",
            fontSize: "12px",
            color: "#94A3B8",
            marginLeft: "auto",
          }}
        >
          {typeLabel}
        </span>

        {/* Kebab menu button */}
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center justify-center transition-colors"
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              color: "#64748B",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#334155";
              e.currentTarget.style.color = "#F8FAFC";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "#64748B";
            }}
          >
            <MoreVertical className="size-4" />
          </button>

          {/* Dropdown menu */}
          {showMenu && (
            <div
              style={{
                position: "absolute",
                top: "32px",
                right: "0",
                width: "130px",
                backgroundColor: "#334155",
                border: "1px solid #475569",
                borderRadius: "8px",
                zIndex: 50,
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => {
                  setShowMenu(false);
                  onEdit?.(wallet);
                }}
                className="flex items-center gap-2 w-full transition-colors"
                style={{
                  padding: "9px 14px",
                  fontSize: "13px",
                  color: "#F8FAFC",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-inter)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#475569")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <Pencil className="size-3.5" />
                Edit wallet
              </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                  setShowDeleteModal(true);
                }}
                className="flex items-center gap-2 w-full transition-colors"
                style={{
                  padding: "9px 14px",
                  fontSize: "13px",
                  color: "#EF4444",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-inter)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#475569")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <Trash2 className="size-3.5" />
                Hapus wallet
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── ASSET ── */}
      {!isDebt && (
        <>
          <p
            className="uppercase"
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#64748B",
              letterSpacing: "0.05em",
              fontFamily: "var(--font-inter)",
              marginBottom: "4px",
            }}
          >
            Available Balance
          </p>
          <p
            style={{
              fontFamily: "var(--font-hanken)",
              fontSize: "20px",
              fontWeight: 600,
              color: "#F8FAFC",
            }}
          >
            {formatCurrency(wallet.balance)}
          </p>
        </>
      )}

      {/* ── DEBT ── */}
      {isDebt && (
        <>
          {/* Labels */}
          <div
            className="flex items-center justify-between"
            style={{ marginBottom: "4px" }}
          >
            <span
              className="uppercase"
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#64748B",
                letterSpacing: "0.05em",
                fontFamily: "var(--font-inter)",
              }}
            >
              Outstanding
            </span>
            <span
              className="uppercase"
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#64748B",
                letterSpacing: "0.05em",
                fontFamily: "var(--font-inter)",
              }}
            >
              Remaining
            </span>
          </div>

          {/* Values */}
          <div
            className="flex items-center justify-between"
            style={{ marginBottom: "12px" }}
          >
            <span
              style={{
                fontFamily: "var(--font-hanken)",
                fontSize: "20px",
                fontWeight: 600,
                color: "#EF4444",
              }}
            >
              {formatCurrency(outstanding)}
            </span>
            <span
              style={{
                fontFamily: "var(--font-hanken)",
                fontSize: "20px",
                fontWeight: 600,
                color: "#F8FAFC",
              }}
            >
              {formatCurrency(remaining)}
            </span>
          </div>

          {/* Utilization bar */}
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
                height: "100%",
                borderRadius: "9999px",
                backgroundColor: utilColor,
                width: `${utilization}%`,
                transition: "width 0.6s ease",
              }}
            />
          </div>
          <div
            className="flex items-center justify-between"
            style={{ marginTop: "6px" }}
          >
            <span
              style={{
                fontFamily: "var(--font-inter)",
                fontSize: "12px",
                color: "#94A3B8",
              }}
            >
              Utilization
            </span>
            <span
              style={{
                fontFamily: "var(--font-inter)",
                fontSize: "12px",
                fontWeight: 600,
                color: utilColor,
              }}
            >
              {utilization}%
            </span>
          </div>
        </>
      )}

      {/* ── Sparkline (asset wallets only, both variants) ── */}
      {!isDebt && (
        <div style={{ marginTop: "14px", borderTop: "1px solid #334155", paddingTop: "14px", marginLeft: "-16px", marginRight: "-16px", marginBottom: "-16px" }}>
          <WalletSparkline walletId={wallet.id} isDebt={false} />
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => { if (!isDeleting) setShowDeleteModal(false); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#1E293B",
              border: "1px solid #334155",
              borderRadius: "8px",
              padding: "20px",
              maxWidth: "360px",
              width: "100%",
              margin: "0 16px",
            }}
          >
            <h3
              style={{
                fontSize: "15px",
                fontWeight: 600,
                color: "#F8FAFC",
                fontFamily: "var(--font-hanken)",
                marginBottom: "8px",
              }}
            >
              Hapus wallet?
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "#94A3B8",
                lineHeight: 1.5,
                fontFamily: "var(--font-inter)",
                marginBottom: "20px",
              }}
            >
              {wallet.name} akan dihapus permanen. Riwayat transaksi yang terhubung tidak akan ikut terhapus.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => { if (!isDeleting) setShowDeleteModal(false); }}
                style={{
                  border: "1px solid #334155",
                  color: "#94A3B8",
                  backgroundColor: "transparent",
                  padding: "7px 14px",
                  borderRadius: "4px",
                  fontSize: "13px",
                  fontFamily: "var(--font-inter)",
                  cursor: "pointer",
                }}
              >
                Batal
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                style={{
                  backgroundColor: "#EF4444",
                  color: "white",
                  fontWeight: 500,
                  padding: "7px 14px",
                  borderRadius: "4px",
                  fontSize: "13px",
                  fontFamily: "var(--font-inter)",
                  border: "none",
                  cursor: isDeleting ? "not-allowed" : "pointer",
                  opacity: isDeleting ? 0.7 : 1,
                }}
              >
                {isDeleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
