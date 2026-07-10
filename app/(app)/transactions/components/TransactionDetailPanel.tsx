"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Pencil, Trash2, Receipt, MapPin } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Transaction } from "@/src/types/transaction";
import { formatDate } from "./constants";

interface TransactionDetailPanelProps {
  tx: Transaction | null;
  onClose: () => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}

export function TransactionDetailPanel({ tx, onClose, onEdit, onDelete }: TransactionDetailPanelProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <AnimatePresence>
      {tx && (
        <>
          {/* Backdrop */}
          <motion.div
            key="detail-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50"
            style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            key="detail-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed top-0 right-0 h-screen overflow-y-auto z-51 flex flex-col"
            style={{
              width: 320,
              backgroundColor: "var(--color-card)",
              borderLeft: "1px solid var(--color-border)",
              padding: 20,
            }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 15, fontWeight: 600, color: "var(--color-foreground)" }}>Transaction Details</span>
              <button
                onClick={onClose}
                className="flex items-center justify-center cursor-pointer transition-colors"
                style={{ width: 28, height: 28, borderRadius: 6, color: "var(--color-muted-foreground)" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--color-muted)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Merchant icon */}
            <div className="flex justify-center mt-5">
              <div
                className="flex items-center justify-center"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  backgroundColor: "var(--color-muted)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <Receipt className="size-7" style={{ color: "var(--color-muted-foreground)" }} />
              </div>
            </div>

            {/* Merchant name */}
            <div className="text-center mt-4" style={{ fontSize: 16, fontWeight: 500, color: "var(--color-foreground)" }}>
              {tx.description ?? "Untitled"}
            </div>

            {/* Amount */}
            <div
              className="text-center mt-2"
              style={{
                fontSize: 28,
                fontWeight: 600,
                fontFamily: "var(--font-hanken)",
                color: tx.type === "INCOME" ? "var(--color-primary)" : tx.type === "EXPENSE" ? "var(--color-destructive)" : "var(--color-secondary)",
              }}
            >
              {tx.type === "INCOME" ? "+" : tx.type === "EXPENSE" ? "-" : ""}
              {formatCurrency(tx.amount)}
            </div>

            {/* Installment badge */}
            {tx.isInstallment && (
              <div className="flex justify-center mt-3">
                <span
                  style={{
                    background: "rgba(137,80,36,0.10)",
                    color: "var(--color-warning)",
                    borderRadius: 9999,
                    padding: "4px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Installment Plan Active
                </span>
              </div>
            )}

            {/* Details list */}
            <div style={{ paddingTop: 20, borderTop: "1px solid var(--color-border)", marginTop: 20 }}>
              {/* Status */}
              <div className="flex justify-between" style={{ padding: "10px 0", borderBottom: "1px solid rgba(188,202,187,0.4)" }}>
                <span style={{ fontSize: 12, color: "var(--color-muted-foreground)", textTransform: "uppercase" }}>Status</span>
                <span className="flex items-center gap-1.5" style={{ fontSize: 13, color: "var(--color-primary)" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--color-primary)", display: "inline-block" }} />
                  Cleared
                </span>
              </div>

              {/* Date */}
              <div className="flex justify-between" style={{ padding: "10px 0", borderBottom: "1px solid rgba(188,202,187,0.4)" }}>
                <span style={{ fontSize: 12, color: "var(--color-muted-foreground)", textTransform: "uppercase" }}>Date</span>
                <span style={{ fontSize: 13, color: "var(--color-foreground)" }}>{formatDate(tx.date)}</span>
              </div>

              {/* Wallet */}
              <div className="flex justify-between" style={{ padding: "10px 0", borderBottom: "1px solid rgba(188,202,187,0.4)" }}>
                <span style={{ fontSize: 12, color: "var(--color-muted-foreground)", textTransform: "uppercase" }}>Wallet</span>
                <span style={{ fontSize: 13, color: "var(--color-foreground)" }}>{tx.wallet?.name ?? "—"}</span>
              </div>

              {/* Category */}
              <div className="flex justify-between" style={{ padding: "10px 0", borderBottom: "1px solid rgba(188,202,187,0.4)" }}>
                <span style={{ fontSize: 12, color: "var(--color-muted-foreground)", textTransform: "uppercase" }}>Category</span>
                <span style={{ fontSize: 13, color: "var(--color-foreground)" }}>{tx.category?.name ?? "—"}</span>
              </div>

              {/* Installment progress */}
              {tx.isInstallment && (
                <div className="flex justify-between" style={{ padding: "10px 0", borderBottom: "1px solid rgba(188,202,187,0.4)" }}>
                  <span style={{ fontSize: 12, color: "var(--color-muted-foreground)", textTransform: "uppercase" }}>Installment Progress</span>
                  <span style={{ fontSize: 13, color: "var(--color-foreground)" }}>
                    {tx.currentTerm ?? 0}/{tx.installmentMonths ?? "?"} months
                  </span>
                </div>
              )}
            </div>

            {/* Map placeholder */}
            <div className="mt-5">
              <div style={{ fontSize: 11, color: "var(--color-muted-foreground)", textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>
                MAP LOCATION
              </div>
              <div
                className="flex items-center justify-center"
                style={{
                  backgroundColor: "var(--color-muted)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  height: 120,
                }}
              >
                <MapPin className="size-5" style={{ color: "var(--color-muted-foreground)" }} />
              </div>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Bottom actions */}
            <div className="flex gap-2 pt-4 mt-4" style={{ borderTop: "1px solid var(--color-border)" }}>
              <button
                onClick={() => { onEdit(tx); onClose(); }}
                className="flex-1 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                style={{
                  padding: 10,
                  backgroundColor: "var(--color-accent)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 4,
                  color: "var(--color-accent-foreground)",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                <Pencil className="size-3.5" />
                Edit
              </button>
              <button
                onClick={() => onDelete(tx.id)}
                className="flex-1 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                style={{
                  padding: 10,
                  backgroundColor: "rgba(186,26,26,0.08)",
                  border: "1px solid var(--color-destructive)",
                  borderRadius: 4,
                  color: "var(--color-destructive)",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                <Trash2 className="size-3.5" />
                Delete
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
