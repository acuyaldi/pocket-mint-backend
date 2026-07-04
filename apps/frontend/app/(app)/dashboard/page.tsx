"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useTransactions, useCreateTransaction } from "@/src/features/transactions/hooks/useTransactions";
import { useWallets } from "@/src/features/wallets/hooks/useWallets";
import { WalletCard } from "@/components/WalletCard";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { AddTransactionModal } from "@/app/(app)/transactions/components/AddTransactionModal";

const ASSET_TYPES = ["BANK_ACCOUNT", "E_WALLET", "CASH", "SAVINGS", "INVESTMENT", "CRYPTO"];
const DEBT_TYPES = ["CREDIT_CARD", "LOAN", "PAYLATER"];

export default function DashboardPage() {
  const { data, isLoading } = useTransactions();
  const { data: walletsData } = useWallets();
  const createTransaction = useCreateTransaction();
  const transactions = useMemo(() => data ?? [], [data]);
  const wallets = useMemo(() => walletsData ?? [], [walletsData]);

  // ── Add Transaction Modal State ──
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleAddSubmit = useCallback(async (d: {
    description: string;
    amount: number;
    type: "EXPENSE" | "INCOME" | "TRANSFER";
    date: string;
    walletId?: string;
    toWalletId?: string;
    isInstallment?: boolean;
  }) => {
    setIsCreating(true);
    try {
      await createTransaction.mutateAsync(d);
      setIsAddModalOpen(false);
    } catch (err) {
      console.error("Gagal menambah transaksi:", err);
    } finally {
      setIsCreating(false);
    }
  }, [createTransaction]);

  useEffect(() => {
    const handler = () => setIsAddModalOpen(true);
    window.addEventListener("fab-add-transaction", handler);
    return () => window.removeEventListener("fab-add-transaction", handler);
  }, []);

  const { totalAssets, totalDebts, netWorth } = useMemo(() => {
    const assets = wallets.filter((w) => ASSET_TYPES.includes(w.type)).reduce((s, w) => s + w.balance, 0);
    const debts = wallets.filter((w) => DEBT_TYPES.includes(w.type)).reduce((s, w) => s + Math.abs(w.balance), 0);
    return { totalAssets: assets, totalDebts: debts, netWorth: assets - debts };
  }, [wallets]);

  const { income, expense } = useMemo(() => {
    const inc = transactions.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
    const exp = transactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
    return { income: inc, expense: exp };
  }, [transactions]);

  const netSavings = income - expense;
  const maxPnl = Math.max(income, expense, 1);
  const incomeBarPct = Math.round((income / maxPnl) * 100);
  const expenseBarPct = Math.round((expense / maxPnl) * 100);

  const dashboardWallets = useMemo(
    () => wallets.filter((w) => !w.isArchived).slice(0, 4),
    [wallets],
  );

  return (
    <div className="w-full min-h-full flex flex-col gap-6 select-none overflow-x-hidden" style={{ color: "#e5e2e1" }}>
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">

        {/* ── HERO: Net Worth Summary — full width ── */}
        <section
          className="relative overflow-hidden rounded-xl p-8 group"
          style={{ background: "#0e0e0e", border: "1px solid #262626" }}
        >
          {/* Background graphic placeholder */}
          <div className="absolute right-0 top-0 h-full w-1/2 opacity-5 pointer-events-none transition-transform group-hover:scale-105 duration-700" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p
                className="text-[11px] uppercase tracking-widest font-semibold mb-2"
                style={{ color: "#bccabb", fontFamily: "var(--font-mono)" }}
              >
                Net Worth
              </p>
              <h2
                className="font-bold"
                style={{
                  fontSize: "48px",
                  lineHeight: "1.1",
                  letterSpacing: "-0.02em",
                  color: "#e5e2e1",
                  fontFamily: "var(--font-heading)",
                }}
              >
                {formatCurrency(netWorth)}
              </h2>
              <div className="flex items-center gap-2 mt-3">
                <TrendingUp className="size-4" style={{ color: "#4ade80" }} />
                <span className="text-sm font-bold" style={{ color: "#4ade80" }}>+4.2%</span>
                <span className="text-sm" style={{ color: "#bccabb" }}>vs last month</span>
              </div>
            </div>
            <div className="flex gap-8 shrink-0">
              <div className="text-right">
                <p
                  className="text-[11px] uppercase tracking-widest font-semibold mb-1"
                  style={{ color: "#bccabb", fontFamily: "var(--font-mono)" }}
                >
                  Total Assets
                </p>
                <p
                  className="text-xl font-semibold"
                  style={{ color: "#4ade80", fontFamily: "var(--font-heading)" }}
                >
                  {formatCurrency(totalAssets)}
                </p>
              </div>
              <div className="w-px self-stretch" style={{ backgroundColor: "#262626" }} />
              <div className="text-right">
                <p
                  className="text-[11px] uppercase tracking-widest font-semibold mb-1"
                  style={{ color: "#bccabb", fontFamily: "var(--font-mono)" }}
                >
                  Total Debt
                </p>
                <p
                  className="text-xl font-semibold"
                  style={{ color: "#ffb4ab", fontFamily: "var(--font-heading)" }}
                >
                  {formatCurrency(totalDebts)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── MAIN GRID ── */}
        <div className="grid grid-cols-12 gap-6 items-start">

          {/* ── LEFT COLUMN (8/12) ── */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">

            {/* Wallets Overview */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span
                  className="text-sm font-semibold"
                  style={{ color: "#e5e2e1", fontFamily: "var(--font-heading)" }}
                >
                  Wallets Overview
                </span>
                <Link
                  href="/wallets"
                  className="text-[12px] font-semibold transition-opacity hover:opacity-75"
                  style={{ color: "#4ade80" }}
                >
                  View All →
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dashboardWallets.map((w) => (
                  <WalletCard key={w.id} wallet={w} />
                ))}
                {dashboardWallets.length === 0 &&
                  !walletsData &&
                  [...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="animate-pulse rounded-xl"
                      style={{ height: "120px", background: "#0e0e0e", border: "1px solid #262626" }}
                    />
                  ))}
              </div>
            </div>

            {/* Recent Transactions */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "#0e0e0e", border: "1px solid #262626" }}
            >
              <div
                className="px-6 py-4 flex items-center justify-between"
                style={{ borderBottom: "1px solid #262626" }}
              >
                <span
                  className="text-sm font-semibold"
                  style={{ color: "#e5e2e1", fontFamily: "var(--font-heading)" }}
                >
                  Recent Transactions
                </span>
                <Link
                  href="/transactions"
                  className="text-[12px] font-semibold transition-opacity hover:opacity-75"
                  style={{ color: "#4ade80" }}
                >
                  Show All →
                </Link>
              </div>

              <div>
                {transactions.slice(0, 5).map((t, i) => (
                  <div key={t.id || i}>
                    {i > 0 && (
                      <div className="h-px mx-6" style={{ backgroundColor: "#1a1a1a" }} />
                    )}
                    <div className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-[#141414]">
                      <div
                        className="flex items-center justify-center shrink-0 rounded-full"
                        style={{
                          width: "40px",
                          height: "40px",
                          backgroundColor:
                            t.type === "INCOME"
                              ? "rgba(74,222,128,0.12)"
                              : "rgba(255,180,171,0.12)",
                        }}
                      >
                        {t.type === "INCOME" ? (
                          <ArrowUpRight className="size-5" style={{ color: "#4ade80" }} />
                        ) : (
                          <ArrowDownLeft className="size-5" style={{ color: "#ffb4ab" }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-semibold truncate"
                          style={{ color: "#e5e2e1", fontFamily: "var(--font-sans)" }}
                        >
                          {t.description || "Transaction"}
                        </p>
                        <p className="text-[12px]" style={{ color: "#bccabb" }}>
                          {new Date(t.date).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                          })}
                          {" · "}
                          {t.categoryId ?? "Uncategorized"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className="text-sm font-mono font-semibold"
                          style={{
                            color: t.type === "EXPENSE" ? "#ffb4ab" : "#4ade80",
                          }}
                        >
                          {t.type === "EXPENSE" ? "-" : "+"}
                          {formatCurrency(t.amount)}
                        </p>
                        <p
                          className="text-[11px] uppercase tracking-wide"
                          style={{ color: "#bccabb" }}
                        >
                          {wallets.find((w) => w.id === t.walletId)?.name ?? "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {transactions.length === 0 && !isLoading && (
                <p className="text-sm text-center py-6" style={{ color: "#bccabb" }}>
                  Belum ada transaksi
                </p>
              )}
              {isLoading && (
                <p className="text-sm text-center py-6" style={{ color: "#bccabb" }}>
                  Memuat...
                </p>
              )}

              <Link
                href="/transactions"
                className="block w-full py-4 text-center text-[12px] font-semibold transition-opacity hover:opacity-75"
                style={{
                  color: "#bccabb",
                  borderTop: "1px solid #262626",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Show All Transactions
              </Link>
            </div>
          </div>

          {/* ── RIGHT COLUMN (4/12) ── */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">

            {/* Monthly P&L */}
            <div
              className="rounded-xl p-6"
              style={{ background: "#0e0e0e", border: "1px solid #262626" }}
            >
              <span
                className="text-sm font-semibold block mb-5"
                style={{ color: "#e5e2e1", fontFamily: "var(--font-heading)" }}
              >
                Monthly P&L
              </span>

              <div className="flex flex-col gap-5">
                {/* Income */}
                <div>
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <p
                        className="text-[11px] uppercase tracking-widest font-semibold mb-1"
                        style={{ color: "#bccabb", fontFamily: "var(--font-mono)" }}
                      >
                        Income
                      </p>
                      <p
                        className="font-bold"
                        style={{
                          fontSize: "28px",
                          lineHeight: "1",
                          color: "#4ade80",
                          fontFamily: "var(--font-heading)",
                        }}
                      >
                        {formatCurrency(income)}
                      </p>
                    </div>
                  </div>
                  <div
                    className="h-3 rounded-full overflow-hidden"
                    style={{ backgroundColor: "#262626" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${incomeBarPct}%`, backgroundColor: "#4ade80" }}
                    />
                  </div>
                </div>

                {/* Expenses */}
                <div>
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <p
                        className="text-[11px] uppercase tracking-widest font-semibold mb-1"
                        style={{ color: "#bccabb", fontFamily: "var(--font-mono)" }}
                      >
                        Expenses
                      </p>
                      <p
                        className="font-bold"
                        style={{
                          fontSize: "28px",
                          lineHeight: "1",
                          color: "#e5e2e1",
                          fontFamily: "var(--font-heading)",
                        }}
                      >
                        {formatCurrency(expense)}
                      </p>
                    </div>
                  </div>
                  <div
                    className="h-3 rounded-full overflow-hidden"
                    style={{ backgroundColor: "#262626" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${expenseBarPct}%`, backgroundColor: "#ffb4ab" }}
                    />
                  </div>
                </div>

                {/* Net Savings */}
                <div
                  className="pt-4 flex items-center justify-between"
                  style={{ borderTop: "1px solid #1a1a1a" }}
                >
                  <span
                    className="text-sm font-semibold"
                    style={{ color: "#e5e2e1", fontFamily: "var(--font-sans)" }}
                  >
                    Net Savings
                  </span>
                  <span
                    className="text-lg font-bold"
                    style={{
                      color: netSavings >= 0 ? "#4ade80" : "#ffb4ab",
                      fontFamily: "var(--font-heading)",
                    }}
                  >
                    {formatCurrency(netSavings)}
                  </span>
                </div>
              </div>
            </div>

            {/* Savings Goal bento */}
            <div
              className="relative overflow-hidden rounded-xl p-6"
              style={{ background: "#1c1b1b", border: "1px solid #262626" }}
            >
              <div className="relative z-10">
                <p
                  className="text-[11px] uppercase tracking-widest font-semibold mb-1"
                  style={{ color: "#bccabb", fontFamily: "var(--font-mono)" }}
                >
                  Next Major Goal
                </p>
                <h4
                  className="text-base font-bold mb-4"
                  style={{ color: "#e5e2e1", fontFamily: "var(--font-heading)" }}
                >
                  Vacation Fund
                </h4>
                <div
                  className="flex justify-between text-[11px] font-semibold mb-1.5"
                  style={{ color: "#bccabb" }}
                >
                  <span>Rp 4.200.000 saved</span>
                  <span style={{ color: "#e5e2e1" }}>Rp 5.000.000</span>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ backgroundColor: "#262626" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: "84%",
                      backgroundColor: "#4ade80",
                      boxShadow: "0 0 8px rgba(74,222,128,0.4)",
                    }}
                  />
                </div>
              </div>
              <div
                className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none select-none leading-none"
                style={{ fontSize: "120px" }}
              >
                ✈
              </div>
            </div>

            {/* Cicilan Aktif */}
            <div
              className="rounded-xl p-6"
              style={{ background: "#0e0e0e", border: "1px solid #262626" }}
            >
              <div className="flex items-center justify-between mb-4">
                <span
                  className="text-[11px] uppercase tracking-widest font-semibold"
                  style={{ color: "#bccabb", fontFamily: "var(--font-mono)" }}
                >
                  Cicilan Aktif
                </span>
                <Link
                  href="/cicilan"
                  className="text-[12px] font-semibold transition-opacity hover:opacity-75"
                  style={{ color: "#4ade80" }}
                >
                  Lihat semua →
                </Link>
              </div>

              <p
                className="text-base font-semibold mb-0.5"
                style={{ color: "#e5e2e1", fontFamily: "var(--font-heading)" }}
              >
                Kredivo
              </p>
              <p className="text-[12px] mb-3" style={{ color: "#bccabb" }}>
                Cicilan laptop · Rp 350.000/bln
              </p>

              <div
                className="h-1.5 rounded-full overflow-hidden mb-2"
                style={{ backgroundColor: "#262626" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: "25%", backgroundColor: "#4ade80" }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[12px]" style={{ color: "#bccabb" }}>
                  25% lunas
                </span>
                <span className="text-[12px]" style={{ color: "#bccabb" }}>
                  9 cicilan lagi
                </span>
              </div>

              <div className="flex items-center justify-between mt-3">
                <span
                  className="text-[12px]"
                  style={{ color: "#4ade80", fontFamily: "var(--font-mono)" }}
                >
                  3 / 12
                </span>
                <span className="text-[12px]" style={{ color: "#3d4a3e" }}>
                  bulan berjalan
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddTransactionModal
        isOpen={isAddModalOpen}
        isCreating={isCreating}
        wallets={wallets}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddSubmit}
      />
    </div>
  );
}
