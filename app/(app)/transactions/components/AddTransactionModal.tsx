"use client";

import { useState, useCallback, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Loader2, ArrowDownLeft, ArrowUpRight, ArrowLeftRight,
  CreditCard, RefreshCw, HandCoins, Wallet as WalletIcon, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { isDebtWallet, type Wallet } from "@/src/types/wallet";
import { usePaylaterRates } from "@/src/features/installments/hooks/useInstallments";
import { formatRupiah } from "./constants";

type TxType = "EXPENSE" | "INCOME" | "TRANSFER";
/** UI tab — PAY_DEBT submits as a TRANSFER into a debt wallet (backend treats it as repayment) */
type Tab = TxType | "PAY_DEBT";

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
  { type: "EXPENSE" as Tab, label: "EXPENSE", Icon: ArrowDownLeft, color: "var(--color-destructive)", bg: "rgba(186,26,26,0.08)" },
  { type: "INCOME"  as Tab, label: "INCOME",  Icon: ArrowUpRight,  color: "var(--color-primary)", bg: "rgba(0,109,54,0.08)"  },
  { type: "TRANSFER"as Tab, label: "TRANSFER",Icon: ArrowLeftRight,color: "var(--color-foreground)", bg: "rgba(11,28,48,0.06)" },
  { type: "PAY_DEBT"as Tab, label: "PAY DEBT",Icon: HandCoins,     color: "var(--color-secondary)", bg: "rgba(84,95,115,0.10)" },
];

