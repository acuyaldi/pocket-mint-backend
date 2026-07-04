"use client";

import { useState, useCallback, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Loader2, ArrowDownLeft, ArrowUpRight, ArrowLeftRight,
  CreditCard, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { Wallet } from "@/src/types/wallet";
import { formatRupiah } from "./constants";

type TxType = "EXPENSE" | "INCOME" | "TRANSFER";

const EXPENSE_CATS = [
  "Food & Dining", "Transport", "Shopping", "Entertainment",
  "Bills & Utilities", "Health", "Education", "Travel", "Personal Care", "Other",
];
const INCOME_CATS = ["Salary", "Freelance", "Business", "Investment", "Gift", "Other"];

const TYPE_OPTIONS = [
  { type: "EXPENSE" as TxType, label: "EXPENSE", Icon: ArrowDownLeft, color: "#ffb4ab", bg: "rgba(255,180,171,0.12)" },
  { type: "INCOME"  as TxType, label: "INCOME",  Icon: ArrowUpRight,  color: "#4ade80", bg: "rgba(74,222,128,0.12)"  },
  { type: "TRANSFER"as TxType, label: "TRANSFER",Icon: ArrowLeftRight,color: "#e5e2e1", bg: "rgba(229,226,225,0.08)" },
];

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface AddTransactionData {
  description: string;
  amount: number;
  type: TxType;
  date: string;
  walletId?: string;
  toWalletId?: string;
  isInstallment?: boolean;
}

interface AddTransactionModalProps {
  isOpen: boolean;
  isCreating: boolean;
  wallets: Wallet[];
  onClose: () => void;
  onSubmit: (data: AddTransactionData) => Promise<void>;
}

function WalletPills({
  wallets,
  selected,
  exclude = "",
  onSelect,
}: {
  wallets: Wallet[];
  selected: string;
  exclude?: string;
  onSelect: (id: string) => void;
}) {
  const available = wallets.filter((w) => w.id !== exclude);
  if (available.length === 0) {
    return <p className="text-xs py-1" style={{ color: "#3d4a3e" }}>No wallets available</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {available.map((w) => {
        const active = selected === w.id;
        return (
          <button
            key={w.id}
            type="button"
            onClick={() => onSelect(active ? "" : w.id)}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-150 cursor-pointer truncate max-w-[120px]"
            style={
              active
                ? { backgroundColor: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.4)", color: "#4ade80" }
                : { backgroundColor: "#1c1b1b", border: "1px solid #262626", color: "#bccabb" }
            }
          >
            {w.name}
          </button>
        );
      })}
    </div>
  );
}

export function AddTransactionModal({
  isOpen, isCreating, wallets, onClose, onSubmit,
}: AddTransactionModalProps) {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TxType>("EXPENSE");
  const [walletId, setWalletId] = useState("");
  const [toWalletId, setToWalletId] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayStr);
  const [isInstallment, setIsInstallment] = useState(false);

  const activeOpt = TYPE_OPTIONS.find((o) => o.type === type)!;

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(formatRupiah(e.target.value.replace(/\D/g, "")));
  }, []);

  const handleTypeChange = useCallback((t: TxType) => {
    setType(t);
    setCategory("");
    if (t !== "TRANSFER") setToWalletId("");
  }, []);

  const handleClose = useCallback(() => {
    if (!isCreating) onClose();
  }, [isCreating, onClose]);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    const parsed = Number(amount.replace(/\./g, ""));
    if (isNaN(parsed) || parsed <= 0) return;
    await onSubmit({
      description: description.trim(),
      amount: parsed,
      type,
      date: new Date(date).toISOString(),
      walletId: walletId || undefined,
      toWalletId: type === "TRANSFER" ? (toWalletId || undefined) : undefined,
      isInstallment: isInstallment || undefined,
    });
    setAmount("");
    setType("EXPENSE");
    setWalletId("");
    setToWalletId("");
    setCategory("");
    setDescription("");
    setDate(todayStr());
    setIsInstallment(false);
  }, [amount, description, type, date, walletId, toWalletId, isInstallment, onSubmit]);

  const cats = type === "INCOME" ? INCOME_CATS : type === "EXPENSE" ? EXPENSE_CATS : [];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="add-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            key="add-modal-card"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md mx-4 rounded-2xl overflow-hidden shadow-2xl"
            style={{ backgroundColor: "#0e0e0e", border: "1px solid #1a1a1a" }}
          >
            <div className="overflow-y-auto" style={{ maxHeight: "90vh" }}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="size-5" style={{ color: "#4ade80" }} />
                  <h3
                    className="text-base font-semibold"
                    style={{ color: "#e5e2e1", fontFamily: "var(--font-hanken)" }}
                  >
                    New Transaction
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="size-7 flex items-center justify-center rounded-md transition-colors cursor-pointer hover:bg-white/5"
                  style={{ color: "#bccabb" }}
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Amount */}
                <div className="px-5 pb-5 text-center">
                  <p
                    className="text-[10px] font-semibold tracking-[0.2em] mb-3"
                    style={{ color: "#3d4a3e", fontFamily: "var(--font-inter)" }}
                  >
                    TRANSACTION AMOUNT
                  </p>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-2xl font-light pb-1" style={{ color: "#3d4a3e" }}>Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={amount}
                      onChange={handleAmountChange}
                      required
                      className="bg-transparent outline-none text-center w-full max-w-[220px]"
                      style={{
                        color: "#e5e2e1",
                        fontSize: "48px",
                        fontWeight: 700,
                        fontFamily: "var(--font-heading)",
                        caretColor: activeOpt.color,
                      }}
                    />
                  </div>
                </div>

                {/* Type tabs */}
                <div className="px-5 pb-4">
                  <div
                    className="flex rounded-lg overflow-hidden"
                    style={{ border: "1px solid #262626", backgroundColor: "#0a0a0a" }}
                  >
                    {TYPE_OPTIONS.map(({ type: t, label, Icon, color, bg }) => {
                      const active = type === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => handleTypeChange(t)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold tracking-wider transition-all duration-200 cursor-pointer"
                          style={
                            active
                              ? { backgroundColor: bg, color, borderBottom: `2px solid ${color}` }
                              : { color: "#3d4a3e" }
                          }
                        >
                          <Icon className="size-3.5" />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Form fields */}
                <div className="px-5 pb-4 space-y-4">
                  {/* Wallet selector */}
                  {type === "TRANSFER" ? (
                    <>
                      <div>
                        <p
                          className="text-[10px] font-semibold tracking-[0.15em] mb-2"
                          style={{ color: "#bccabb", fontFamily: "var(--font-inter)" }}
                        >
                          WALLET / SOURCE
                        </p>
                        <WalletPills wallets={wallets} selected={walletId} exclude={toWalletId} onSelect={setWalletId} />
                      </div>
                      <div>
                        <p
                          className="text-[10px] font-semibold tracking-[0.15em] mb-2"
                          style={{ color: "#bccabb", fontFamily: "var(--font-inter)" }}
                        >
                          WALLET / DESTINATION
                        </p>
                        <WalletPills wallets={wallets} selected={toWalletId} exclude={walletId} onSelect={setToWalletId} />
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p
                          className="text-[10px] font-semibold tracking-[0.15em] mb-2"
                          style={{ color: "#bccabb", fontFamily: "var(--font-inter)" }}
                        >
                          WALLET / SOURCE
                        </p>
                        <WalletPills wallets={wallets} selected={walletId} onSelect={setWalletId} />
                      </div>
                      {cats.length > 0 && (
                        <div>
                          <p
                            className="text-[10px] font-semibold tracking-[0.15em] mb-2"
                            style={{ color: "#bccabb", fontFamily: "var(--font-inter)" }}
                          >
                            CATEGORY
                          </p>
                          <div className="relative">
                            <select
                              value={category}
                              onChange={(e) => setCategory(e.target.value)}
                              className="w-full px-2.5 pr-7 rounded-lg text-[11px] appearance-none cursor-pointer outline-none"
                              style={{
                                backgroundColor: "#1c1b1b",
                                border: "1px solid #262626",
                                color: category ? "#e5e2e1" : "#3d4a3e",
                                height: "30px",
                              }}
                            >
                              <option value="" style={{ backgroundColor: "#0e0e0e", color: "#bccabb" }}>Select...</option>
                              {cats.map((c) => (
                                <option key={c} value={c} style={{ backgroundColor: "#0e0e0e", color: "#e5e2e1" }}>{c}</option>
                              ))}
                            </select>
                            <svg
                              className="absolute right-2 top-1/2 -translate-y-1/2 size-3 pointer-events-none"
                              style={{ color: "#3d4a3e" }}
                              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <p
                      className="text-[10px] font-semibold tracking-[0.15em] mb-2"
                      style={{ color: "#bccabb", fontFamily: "var(--font-inter)" }}
                    >
                      DESCRIPTION
                    </p>
                    <Input
                      type="text"
                      placeholder="What was this for?"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="h-10 text-sm"
                      style={{ backgroundColor: "#0a0a0a", border: "1px solid #262626", color: "#e5e2e1" }}
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <p
                      className="text-[10px] font-semibold tracking-[0.15em] mb-2"
                      style={{ color: "#bccabb", fontFamily: "var(--font-inter)" }}
                    >
                      TRANSACTION DATE
                    </p>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="w-full h-10 px-3.5 rounded-md text-sm outline-none"
                      style={{
                        backgroundColor: "#0a0a0a",
                        border: "1px solid #262626",
                        color: "#e5e2e1",
                        colorScheme: "dark",
                      }}
                    />
                  </div>

                  {/* Installment toggle */}
                  <div
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                    style={{ backgroundColor: "#0a0a0a", border: "1px solid #1a1a1a" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="size-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: "rgba(74,222,128,0.08)" }}
                      >
                        <RefreshCw className="size-3.5" style={{ color: "#4ade80" }} />
                      </div>
                      <div>
                        <p
                          className="text-sm font-medium leading-tight"
                          style={{ color: "#e5e2e1", fontFamily: "var(--font-inter)" }}
                        >
                          Is this an installment?
                        </p>
                        <p
                          className="text-[10px] font-semibold tracking-[0.12em] mt-0.5"
                          style={{ color: "#3d4a3e" }}
                        >
                          RECURRING PAYMENT PLAN
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isInstallment}
                      onClick={() => setIsInstallment((v) => !v)}
                      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0"
                      style={{ backgroundColor: isInstallment ? "#4ade80" : "#262626" }}
                    >
                      <span
                        className="inline-block size-3.5 rounded-full transition-transform duration-200"
                        style={{
                          backgroundColor: isInstallment ? "#131313" : "#3d4a3e",
                          transform: isInstallment ? "translateX(18px)" : "translateX(2px)",
                        }}
                      />
                    </button>
                  </div>
                </div>

                <Separator style={{ backgroundColor: "#1a1a1a" }} />

                {/* Buttons */}
                <div className="flex gap-3 px-5 py-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isCreating}
                    className="flex-1 h-10 text-sm font-medium cursor-pointer"
                    style={{ backgroundColor: "#1c1b1b", border: "1px solid #262626", color: "#bccabb" }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isCreating}
                    className="flex-1 h-10 text-sm font-semibold gap-2 cursor-pointer"
                    style={{ backgroundColor: "#4ade80", color: "#131313" }}
                  >
                    {isCreating ? (
                      <><Loader2 className="size-4 animate-spin" />Saving...</>
                    ) : (
                      "Save Transaction"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
