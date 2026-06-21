"use client";

import { useState, useCallback, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Transaction } from "@/src/types/transaction";
import { formatRupiah } from "./constants";

interface EditTransactionModalProps {
  tx: Transaction | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (data: {
    id: string;
    description: string;
    amount: number;
    type: "EXPENSE" | "INCOME";
    date?: string;
  }) => Promise<void>;
}

export function EditTransactionModal({ tx, isSaving, onClose, onSubmit }: EditTransactionModalProps) {
  const [description, setDescription] = useState(tx?.description ?? "");
  const [amount, setAmount] = useState(tx ? formatRupiah(String(tx.amount)) : "");
  const [type, setType] = useState<"EXPENSE" | "INCOME">(
    tx?.type === "INCOME" ? "INCOME" : "EXPENSE"
  );
  const [date, setDate] = useState(tx?.date ? tx.date.slice(0, 10) : "");

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    setAmount(formatRupiah(raw));
  }, []);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!tx) return;
    const rawAmount = amount.replace(/\./g, "");
    const parsedAmount = Number(rawAmount);
    if (!description.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;
    await onSubmit({
      id: tx.id,
      description: description.trim(),
      amount: parsedAmount,
      type,
      date: date ? new Date(date).toISOString() : undefined,
    });
  }, [tx, amount, description, type, date, onSubmit]);

  return (
    <AnimatePresence>
      {tx && (
        <motion.div
          key="edit-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => { if (!isSaving) onClose(); }}
        >
          <motion.div
            key="edit-modal-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md mx-4"
          >
            <Card className="border shadow-2xl" style={{ backgroundColor: "#1E293B", borderColor: "#334155" }}>
              <div className="px-6 pt-6 pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold" style={{ color: "#F8FAFC", fontFamily: "var(--font-hanken)" }}>
                      Edit Transaction
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: "#64748B", fontFamily: "var(--font-inter)" }}>
                      Update transaction details
                    </p>
                  </div>
                  <button
                    onClick={() => { if (!isSaving) onClose(); }}
                    className="size-8 flex items-center justify-center rounded-lg transition-all cursor-pointer"
                    style={{ color: "#94A3B8" }}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
              <Separator className="bg-divider/60" />
              <CardContent className="pt-4 pb-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium" style={{ color: "#94A3B8", fontFamily: "var(--font-inter)" }}>Description</label>
                    <Input
                      type="text"
                      placeholder="Transaction description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                      className="h-11"
                      style={{ backgroundColor: "#334155", border: "1px solid #334155", color: "#F8FAFC" }}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium" style={{ color: "#94A3B8", fontFamily: "var(--font-inter)" }}>Amount</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none select-none" style={{ color: "#64748B" }}>Rp</span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={amount}
                        onChange={handleAmountChange}
                        required
                        className="h-11 pl-10 pr-4"
                        style={{ backgroundColor: "#334155", border: "1px solid #334155", color: "#F8FAFC" }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium" style={{ color: "#94A3B8", fontFamily: "var(--font-inter)" }}>Type</label>
                    <div className="flex gap-2">
                      {(["EXPENSE", "INCOME"] as const).map((t) => {
                        const active = type === t;
                        const label = t === "EXPENSE" ? "Expense" : "Income";
                        const Icon = t === "EXPENSE" ? TrendingDown : TrendingUp;
                        const activeStyle = t === "EXPENSE"
                          ? { backgroundColor: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#EF4444" }
                          : { backgroundColor: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)", color: "#10B981" };
                        const inactiveStyle = { backgroundColor: "#1E293B", border: "1px solid #334155", color: "#64748B" };
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setType(t)}
                            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer"
                            style={active ? activeStyle : inactiveStyle}
                          >
                            <Icon className="size-4" />
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium" style={{ color: "#94A3B8", fontFamily: "var(--font-inter)" }}>Date</label>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-11"
                      style={{ backgroundColor: "#334155", border: "1px solid #334155", color: "#F8FAFC" }}
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { if (!isSaving) onClose(); }}
                      disabled={isSaving}
                      className="flex-1 h-11 transition-all"
                      style={{ backgroundColor: "#334155", border: "1px solid #334155", color: "#94A3B8" }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 h-11 font-medium gap-2"
                      style={{ backgroundColor: "#38BDF8", color: "#0F172A" }}
                    >
                      {isSaving ? (<><Loader2 className="size-4 animate-spin" />Saving...</>) : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
