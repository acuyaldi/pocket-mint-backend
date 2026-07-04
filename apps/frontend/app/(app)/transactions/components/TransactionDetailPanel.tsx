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
              backgroundColor: "#1E293B",
              borderLeft: "1px solid #334155",
              padding: 20,
            }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 15, fontWeight: 600, color: "#F8FAFC" }}>Transaction Details</span>
              <button
                onClick={onClose}
                className="flex items-center justify-center cursor-pointer transition-colors"
                style={{ width: 28, height: 28, borderRadius: 6, color: "#94A3B8" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#334155"; }}
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
                  backgroundColor: "#0F172A",
                  border: "1px solid #334155",
                }}
              >
                <Receipt className="size-7" style={{ color: "#64748B" }} />
              </div>
            </div>

            {/* Merchant name */}
            <div className="text-center mt-4" style={{ fontSize: 16, fontWeight: 500, color: "#F8FAFC" }}>
              {tx.description ?? "Untitled"}
            </div>

            {/* Amount */}
            <div
              className="text-center mt-2"
              style={{
                fontSize: 28,
                fontWeight: 600,
                fontFamily: "var(--font-hanken)",
                color: tx.type === "INCOME" ? "#10B981" : tx.type === "EXPENSE" ? "#EF4444" : "#38BDF8",
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
                    background: "rgba(249,115,22,0.15)",
                    color: "#F97316",
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
            <div style={{ paddingTop: 20, borderTop: "1px solid #334155", marginTop: 20 }}>
              {/* Status */}
              <div className="flex justify-between" style={{ padding: "10px 0", borderBottom: "1px solid #1E293B" }}>
                <span style={{ fontSize: 12, color: "#64748B", textTransform: "uppercase" }}>Status</span>
                <span className="flex items-center gap-1.5" style={{ fontSize: 13, color: "#10B981" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#10B981", display: "inline-block" }} />
                  Cleared
                </span>
              </div>

              {/* Date */}
              <div className="flex justify-between" style={{ padding: "10px 0", borderBottom: "1px solid #1E293B" }}>
                <span style={{ fontSize: 12, color: "#64748B", textTransform: "uppercase" }}>Date</span>
                <span style={{ fontSize: 13, color: "#F8FAFC" }}>{formatDate(tx.date)}</span>
              </div>

              {/* Wallet */}
              <div className="flex justify-between" style={{ padding: "10px 0", borderBottom: "1px solid #1E293B" }}>
                <span style={{ fontSize: 12, color: "#64748B", textTransform: "uppercase" }}>Wallet</span>
                <span style={{ fontSize: 13, color: "#F8FAFC" }}>{tx.wallet?.name ?? "—"}</span>
              </div>

              {/* Category */}
              <div className="flex justify-between" style={{ padding: "10px 0", borderBottom: "1px solid #1E293B" }}>
                <span style={{ fontSize: 12, color: "#64748B", textTransform: "uppercase" }}>Category</span>
                <span style={{ fontSize: 13, color: "#F8FAFC" }}>{tx.category?.name ?? "—"}</span>
              </div>

              {/* Installment progress */}
              {tx.isInstallment && (
                <div className="flex justify-between" style={{ padding: "10px 0", borderBottom: "1px solid #1E293B" }}>
                  <span style={{ fontSize: 12, color: "#64748B", textTransform: "uppercase" }}>Installment Progress</span>
                  <span style={{ fontSize: 13, color: "#F8FAFC" }}>
                    {tx.currentTerm ?? 0}/{tx.installmentMonths ?? "?"} months
                  </span>
                </div>
              )}
            </div>

            {/* Map placeholder */}
            <div className="mt-5">
              <div style={{ fontSize: 11, color: "#64748B", textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>
                MAP LOCATION
              </div>
              <div
                className="flex items-center justify-center"
                style={{
                  backgroundColor: "#0F172A",
                  border: "1px solid #334155",
                  borderRadius: 8,
                  height: 120,
                }}
              >
                <MapPin className="size-5" style={{ color: "#64748B" }} />
              </div>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Bottom actions */}
            <div className="flex gap-2 pt-4 mt-4" style={{ borderTop: "1px solid #334155" }}>
              <button
                onClick={() => { onEdit(tx); onClose(); }}
                className="flex-1 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                style={{
                  padding: 10,
                  backgroundColor: "#334155",
                  border: "1px solid #475569",
                  borderRadius: 4,
                  color: "#F8FAFC",
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
                  backgroundColor: "rgba(239,68,68,0.1)",
                  border: "1px solid #EF4444",
                  borderRadius: 4,
                  color: "#EF4444",
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
