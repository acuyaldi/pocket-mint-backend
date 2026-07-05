"use client";

import { useState, useCallback, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Loader2, ArrowDownLeft, ArrowUpRight, ArrowLeftRight,
  CreditCard, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { isDebtWallet, type Wallet } from "@/src/types/wallet";
import { usePaylaterRates } from "@/src/features/installments/hooks/useInstallments";
import { formatRupiah } from "./constants";

type TxType = "EXPENSE" | "INCOME" | "TRANSFER";

const EXPENSE_CATS = [
  "Food & Dining", "Transport", "Shopping", "Entertainment",
  "Bills & Utilities", "Health", "Education", "Travel", "Personal Care", "Other",
];
const INCOME_CATS = ["Salary", "Freelance", "Business", "Investment", "Gift", "Other"];

const TENORS = [3, 6, 12]; // keep in sync with backend VALID_TENORS

/** How much this wallet can still spend: assets use balance, debt wallets use remaining credit. */
const spendable = (w: Wallet) =>
  isDebtWallet(w.type) ? Math.max((w.creditLimit ?? 0) - Math.abs(w.balance), 0) : w.balance;

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
  installmentMonths?: number;
  interestRate?: number;
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
  isDisabled,
  onSelect,
}: {
  wallets: Wallet[];
  selected: string;
  exclude?: string;
  isDisabled?: (w: Wallet) => boolean;
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
        const disabled = isDisabled?.(w) ?? false;
        return (
          <button
            key={w.id}
            type="button"
            disabled={disabled}
            title={disabled ? "Dana tidak cukup" : undefined}
            onClick={() => onSelect(active ? "" : w.id)}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-150 cursor-pointer truncate max-w-[120px] disabled:opacity-40 disabled:cursor-not-allowed"
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
  const [installmentMonths, setInstallmentMonths] = useState(3);
  const [interestRate, setInterestRate] = useState(""); // % flat per bulan
  const [adminFee, setAdminFee] = useState(""); // % dari pokok, sekali bayar (belum dikirim ke backend)
  const [error, setError] = useState("");

  const { data: paylaterRates } = usePaylaterRates();

  const activeOpt = TYPE_OPTIONS.find((o) => o.type === type)!;

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(formatRupiah(e.target.value.replace(/\D/g, "")));
  }, []);

  const handleTypeChange = useCallback((t: TxType) => {
    setType(t);
    setCategory("");
    if (t !== "TRANSFER") setToWalletId("");
    if (t !== "EXPENSE") setIsInstallment(false);
  }, []);

  const handleClose = useCallback(() => {
    if (!isCreating) onClose();
  }, [isCreating, onClose]);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const parsed = Number(amount.replace(/\./g, ""));
    if (isNaN(parsed) || parsed <= 0) return;
    const srcWallet = wallets.find((x) => x.id === walletId);
    if (isInstallment && (!srcWallet || !isDebtWallet(srcWallet.type))) {
      setError("Pilih wallet Credit Card / Paylater untuk cicilan.");
      return;
    }
    if (type === "TRANSFER" && srcWallet && isDebtWallet(srcWallet.type)) {
      setError("Transfer tidak bisa dari wallet paylater / kartu kredit.");
      return;
    }
    if (srcWallet && type !== "INCOME") {
      const rate = Number(interestRate.replace(",", ".")) || 0;
      const need = isInstallment
        ? parsed + Math.round(parsed * (rate / 100) * installmentMonths)
        : parsed;
      if (spendable(srcWallet) < need) {
        setError(`Dana di ${srcWallet.name} tidak cukup.`);
        return;
      }
    }
    try {
      await onSubmit({
        description: description.trim(),
        amount: parsed,
        type,
        date: new Date(date).toISOString(),
        walletId: walletId || undefined,
        toWalletId: type === "TRANSFER" ? (toWalletId || undefined) : undefined,
        isInstallment: isInstallment || undefined,
        installmentMonths: isInstallment ? installmentMonths : undefined,
        interestRate: isInstallment ? Number(interestRate.replace(",", ".")) || 0 : undefined,
      });
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      setError(msg ?? "Gagal menyimpan transaksi. Coba lagi.");
      return;
    }
    setAmount("");
    setType("EXPENSE");
    setWalletId("");
    setToWalletId("");
    setCategory("");
    setDescription("");
    setDate(todayStr());
    setIsInstallment(false);
    setInstallmentMonths(3);
    setInterestRate("");
    setAdminFee("");
  }, [amount, description, type, date, walletId, toWalletId, isInstallment, installmentMonths, interestRate, wallets, onSubmit]);

  const cats = type === "INCOME" ? INCOME_CATS : type === "EXPENSE" ? EXPENSE_CATS : [];

  // Installment preview (mirrors backend rounding in transaction.controller.ts)
  const selectedWallet = wallets.find((w) => w.id === walletId);
  const principal = Number(amount.replace(/\./g, "")) || 0;
  const rateNum = Number(interestRate.replace(",", ".")) || 0;
  const adminFeeNum = Number(adminFee.replace(",", ".")) || 0;
  const totalInterest = Math.round(principal * (rateNum / 100) * installmentMonths);
  const monthlyEst = Math.round((principal + totalInterest) / installmentMonths);
  const adminRp = Math.round(principal * (adminFeeNum / 100));

  // Wallet eligibility: type rules hide the wallet, insufficient funds disable it
  const sourceWallets =
    type === "TRANSFER"
      ? wallets.filter((w) => !isDebtWallet(w.type)) // paylater/CC can't move funds out
      : isInstallment
        ? wallets.filter((w) => isDebtWallet(w.type)) // cicilan only on credit products
        : wallets;
  const requiredFunds = isInstallment ? principal + totalInterest : principal; // backend locks the grand total
  const lacksFunds = (w: Wallet) =>
    type !== "INCOME" && principal > 0 && spendable(w) < requiredFunds;
  const matchedPreset =
    isInstallment && selectedWallet
      ? paylaterRates?.find((p) => selectedWallet.name.toLowerCase().includes(p.match))
      : undefined;

  // Auto-fill bunga & admin from the selected paylater wallet:
  // wallet's own stored rates win; fall back to name-matched provider presets
  useEffect(() => {
    if (!isInstallment) return;
    const w = wallets.find((x) => x.id === walletId);
    if (!w || !isDebtWallet(w.type)) return;
    if (w.interestRate > 0 || (w.adminFee ?? 0) > 0) {
      setInterestRate(String(w.interestRate));
      // Modal's admin field is % of principal; FLAT (Rp) fees can't be expressed here
      setAdminFee(w.adminFeeType === "PERCENT" ? String(w.adminFee ?? 0) : "");
      return;
    }
    const p = paylaterRates?.find((pr) => w.name.toLowerCase().includes(pr.match));
    setInterestRate(p ? String(p.rate) : "");
    setAdminFee(p ? String(p.adminFee) : "");
  }, [isInstallment, walletId, wallets, paylaterRates]);

  // Drop a selected wallet the current type/installment/amount no longer allows
  useEffect(() => {
    const w = wallets.find((x) => x.id === walletId);
    if (w && (!sourceWallets.includes(w) || lacksFunds(w))) setWalletId("");
  });

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
                        fontSize: amount.length > 11 ? "28px" : amount.length > 7 ? "36px" : "48px",
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
                        <WalletPills wallets={sourceWallets} selected={walletId} exclude={toWalletId} isDisabled={lacksFunds} onSelect={setWalletId} />
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
                        <WalletPills wallets={sourceWallets} selected={walletId} isDisabled={lacksFunds} onSelect={setWalletId} />
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

                  {/* Installment toggle — backend only allows installments on EXPENSE */}
                  {type === "EXPENSE" && (
                  <div
                    className="rounded-xl"
                    style={{ backgroundColor: "#0a0a0a", border: "1px solid #1a1a1a" }}
                  >
                    <div className="flex items-center justify-between px-3 py-2.5">
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

                    {isInstallment && (
                      <div className="px-3 pb-3 space-y-3">
                        {/* Tenor */}
                        <div>
                          <p
                            className="text-[10px] font-semibold tracking-[0.15em] mb-2"
                            style={{ color: "#bccabb", fontFamily: "var(--font-inter)" }}
                          >
                            TENOR
                          </p>
                          <div className="flex gap-1.5">
                            {TENORS.map((m) => {
                              const active = installmentMonths === m;
                              return (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setInstallmentMonths(m)}
                                  className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 cursor-pointer"
                                  style={
                                    active
                                      ? { backgroundColor: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.4)", color: "#4ade80" }
                                      : { backgroundColor: "#1c1b1b", border: "1px solid #262626", color: "#bccabb" }
                                  }
                                >
                                  {m} bln
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Rate + admin fee (manual override) */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p
                              className="text-[10px] font-semibold tracking-[0.15em] mb-2"
                              style={{ color: "#bccabb", fontFamily: "var(--font-inter)" }}
                            >
                              BUNGA % / BLN
                            </p>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0"
                              value={interestRate}
                              onChange={(e) => setInterestRate(e.target.value.replace(/[^\d.,]/g, ""))}
                              className="h-9 text-sm"
                              style={{ backgroundColor: "#0a0a0a", border: "1px solid #262626", color: "#e5e2e1" }}
                            />
                          </div>
                          <div>
                            <p
                              className="text-[10px] font-semibold tracking-[0.15em] mb-2"
                              style={{ color: "#bccabb", fontFamily: "var(--font-inter)" }}
                            >
                              BIAYA ADMIN %
                            </p>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0"
                              value={adminFee}
                              onChange={(e) => setAdminFee(e.target.value.replace(/[^\d.,]/g, ""))}
                              className="h-9 text-sm"
                              style={{ backgroundColor: "#0a0a0a", border: "1px solid #262626", color: "#e5e2e1" }}
                            />
                          </div>
                        </div>

                        {matchedPreset && (
                          <p className="text-[11px]" style={{ color: "#3d4a3e" }}>
                            Bunga & biaya admin otomatis dari {selectedWallet!.name} — bisa diubah manual.
                          </p>
                        )}

                        {/* Monthly estimate */}
                        {principal > 0 && (
                          <p className="text-[11px]" style={{ color: "#bccabb" }}>
                            ≈{" "}
                            <span style={{ color: "#4ade80", fontWeight: 600 }}>
                              Rp {formatRupiah(String(monthlyEst))}/bln
                            </span>{" "}
                            × {installmentMonths} bulan
                            {adminRp > 0 && <> + admin Rp {formatRupiah(String(adminRp))} (sekali bayar)</>}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  )}
                </div>

                {error && (
                  <p className="px-5 pb-3 text-xs" style={{ color: "#ffb4ab" }}>{error}</p>
                )}

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
