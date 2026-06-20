"use client";

import { useState, useMemo, useCallback, FormEvent } from "react";
import { useTransactions, useCreateTransaction } from "@/src/features/transactions/hooks/useTransactions";
import { useWallets, useCreateWallet } from "@/src/features/wallets/hooks/useWallets";
import type { Wallet } from "@/src/types/wallet";
import { NetWorthHero } from "@/components/dashboard/net-worth-card";
import { WalletOverviewGrid } from "@/components/dashboard/wallet-overview-grid";
import { MonthlyPnLCard } from "@/components/dashboard/monthly-pnl-card";
import { ActiveInstallmentsWidget } from "@/components/dashboard/ActiveInstallmentsWidget";
import { RecentTransactionsCard } from "@/components/dashboard/recent-transactions-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  TrendingDown,
  Download,
  Plus,
  X,
  Loader2,
  ChevronDown,
  Palette,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PAYLATER_PRESETS } from "@/lib/constants/paylater-presets";

// ── Helpers ──────────────────────────────────────────────────────────────────────
function formatRupiah(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const ASSET_TYPES: string[] = ["CASH", "BANK", "E_WALLET"];
const DEBT_TYPES: string[] = ["CREDIT_CARD", "LOAN_PAYLATER"];

// ── Component ────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data, isLoading } = useTransactions();
  const { data: walletsData, isLoading: isLoadingWallets } = useWallets();
  const createTransaction = useCreateTransaction();
  const transactions = useMemo(() => data ?? [], [data]);
  const wallets = useMemo(() => walletsData ?? [], [walletsData]);

  // ── Modal State ──────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [txType, setTxType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentMonths, setInstallmentMonths] = useState<3 | 6 | 12>(3);

  // ── Create Wallet Modal State ──────────────────────────────────
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [walletName, setWalletName] = useState("");
  const [walletType, setWalletType] = useState<Wallet["type"]>("CASH");
  const [walletBalance, setWalletBalance] = useState("");
  const [walletCreditLimit, setWalletCreditLimit] = useState("");
  const [walletInterestRate, setWalletInterestRate] = useState("0");
  const [walletColor, setWalletColor] = useState("#10b981");
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [walletProvider, setWalletProvider] = useState<string>("custom");

  // ── Installment interest rate state ─────────────────────────────
  const [interestRate, setInterestRate] = useState<string>("0");
  const [installmentMode, setInstallmentMode] = useState<"A" | "B">("A");
  const [monthlyInput, setMonthlyInput] = useState<string>("");

  const selectedWallet = useMemo(
    () => wallets.find((w) => w.id === selectedWalletId) ?? null,
    [wallets, selectedWalletId]
  );
  const isCreditWallet = selectedWallet
    ? ["CREDIT_CARD", "LOAN_PAYLATER"].includes(selectedWallet.type)
    : false;

  // Auto-derive interest rate when a DEBT wallet is selected (avoids setState in effect)
  const effectiveInterestRate = useMemo(() => {
    if (selectedWallet && isCreditWallet && selectedWallet.interestRate !== undefined) {
      return String(selectedWallet.interestRate);
    }
    return interestRate;
  }, [selectedWallet, isCreditWallet, interestRate]);

  const resetForm = useCallback(() => {
    setDescription("");
    setAmount("");
    setTxType("EXPENSE");
    setSelectedWalletId("");
    setIsInstallment(false);
    setInstallmentMonths(3);
    setInterestRate("0");
    setInstallmentMode("A");
    setMonthlyInput("");
  }, []);

  const createWallet = useCreateWallet();

  const WALLET_COLOR_PRESETS = [
    "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4", "#f97316",
  ];

  const resetWalletForm = useCallback(() => {
    setWalletName("");
    setWalletType("CASH");
    setWalletBalance("");
    setWalletCreditLimit("");
    setWalletInterestRate("0");
    setWalletColor("#10b981");
    setWalletProvider("custom");
  }, []);

  const showCreditLimit = walletType === "CREDIT_CARD" || walletType === "LOAN_PAYLATER";

  const handleProviderChange = useCallback((value: string) => {
    setWalletProvider(value);
    const preset = PAYLATER_PRESETS.find((p) => p.value === value);
    if (preset && preset.value !== "custom") {
      setWalletInterestRate(String(preset.rate));
    } else {
      setWalletInterestRate("0");
    }
  }, []);

  const handleCreateWallet = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!walletName.trim()) return;
    setIsCreatingWallet(true);
    try {
      await createWallet.mutateAsync({
        name: walletName.trim(),
        type: walletType,
        balance: Number(walletBalance.replace(/\./g, "")) || 0,
        ...(showCreditLimit
          ? {
              creditLimit: Number(walletCreditLimit.replace(/\./g, "")) || 0,
              interestRate: Number(walletInterestRate) || 0,
            }
          : {}),
        color: walletColor,
      });
      setIsWalletModalOpen(false);
      resetWalletForm();
    } catch (err) {
      console.error("Failed to create wallet:", err);
    } finally {
      setIsCreatingWallet(false);
    }
  }, [walletName, walletType, walletBalance, walletCreditLimit, walletInterestRate, walletColor, showCreditLimit, createWallet, resetWalletForm]);

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    setAmount(formatRupiah(raw));
  }, []);

  const handleExportCSV = useCallback(() => {
    if (transactions.length === 0) {
      alert("No data to export");
      return;
    }
    const headers = ["Date", "Description", "Category", "Type", "Amount"];
    const rows = transactions.map((t) => {
      const date = new Date(t.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      const type = t.type === "INCOME" ? "Income" : "Expense";
      const category = t.categoryId ?? "-";
      return [date, `"${(t.description ?? "").replace(/"/g, '""')}"`, category, type, t.amount].join(",");
    });
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const today = new Date().toISOString().slice(0, 10);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `PocketMint_Report_${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }, [transactions]);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    const rawAmount = amount.replace(/\./g, "");
    const parsedAmount = Number(rawAmount);
    if (!description.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;
    setIsSubmitting(true);
    try {
      await createTransaction.mutateAsync({
        description: description.trim(),
        amount: parsedAmount,
        type: txType,
        date: new Date().toISOString(),
        walletId: selectedWalletId || undefined,
        ...(isCreditWallet && txType === "EXPENSE" && isInstallment
          ? {
              isInstallment: true,
              installmentMonths,
              interestRate: (() => {
                if (installmentMode === "A") {
                  const monthly = Number(monthlyInput.replace(/\./g, ""));
                  if (!isNaN(monthly) && monthly > 0 && parsedAmount > 0) {
                    const gt = monthly * installmentMonths;
                    const ti = gt - parsedAmount;
                    const rate = (ti / (parsedAmount * installmentMonths)) * 100;
                    return Math.round(rate * 100) / 100;
                  }
                  return 0;
                }
                return Number(interestRate) || 0;
              })(),
            }
          : {}),
      });
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error("Failed to save transaction:", err);
    } finally {
      setIsSubmitting(false);
    }
  }, [amount, description, txType, selectedWalletId, isCreditWallet, isInstallment, installmentMonths, interestRate, installmentMode, monthlyInput, createTransaction, resetForm]);

  // ── Financial calculations (atomic) ────────────────────────────
  const { totalAssets, totalDebts, netWorth } = useMemo(() => {
    const assets = wallets
      .filter((w) => ASSET_TYPES.includes(w.type))
      .reduce((sum, w) => sum + w.balance, 0);
    const debts = wallets
      .filter((w) => DEBT_TYPES.includes(w.type))
      .reduce((sum, w) => sum + Math.abs(w.balance), 0);
    return { totalAssets: assets, totalDebts: debts, netWorth: assets - debts };
  }, [wallets]);

  const { income, expense } = useMemo(() => {
    const inc = transactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + t.amount, 0);
    const exp = transactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + t.amount, 0);
    return { income: inc, expense: exp };
  }, [transactions]);

  // ── RENDER ─────────────────────────────────────────────────────
  return (
    <div className="w-full">
      <motion.main
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
      >
        {/* Net Worth Hero - ABOVE the card grid, no card wrapper */}
        <motion.div variants={fadeUp}>
          <NetWorthHero
            netWorth={netWorth}
            totalAssets={totalAssets}
            totalDebts={totalDebts}
            trendPercent={4.2}
            isLoading={isLoadingWallets}
          />
        </motion.div>

        {/* Two-column layout */}
        <div className="flex gap-3" style={{ paddingLeft: "22px", paddingRight: "22px", paddingBottom: "22px" }}>
          {/* Left column: flex 1 */}
          <div className="flex-1 flex flex-col gap-2.5">
            {/* Wallets Overview Grid */}
            <motion.div variants={fadeUp}>
              <WalletOverviewGrid
                wallets={wallets}
                isLoading={isLoadingWallets}
                onAddWallet={() => setIsWalletModalOpen(true)}
              />
            </motion.div>

            {/* Recent Transactions */}
            <motion.div variants={fadeUp}>
              <RecentTransactionsCard
                transactions={transactions}
                isLoading={isLoading}
              />
            </motion.div>
          </div>

          {/* Right column: fixed 230px */}
          <div className="flex flex-col gap-2.5" style={{ width: "230px", flexShrink: 0 }}>
            {/* Monthly P&L */}
            <motion.div variants={fadeUp}>
              <MonthlyPnLCard
                income={income}
                expenses={expense}
                isLoading={isLoading}
              />
            </motion.div>

            {/* Active Installments */}
            <motion.div variants={fadeUp}>
              <ActiveInstallmentsWidget />
            </motion.div>
          </div>
        </div>
      </motion.main>

      {/* ── Floating Action Button ─────────────────────────────────── */}
      <motion.button
        onClick={() => setIsModalOpen(true)}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, type: "spring", stiffness: 300, damping: 20 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-8 right-8 z-50 flex items-center justify-center size-14 rounded-full bg-emerald-500 text-[#003919] shadow-[0_0_30px_rgba(74,222,128,0.3)] hover:shadow-[0_0_40px_rgba(74,222,128,0.5)] hover:bg-emerald-400 transition-all duration-150 ease-out cursor-pointer"
        aria-label="Add Transaction"
      >
        <Plus className="size-6" strokeWidth={2.5} />
      </motion.button>

      {/* ── Add Transaction Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => { if (!isSubmitting) setIsModalOpen(false); }}
          >
            <motion.div
              key="modal-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as const }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md mx-4"
            >
              <Card className="border shadow-2xl" style={{ backgroundColor: "#111111", borderColor: "#262626" }}>
                <div className="px-6 pt-6 pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-zinc-50">Add Transaction</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">Record a new income or expense</p>
                    </div>
                    <button
                      onClick={() => { if (!isSubmitting) setIsModalOpen(false); }}
                      className="size-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 transition-all cursor-pointer"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
                <Separator className="bg-divider/60" />
                <CardContent className="pt-4 pb-6">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Description */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium text-zinc-400">Description</label>
                      <Input
                        type="text"
                        placeholder="Buy groceries"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                        className="h-11 bg-surface-highlight/40 border-[#1a1a1a] text-text-primary placeholder:text-outline focus-visible:ring-1 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500 transition-colors duration-150 ease-out"
                      />
                    </div>

                    {/* Amount */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium text-zinc-400">Amount</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500 pointer-events-none select-none">Rp</span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={amount}
                          onChange={handleAmountChange}
                          required
                          className="h-11 pl-10 pr-4 bg-surface-highlight/40 border-[#1a1a1a] text-text-primary placeholder:text-outline focus-visible:ring-1 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500 transition-colors duration-150 ease-out [appearance:textfield]"
                        />
                      </div>
                    </div>

                    {/* Wallet Dropdown */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium text-zinc-400">Payment Method / Wallet</label>
                      <div className="relative">
                        <select
                          value={selectedWalletId}
                          onChange={(e) => setSelectedWalletId(e.target.value)}
                          className="w-full h-11 px-3.5 pr-10 rounded-md text-sm appearance-none bg-surface-highlight/40 border border-[#1a1a1a] text-text-primary focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500 transition-colors duration-150 ease-out cursor-pointer"
                        >
                          <option value="" className="bg-zinc-900 text-zinc-400">Select wallet (optional)</option>
                          {wallets.map((w) => (
                            <option key={w.id} value={w.id} className="bg-zinc-900 text-zinc-50">
                              {w.name} — {w.type.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500 pointer-events-none" />
                      </div>
                    </div>

                    {/* Installment (Split Cicilan) */}
                    <AnimatePresence>
                      {isCreditWallet && txType === "EXPENSE" && (
                        <motion.div
                          key="installment-section"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-col gap-3 rounded-lg border border-divider bg-surface-highlight/30 p-4">
                            <label className="flex items-center gap-3 cursor-pointer select-none">
                              <div
                                role="checkbox"
                                aria-checked={isInstallment}
                                onClick={() => setIsInstallment((v) => !v)}
                                className={`size-5 rounded border flex items-center justify-center transition-all duration-200 ${
                                  isInstallment
                                    ? "bg-emerald-500 border-emerald-500"
                                    : "bg-zinc-700 border-zinc-600 hover:border-zinc-500"
                                }`}
                              >
                                {isInstallment && (
                                  <svg viewBox="0 0 16 16" fill="none" className="size-3.5 text-white">
                                    <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </div>
                              <span className="text-sm font-medium text-zinc-200">
                                Make Installment (Split Bill)
                              </span>
                            </label>

                            <AnimatePresence>
                              {isInstallment && (
                                <motion.div
                                  key="installment-options"
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2, ease: "easeInOut" }}
                                  className="overflow-hidden space-y-3"
                                >
                                  <div className="flex gap-1.5">
                                    {([3, 6, 12] as const).map((m) => (
                                      <button
                                        key={m}
                                        type="button"
                                        onClick={() => setInstallmentMonths(m)}
                                        className={`flex-1 h-9 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer border ${
                                          installmentMonths === m
                                            ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-400"
                                            : "bg-zinc-700/50 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
                                        }`}
                                      >
                                        {m} Months
                                      </button>
                                    ))}
                                  </div>

                                  {installmentMode === "A" && (
                                    <div className="flex flex-col gap-1.5">
                                      <label className="text-xs font-medium text-zinc-400">Monthly Payment</label>
                                      <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500 pointer-events-none select-none">Rp</span>
                                        <Input
                                          type="text"
                                          inputMode="numeric"
                                          placeholder="0"
                                          value={monthlyInput}
                                          onChange={(e) => setMonthlyInput(formatRupiah(e.target.value))}
                                          className="h-9 pl-10 pr-4 bg-surface-highlight/40 border-[#1a1a1a] text-text-primary text-sm focus-visible:ring-1 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500 transition-colors duration-150 ease-out"
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {installmentMode === "B" && (
                                    <div className="flex flex-col gap-1.5">
                                      <label className="text-xs font-medium text-zinc-400">Monthly Interest Rate (%)</label>
                                      <Input
                                        type="number"
                                        min={0}
                                        max={100}
                                        step={0.01}
                                        value={interestRate}
                                        onChange={(e) => setInterestRate(e.target.value)}
                                        className="h-9 bg-surface-highlight/40 border-[#1a1a1a] text-text-primary text-sm focus-visible:ring-1 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500 transition-colors duration-150 ease-out [appearance:textfield]"
                                      />
                                      <p className="text-[10px] text-zinc-500">Flat monthly rate. E.g.: 2.95 for 2.95%/month</p>
                                    </div>
                                  )}

                                  {/* Live Preview */}
                                  {(() => {
                                    const rawAmount = Number(amount.replace(/\./g, ""));
                                    if (isNaN(rawAmount) || rawAmount <= 0) return null;
                                    let computedRate: number;
                                    let totalInterest: number;
                                    let grandTotal: number;
                                    let perMonth: number;
                                    if (installmentMode === "A") {
                                      const monthly = Number(monthlyInput.replace(/\./g, ""));
                                      if (isNaN(monthly) || monthly <= 0) return null;
                                      grandTotal = monthly * installmentMonths;
                                      totalInterest = grandTotal - rawAmount;
                                      computedRate = (totalInterest / (rawAmount * installmentMonths)) * 100;
                                      computedRate = Math.round(computedRate * 100) / 100;
                                      perMonth = Math.round(grandTotal / installmentMonths);
                                    } else {
                                      const rate = Number(interestRate) || 0;
                                      computedRate = rate;
                                      totalInterest = Math.round(rawAmount * (rate / 100) * installmentMonths);
                                      grandTotal = rawAmount + totalInterest;
                                      perMonth = Math.round(grandTotal / installmentMonths);
                                    }
                                    const fmtRp = (v: number) =>
                                      new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Math.round(v));
                                    return (
                                      <div className="rounded-md bg-zinc-900/60 border border-zinc-700/50 px-3 py-2.5 space-y-1.5">
                                        <div className="flex justify-between text-xs">
                                          <span className="text-zinc-400">Item Price</span>
                                          <span className="text-zinc-50 font-semibold tabular-nums">{fmtRp(rawAmount)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                          <span className="text-zinc-400">Total Interest</span>
                                          <span className="text-yellow-400 font-semibold tabular-nums">{fmtRp(Math.max(totalInterest, 0))}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                          <span className="text-zinc-400">Total New Debt</span>
                                          <span className="text-red-400 font-semibold tabular-nums">{fmtRp(grandTotal)}</span>
                                        </div>
                                        <Separator className="bg-zinc-700/50" />
                                        <div className="flex justify-between text-xs">
                                          <span className="text-zinc-300 font-medium">Monthly Payment</span>
                                          <span className="text-emerald-400 font-bold tabular-nums">{fmtRp(perMonth)}</span>
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  <div className="pt-1">
                                    {installmentMode === "A" ? (
                                      <button type="button" onClick={() => setInstallmentMode("B")} className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors duration-150 ease-out cursor-pointer">
                                        Know the rate? Set manually →
                                      </button>
                                    ) : (
                                      <button type="button" onClick={() => setInstallmentMode("A")} className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors duration-150 ease-out cursor-pointer">
                                        ← Back to monthly payment input
                                      </button>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Transaction Type */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium text-zinc-400">Transaction Type</label>
                      <div className="flex gap-2">
                        {(["EXPENSE", "INCOME"] as const).map((type) => {
                          const active = txType === type;
                          const label = type === "EXPENSE" ? "Expense" : "Income";
                          const Icon = type === "EXPENSE" ? TrendingDown : TrendingUp;
                          const activeClass =
                            type === "EXPENSE"
                              ? "bg-red-500/15 border-red-500/40 text-red-400"
                              : "bg-emerald-500/15 border-emerald-500/40 text-emerald-400";
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setTxType(type)}
                              className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-md border text-sm font-medium transition-all duration-200 cursor-pointer ${
                                active
                                  ? activeClass
                                  : "bg-surface-highlight/40 border-[#1a1a1a] text-text-secondary hover:border-[#262626] hover:text-text-primary"
                              }`}
                            >
                              <Icon className="size-4" />
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => { if (!isSubmitting) setIsModalOpen(false); }}
                        disabled={isSubmitting}
                        className="flex-1 h-11 border-[#1a1a1a] bg-surface-highlight/40 text-text-secondary hover:bg-surface-highlight hover:text-text-primary disabled:opacity-50"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 h-11 bg-emerald-500 hover:bg-emerald-400 text-[#003919] font-medium disabled:opacity-50 gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Transaction"
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* ── Create Wallet Modal ──────────────────────────────────── */}
        {isWalletModalOpen && (
          <motion.div
            key="wallet-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => { if (!isCreatingWallet) setIsWalletModalOpen(false); }}
          >
            <motion.div
              key="wallet-modal-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as const }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md mx-4"
            >
              <Card className="border shadow-2xl" style={{ backgroundColor: "#111111", borderColor: "#262626" }}>
                <div className="px-6 pt-6 pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-zinc-50">Create New Wallet</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">Add a bank account, e-wallet, or credit card</p>
                    </div>
                    <button
                      onClick={() => { if (!isCreatingWallet) setIsWalletModalOpen(false); }}
                      className="size-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 transition-all cursor-pointer"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
                <Separator className="bg-divider/60" />
                <CardContent className="pt-4 pb-6">
                  <form onSubmit={handleCreateWallet} className="space-y-5">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium text-zinc-400">Wallet Name</label>
                      <Input
                        type="text"
                        placeholder="Bank Mandiri, GoPay, Kredivo..."
                        value={walletName}
                        onChange={(e) => setWalletName(e.target.value)}
                        required
                        className="h-11 bg-surface-highlight/40 border-[#1a1a1a] text-text-primary placeholder:text-outline focus-visible:ring-1 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500 transition-colors duration-150 ease-out"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium text-zinc-400">Wallet Type</label>
                      <div className="relative">
                        <select
                          value={walletType}
                          onChange={(e) => setWalletType(e.target.value as Wallet["type"])}
                          className="w-full h-11 px-3.5 pr-10 rounded-md text-sm appearance-none bg-surface-highlight/40 border border-[#1a1a1a] text-text-primary focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500 transition-colors duration-150 ease-out cursor-pointer"
                        >
                          <option value="CASH" className="bg-zinc-900 text-zinc-50">Cash</option>
                          <option value="BANK" className="bg-zinc-900 text-zinc-50">Bank Account</option>
                          <option value="E_WALLET" className="bg-zinc-900 text-zinc-50">E-Wallet</option>
                          <option value="CREDIT_CARD" className="bg-zinc-900 text-zinc-50">Credit Card</option>
                          <option value="LOAN_PAYLATER" className="bg-zinc-900 text-zinc-50">Loan / PayLater</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500 pointer-events-none" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium text-zinc-400">Initial Balance</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500 pointer-events-none select-none">Rp</span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={walletBalance}
                          onChange={(e) => setWalletBalance(formatRupiah(e.target.value))}
                          className="h-11 pl-10 pr-4 bg-surface-highlight/40 border-[#1a1a1a] text-text-primary placeholder:text-outline focus-visible:ring-1 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500 transition-colors duration-150 ease-out"
                        />
                      </div>
                    </div>

                    <AnimatePresence>
                      {showCreditLimit && (
                        <motion.div
                          key="credit-limit-field"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-col gap-2">
                            <label className="text-xs font-medium text-zinc-400">Credit Limit</label>
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500 pointer-events-none select-none">Rp</span>
                              <Input
                                type="text"
                                inputMode="numeric"
                                placeholder="0"
                                value={walletCreditLimit}
                                onChange={(e) => setWalletCreditLimit(formatRupiah(e.target.value))}
                                className="h-11 pl-10 pr-4 bg-surface-highlight/40 border-[#1a1a1a] text-text-primary placeholder:text-outline focus-visible:ring-1 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500 transition-colors duration-150 ease-out"
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <AnimatePresence>
                      {showCreditLimit && (
                        <motion.div
                          key="provider-field"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-col gap-2">
                            <label className="text-xs font-medium text-zinc-400">Paylater Provider</label>
                            <div className="relative">
                              <select
                                value={walletProvider}
                                onChange={(e) => handleProviderChange(e.target.value)}
                                className="w-full h-11 px-3.5 pr-10 rounded-md text-sm appearance-none bg-surface-highlight/40 border border-[#1a1a1a] text-text-primary focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500 transition-colors duration-150 ease-out cursor-pointer"
                              >
                                {PAYLATER_PRESETS.map((p) => (
                                  <option key={p.value} value={p.value} className="bg-zinc-900 text-zinc-50">
                                    {p.label}{p.rate > 0 ? ` (${p.rate}%)` : ""}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500 pointer-events-none" />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <AnimatePresence>
                      {showCreditLimit && (
                        <motion.div
                          key="interest-rate-field"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-col gap-2">
                            <label className="text-xs font-medium text-zinc-400">Monthly Interest Rate (%)</label>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step={0.01}
                              placeholder="0"
                              value={walletInterestRate}
                              onChange={(e) => setWalletInterestRate(e.target.value)}
                              className="h-11 bg-surface-highlight/40 border-[#1a1a1a] text-text-primary placeholder:text-outline focus-visible:ring-1 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500 transition-colors duration-150 ease-out [appearance:textfield]"
                            />
                            <p className="text-[10px] text-zinc-500">Flat monthly rate. E.g.: 2.95 for 2.95%/month</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Wallet Color */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                        <Palette className="size-3.5" />
                        Wallet Color (Optional)
                      </label>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {WALLET_COLOR_PRESETS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setWalletColor(c)}
                            className={`size-7 rounded-full transition-all duration-200 cursor-pointer ${
                              walletColor === c
                                ? "ring-2 ring-white/60 ring-offset-2 ring-offset-zinc-900 scale-110"
                                : "hover:scale-110"
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                        <label className="relative">
                          <input
                            type="color"
                            value={walletColor}
                            onChange={(e) => setWalletColor(e.target.value)}
                            className="absolute inset-0 opacity-0 size-7 cursor-pointer"
                          />
                          <div className="size-7 rounded-full border-2 border-dashed border-zinc-600 flex items-center justify-center text-zinc-500 hover:border-zinc-400 transition-colors">
                            <Plus className="size-3" />
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Wallet Actions */}
                    <div className="flex items-center gap-3 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => { if (!isCreatingWallet) { setIsWalletModalOpen(false); resetWalletForm(); } }}
                        disabled={isCreatingWallet}
                        className="flex-1 h-11 border-[#1a1a1a] bg-surface-highlight/40 text-text-secondary hover:bg-surface-highlight hover:text-text-primary disabled:opacity-50"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isCreatingWallet}
                        className="flex-1 h-11 bg-emerald-500 hover:bg-emerald-400 text-[#003919] font-medium disabled:opacity-50 gap-2"
                      >
                        {isCreatingWallet ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Save Wallet"
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