function getInstallmentDefaults(
  wallet: Wallet | undefined,
  paylaterRates: Array<{ match: string; rate: number; adminFee: number }> | undefined,
) {
  if (!wallet || !isDebtWallet(wallet.type)) {
    return { interestRate: "", adminFee: "" };
  }
  if (wallet.interestRate > 0 || (wallet.adminFee ?? 0) > 0) {
    return {
      interestRate: String(wallet.interestRate),
      // Modal's admin field is % of principal; FLAT (Rp) fees can't be expressed here
      adminFee: wallet.adminFeeType === "PERCENT" ? String(wallet.adminFee ?? 0) : "",
    };
  }

  const preset = paylaterRates?.find((item) => wallet.name.toLowerCase().includes(item.match));
  return {
    interestRate: preset ? String(preset.rate) : "",
    adminFee: preset ? String(preset.adminFee) : "",
  };
}

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
  disabledTitle = "Insufficient funds",
  onSelect,
}: {
  wallets: Wallet[];
  selected: string;
  exclude?: string;
  isDisabled?: (w: Wallet) => boolean;
  disabledTitle?: string;
  onSelect: (id: string) => void;
}) {
  const available = wallets.filter((w) => w.id !== exclude);
  if (available.length === 0) {
    return <p className="text-xs py-1" style={{ color: "var(--color-muted-foreground)" }}>No wallets available</p>;
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
            title={disabled ? disabledTitle : undefined}
            onClick={() => onSelect(active ? "" : w.id)}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 max-w-[140px]"
            style={
              active
                ? { backgroundColor: "rgba(0,109,54,0.08)", border: "1px solid rgba(0,109,54,0.3)", color: "var(--color-primary)" }
                : { backgroundColor: "var(--color-muted)", border: "1px solid var(--color-border)", color: "var(--color-muted-foreground)" }
            }
          >
            <span className="truncate">{w.name}</span>
            {isDebtWallet(w.type) && (
              <span className="text-[8px] font-bold tracking-[0.1em] flex-shrink-0" style={{ color: "var(--color-destructive)" }}>
                DEBT
              </span>
            )}
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
  const [type, setType] = useState<Tab>("EXPENSE");
  const [walletId, setWalletId] = useState("");
  const [toWalletId, setToWalletId] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayStr);
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentMonths, setInstallmentMonths] = useState(3);
  const [interestRateOverride, setInterestRateOverride] = useState<string | null>(null); // % flat per bulan
  const [adminFeeOverride, setAdminFeeOverride] = useState<string | null>(null); // % dari pokok, sekali bayar (belum dikirim ke backend)
  const [error, setError] = useState("");

  const router = useRouter();
  const { data: paylaterRates } = usePaylaterRates();

  // No wallets yet → block transaction creation and offer a redirect to /wallets
  const hasNoWallets = wallets.length === 0;

  const activeOpt = TYPE_OPTIONS.find((o) => o.type === type)!;
  const selectedWallet = wallets.find((w) => w.id === walletId);
  const installmentDefaults = getInstallmentDefaults(selectedWallet, paylaterRates);
  const interestRate = interestRateOverride ?? installmentDefaults.interestRate;
  const adminFee = adminFeeOverride ?? installmentDefaults.adminFee;

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(formatRupiah(e.target.value.replace(/\D/g, "")));
  }, []);

  // Tab switch resets everything that depends on the tab; amount/description/date survive
  const handleTypeChange = useCallback((t: Tab) => {
    setType(t);
    setWalletId("");
    setToWalletId("");
    setCategory("");
    setIsInstallment(false);
    setInstallmentMonths(3);
    setInterestRateOverride(null);
    setAdminFeeOverride(null);
    setError("");
  }, []);

  const handleClose = useCallback(() => {
    if (!isCreating) onClose();
  }, [isCreating, onClose]);

  // Close the modal, then send the user to the Wallets page to create one
  const handleAddWallet = useCallback(() => {
    onClose();
    router.push("/wallets");
  }, [onClose, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const parsed = Number(amount.replace(/\./g, ""));
    if (isNaN(parsed) || parsed <= 0) return;
    const srcWallet = wallets.find((x) => x.id === walletId);
    const destWallet = wallets.find((x) => x.id === toWalletId);
    const isTransferLike = type === "TRANSFER" || type === "PAY_DEBT";
    // Toggle can go stale if the user re-picks an asset wallet; treat that as a plain expense
    const asInstallment = isInstallment && !!srcWallet && isDebtWallet(srcWallet.type);
    if (isTransferLike && srcWallet && isDebtWallet(srcWallet.type)) {
      setError("Transfers can't be made from a paylater / credit card wallet.");
      return;
    }
    if (type === "INCOME" && srcWallet && isDebtWallet(srcWallet.type)) {
      setError("Income can't be added to a paylater / credit card wallet.");
      return;
    }
    if (type === "PAY_DEBT") {
      if (!srcWallet || !destWallet) {
        setError("Select a source wallet and the debt to pay.");
        return;
      }
      const outstanding = Math.abs(destWallet.balance);
      if (parsed > outstanding) {
        setError(`Exceeds outstanding debt — Rp ${formatRupiah(String(outstanding))} remaining.`);
        return;
      }
    }
    if (srcWallet && type !== "INCOME") {
      const rate = Number(interestRate.replace(",", ".")) || 0;
      const need = asInstallment
        ? parsed + Math.round(parsed * (rate / 100) * installmentMonths)
        : parsed;
      if (spendable(srcWallet) < need) {
        setError(`Insufficient funds in ${srcWallet.name}.`);
        return;
      }
    }
    try {
      await onSubmit({
        description: description.trim() ||
          (type === "PAY_DEBT" && destWallet ? `Debt payment — ${destWallet.name}` : ""),
        amount: parsed,
        type: type === "PAY_DEBT" ? "TRANSFER" : type,
        date: new Date(date).toISOString(),
        walletId: walletId || undefined,
        toWalletId: isTransferLike ? (toWalletId || undefined) : undefined,
        isInstallment: asInstallment || undefined,
        installmentMonths: asInstallment ? installmentMonths : undefined,
        interestRate: asInstallment ? Number(interestRate.replace(",", ".")) || 0 : undefined,
      });
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      setError(msg ?? "Failed to save transaction. Please try again.");
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
    setInterestRateOverride(null);
    setAdminFeeOverride(null);
  };

  const cats = type === "INCOME" ? INCOME_CATS : type === "EXPENSE" ? EXPENSE_CATS : [];

  // Installment preview (mirrors backend rounding in transaction.controller.ts)
  const principal = Number(amount.replace(/\./g, "")) || 0;
  const rateNum = Number(interestRate.replace(",", ".")) || 0;
  const adminFeeNum = Number(adminFee.replace(",", ".")) || 0;
  const totalInterest = Math.round(principal * (rateNum / 100) * installmentMonths);
  const monthlyEst = Math.round((principal + totalInterest) / installmentMonths);
  const adminRp = Math.round(principal * (adminFeeNum / 100));

  // Wallet eligibility: type rules hide the wallet, insufficient funds disable it
  const sourceWallets =
    type === "TRANSFER" || type === "INCOME"
      ? wallets.filter((w) => !isDebtWallet(w.type)) // paylater/CC can't move funds out or receive income
      : type === "PAY_DEBT"
        ? wallets.filter((w) => w.type === "BANK" || w.type === "CASH") // e-wallet can't pay CC/paylater bills
        : wallets;
  const destWallets =
    type === "PAY_DEBT"
      ? wallets.filter((w) => isDebtWallet(w.type)) // bills to pay
      : wallets.filter((w) => !isDebtWallet(w.type)); // plain transfer moves money between assets
  const destWallet = wallets.find((w) => w.id === toWalletId);
  // Backend locks the grand total for installments; asset pills only ever need the principal
  const lacksFunds = (w: Wallet) =>
    type !== "INCOME" && principal > 0 &&
    spendable(w) < (isInstallment && isDebtWallet(w.type) ? principal + totalInterest : principal);
  const matchedPreset =
    isInstallment && selectedWallet
      ? paylaterRates?.find((p) => selectedWallet.name.toLowerCase().includes(p.match))
      : undefined;

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
            style={{ backgroundColor: "var(--color-card)", border: "1px solid rgba(188,202,187,0.4)" }}
          >
            <div className="overflow-y-auto" style={{ maxHeight: "90vh" }}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="size-5" style={{ color: "var(--color-primary)" }} />
                  <h3
                    className="text-base font-semibold"
                    style={{ color: "var(--color-foreground)", fontFamily: "var(--font-hanken)" }}
                  >
                    New Transaction
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="size-7 flex items-center justify-center rounded-md transition-colors cursor-pointer hover:bg-white/5"
                  style={{ color: "var(--color-muted-foreground)" }}
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Amount */}
                <div className="px-5 pb-5 text-center">
                  <p
                    className="text-[10px] font-semibold tracking-[0.2em] mb-3"
                    style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-inter)" }}
                  >
                    TRANSACTION AMOUNT
                  </p>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-2xl font-light pb-1" style={{ color: "var(--color-muted-foreground)" }}>Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={amount}
                      onChange={handleAmountChange}
                      required
                      className="bg-transparent outline-none text-center w-full max-w-[220px]"
                      style={{
                        color: "var(--color-foreground)",
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
                    style={{ border: "1px solid var(--color-border)", backgroundColor: "var(--color-input)" }}
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
                              : { color: "var(--color-muted-foreground)" }
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
                  {/* Wallet selector — or an empty-state redirect when the user has no wallets */}
                  {hasNoWallets ? (
                    <div
                      className="rounded-xl px-4 py-5 flex flex-col items-center text-center gap-3"
                      style={{ backgroundColor: "var(--color-input)", border: "1px solid var(--color-border)" }}
                    >
                      <div
                        className="size-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "rgba(0,109,54,0.06)" }}
                      >
                        <WalletIcon className="size-5" style={{ color: "var(--color-primary)" }} />
                      </div>
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: "var(--color-foreground)", fontFamily: "var(--font-inter)" }}
                        >
                          No wallets yet
                        </p>
                        <p className="text-xs mt-1" style={{ color: "var(--color-muted-foreground)" }}>
                          Create a wallet first before logging a transaction.
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={handleAddWallet}
                        className="h-9 px-4 text-sm font-semibold gap-2 cursor-pointer"
                        style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-foreground)" }}
                      >
                        <Plus className="size-4" />
                        Add Wallet
                      </Button>
                    </div>
                  ) : type === "TRANSFER" || type === "PAY_DEBT" ? (
                    <>
                      <div>
                        <p
                          className="text-[10px] font-semibold tracking-[0.15em] mb-2"
                          style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-inter)" }}
                        >
                          {type === "PAY_DEBT" ? "PAY FROM" : "WALLET / SOURCE"}
                        </p>
                        <WalletPills wallets={sourceWallets} selected={walletId} exclude={toWalletId} isDisabled={lacksFunds} onSelect={setWalletId} />
                      </div>
                      <div>
                        <p
                          className="text-[10px] font-semibold tracking-[0.15em] mb-2"
                          style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-inter)" }}
                        >
                          {type === "PAY_DEBT" ? "DEBT TO PAY" : "WALLET / DESTINATION"}
                        </p>
                        <WalletPills
                          wallets={destWallets}
                          selected={toWalletId}
                          exclude={walletId}
                          isDisabled={type === "PAY_DEBT" ? (w) => Math.abs(w.balance) === 0 : undefined}
                          disabledTitle="No outstanding debt"
                          onSelect={setToWalletId}
                        />
                        {type === "PAY_DEBT" && destWallet && (
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[11px]" style={{ color: "var(--color-muted-foreground)" }}>
                              Outstanding:{" "}
                              <span style={{ color: "var(--color-destructive)", fontWeight: 600 }}>
                                Rp {formatRupiah(String(Math.abs(destWallet.balance)))}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setAmount(formatRupiah(String(Math.abs(destWallet.balance))))}
                              className="px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer"
                              style={{ backgroundColor: "rgba(0,109,54,0.08)", border: "1px solid rgba(0,109,54,0.3)", color: "var(--color-primary)" }}
                            >
                              Pay in full
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p
                          className="text-[10px] font-semibold tracking-[0.15em] mb-2"
                          style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-inter)" }}
                        >
                          WALLET / SOURCE
                        </p>
                        <WalletPills
                          wallets={sourceWallets}
                          selected={walletId}
                          isDisabled={lacksFunds}
                          onSelect={(id) => {
                            setWalletId(id);
                            setInterestRateOverride(null);
                            setAdminFeeOverride(null);
                          }}
                        />
                      </div>
                      {cats.length > 0 && (
                        <div>
                          <p
                            className="text-[10px] font-semibold tracking-[0.15em] mb-2"
                            style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-inter)" }}
                          >
                            CATEGORY
                          </p>
                          <div className="relative">
                            <select
                              value={category}
                              onChange={(e) => setCategory(e.target.value)}
                              className="w-full px-2.5 pr-7 rounded-lg text-[11px] appearance-none cursor-pointer outline-none"
                              style={{
                                backgroundColor: "var(--color-muted)",
                                border: "1px solid var(--color-border)",
                                color: category ? "var(--color-foreground)" : "var(--color-muted-foreground)",
                                height: "30px",
                              }}
                            >
                              <option value="" style={{ backgroundColor: "var(--color-card)", color: "var(--color-muted-foreground)" }}>Select...</option>
                              {cats.map((c) => (
                                <option key={c} value={c} style={{ backgroundColor: "var(--color-card)", color: "var(--color-foreground)" }}>{c}</option>
                              ))}
                            </select>
                            <svg
                              className="absolute right-2 top-1/2 -translate-y-1/2 size-3 pointer-events-none"
                              style={{ color: "var(--color-muted-foreground)" }}
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
                      style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-inter)" }}
                    >
                      DESCRIPTION
                    </p>
                    <Input
                      type="text"
                      placeholder="What was this for?"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="h-10 text-sm"
                      style={{ backgroundColor: "var(--color-input)", border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <p
                      className="text-[10px] font-semibold tracking-[0.15em] mb-2"
                      style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-inter)" }}
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
                        backgroundColor: "var(--color-input)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-foreground)",
                        colorScheme: "dark",
                      }}
                    />
                  </div>

                  {/* Installment toggle — EXPENSE from a debt wallet only (backend enforces both) */}
                  {type === "EXPENSE" && selectedWallet && isDebtWallet(selectedWallet.type) && (
                  <div
                    className="rounded-xl"
                    style={{ backgroundColor: "var(--color-input)", border: "1px solid rgba(188,202,187,0.4)" }}
                  >
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="size-8 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: "rgba(0,109,54,0.06)" }}
                        >
                          <RefreshCw className="size-3.5" style={{ color: "var(--color-primary)" }} />
                        </div>
                        <div>
                          <p
                            className="text-sm font-medium leading-tight"
                            style={{ color: "var(--color-foreground)", fontFamily: "var(--font-inter)" }}
                          >
                            Is this an installment?
                          </p>
                          <p
                            className="text-[10px] font-semibold tracking-[0.12em] mt-0.5"
                            style={{ color: "var(--color-muted-foreground)" }}
                          >
                            RECURRING PAYMENT PLAN
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isInstallment}
                        onClick={() => {
                          setIsInstallment((v) => !v);
                          setInterestRateOverride(null);
                          setAdminFeeOverride(null);
                        }}
                        className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0"
                        style={{ backgroundColor: isInstallment ? "var(--color-primary)" : "var(--color-border)" }}
                      >
                        <span
                          className="inline-block size-3.5 rounded-full transition-transform duration-200"
                          style={{
                            backgroundColor: isInstallment ? "var(--color-primary-foreground)" : "var(--color-muted-foreground)",
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
                            style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-inter)" }}
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
                                      ? { backgroundColor: "rgba(0,109,54,0.08)", border: "1px solid rgba(0,109,54,0.3)", color: "var(--color-primary)" }
                                      : { backgroundColor: "var(--color-muted)", border: "1px solid var(--color-border)", color: "var(--color-muted-foreground)" }
                                  }
                                >
                                  {m} mo
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
                              style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-inter)" }}
                            >
                              INTEREST % / MO
                            </p>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0"
                              value={interestRate}
                              onChange={(e) => setInterestRateOverride(e.target.value.replace(/[^\d.,]/g, ""))}
                              className="h-9 text-sm"
                              style={{ backgroundColor: "var(--color-input)", border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
                            />
                          </div>
                          <div>
                            <p
                              className="text-[10px] font-semibold tracking-[0.15em] mb-2"
                              style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-inter)" }}
                            >
                              ADMIN FEE %
                            </p>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0"
                              value={adminFee}
                              onChange={(e) => setAdminFeeOverride(e.target.value.replace(/[^\d.,]/g, ""))}
                              className="h-9 text-sm"
                              style={{ backgroundColor: "var(--color-input)", border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
                            />
                          </div>
                        </div>

                        {matchedPreset && (
                          <p className="text-[11px]" style={{ color: "var(--color-muted-foreground)" }}>
                            Interest & admin fee auto-filled from {selectedWallet!.name} — you can edit them manually.
                          </p>
                        )}

                        {/* Monthly estimate */}
                        {principal > 0 && (
                          <p className="text-[11px]" style={{ color: "var(--color-muted-foreground)" }}>
                            ≈{" "}
                            <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>
                              Rp {formatRupiah(String(monthlyEst))}/mo
                            </span>{" "}
                            × {installmentMonths} months
                            {adminRp > 0 && <> + Rp {formatRupiah(String(adminRp))} admin fee (one-time)</>}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  )}
                </div>

                {error && (
                  <p className="px-5 pb-3 text-xs" style={{ color: "var(--color-destructive)" }}>{error}</p>
                )}

                <Separator style={{ backgroundColor: "rgba(188,202,187,0.5)" }} />

                {/* Buttons */}
                <div className="flex gap-3 px-5 py-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isCreating}
                    className="flex-1 h-10 text-sm font-medium cursor-pointer"
                    style={{ backgroundColor: "var(--color-muted)", border: "1px solid var(--color-border)", color: "var(--color-muted-foreground)" }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isCreating || hasNoWallets}
                    className="flex-1 h-10 text-sm font-semibold gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-foreground)" }}
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
