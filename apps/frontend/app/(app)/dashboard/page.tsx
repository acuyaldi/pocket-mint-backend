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
    <div className="w-full min-h-full flex flex-col gap-6 select-none overflow-x-hidden text-foreground">
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">

        {/* ── HERO: Net Worth Summary — full width ── */}
        <section className="relative overflow-hidden rounded-xl p-8 group bg-card border border-border">
          {/* Background graphic placeholder */}
          <div className="absolute right-0 top-0 h-full w-1/2 opacity-5 pointer-events-none transition-transform group-hover:scale-105 duration-700" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-widest font-semibold mb-2 text-muted-foreground font-mono">
                Net Worth
              </p>
              <h2 className="font-bold font-heading text-foreground text-[48px] leading-[1.1] tracking-[-0.02em]">
                {formatCurrency(netWorth)}
              </h2>
              <div className="flex items-center gap-2 mt-3">
                <TrendingUp className="size-4 text-primary" />
                <span className="text-sm font-bold text-primary">+4.2%</span>
                <span className="text-sm text-muted-foreground">vs last month</span>
              </div>
            </div>
            <div className="flex gap-8 shrink-0">
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-widest font-semibold mb-1 text-muted-foreground font-mono">
                  Total Assets
                </p>
                <p className="text-xl font-semibold text-primary font-heading">
                  {formatCurrency(totalAssets)}
                </p>
              </div>
              <div className="w-px self-stretch bg-border" />
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-widest font-semibold mb-1 text-muted-foreground font-mono">
                  Total Debt
                </p>
                <p className="text-xl font-semibold text-destructive font-heading">
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
                <span className="text-sm font-semibold text-foreground font-heading">
                  Wallets Overview
                </span>
                <Link
                  href="/wallets"
                  className="text-[12px] font-semibold transition-opacity hover:opacity-75 text-primary"
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
                      className="animate-pulse rounded-xl h-[120px] bg-card border border-border"
                    />
                  ))}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="rounded-xl overflow-hidden bg-card border border-border">
              <div className="px-6 py-4 flex items-center justify-between border-b border-border">
                <span className="text-sm font-semibold text-foreground font-heading">
                  Recent Transactions
                </span>
                <Link
                  href="/transactions"
                  className="text-[12px] font-semibold transition-opacity hover:opacity-75 text-primary"
                >
                  Show All →
                </Link>
              </div>

              <div>
                {transactions.slice(0, 5).map((t, i) => (
                  <div key={t.id || i}>
                    {i > 0 && <div className="h-px mx-6 bg-[#1a1a1a]" />}
                    <div className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-[#141414]">
                      <div
                        className={`flex items-center justify-center shrink-0 rounded-full size-10 ${
                          t.type === "INCOME" ? "bg-primary/10" : "bg-destructive/10"
                        }`}
                      >
                        {t.type === "INCOME" ? (
                          <ArrowUpRight className="size-5 text-primary" />
                        ) : (
                          <ArrowDownLeft className="size-5 text-destructive" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-foreground font-sans">
                          {t.description || "Transaction"}
                        </p>
                        <p className="text-[12px] text-muted-foreground">
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
                          className={`text-sm font-mono font-semibold ${
                            t.type === "EXPENSE" ? "text-destructive" : "text-primary"
                          }`}
                        >
                          {t.type === "EXPENSE" ? "-" : "+"}
                          {formatCurrency(t.amount)}
                        </p>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {wallets.find((w) => w.id === t.walletId)?.name ?? "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {transactions.length === 0 && !isLoading && (
                <p className="text-sm text-center py-6 text-muted-foreground">
                  Belum ada transaksi
                </p>
              )}
              {isLoading && (
                <p className="text-sm text-center py-6 text-muted-foreground">
                  Memuat...
                </p>
              )}

              <Link
                href="/transactions"
                className="block w-full py-4 text-center text-[12px] font-semibold transition-opacity hover:opacity-75 text-muted-foreground border-t border-border font-sans"
              >
                Show All Transactions
              </Link>
            </div>
          </div>

          {/* ── RIGHT COLUMN (4/12) ── */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">

            {/* Monthly P&L */}
            <div className="rounded-xl p-6 bg-card border border-border">
              <span className="text-sm font-semibold block mb-5 text-foreground font-heading">
                Monthly P&L
              </span>

              <div className="flex flex-col gap-5">
                {/* Income */}
                <div>
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <p className="text-[11px] uppercase tracking-widest font-semibold mb-1 text-muted-foreground font-mono">
                        Income
                      </p>
                      <p className="font-bold text-[28px] leading-none text-primary font-heading">
                        {formatCurrency(income)}
                      </p>
                    </div>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden bg-border">
                    <div
                      className="h-full rounded-full transition-all duration-700 bg-primary"
                      style={{ width: `${incomeBarPct}%` }}
                    />
                  </div>
                </div>

                {/* Expenses */}
                <div>
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <p className="text-[11px] uppercase tracking-widest font-semibold mb-1 text-muted-foreground font-mono">
                        Expenses
                      </p>
                      <p className="font-bold text-[28px] leading-none text-foreground font-heading">
                        {formatCurrency(expense)}
                      </p>
                    </div>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden bg-border">
                    <div
                      className="h-full rounded-full transition-all duration-700 bg-destructive"
                      style={{ width: `${expenseBarPct}%` }}
                    />
                  </div>
                </div>

                {/* Net Savings */}
                <div className="pt-4 flex items-center justify-between border-t border-[#1a1a1a]">
                  <span className="text-sm font-semibold text-foreground font-sans">
                    Net Savings
                  </span>
                  <span
                    className={`text-lg font-bold font-heading ${
                      netSavings >= 0 ? "text-primary" : "text-destructive"
                    }`}
                  >
                    {formatCurrency(netSavings)}
                  </span>
                </div>
              </div>
            </div>

            {/* Savings Goal bento */}
            <div className="relative overflow-hidden rounded-xl p-6 bg-muted border border-border">
              <div className="relative z-10">
                <p className="text-[11px] uppercase tracking-widest font-semibold mb-1 text-muted-foreground font-mono">
                  Next Major Goal
                </p>
                <h4 className="text-base font-bold mb-4 text-foreground font-heading">
                  Vacation Fund
                </h4>
                <div className="flex justify-between text-[11px] font-semibold mb-1.5 text-muted-foreground">
                  <span>Rp 4.200.000 saved</span>
                  <span className="text-foreground">Rp 5.000.000</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden bg-border">
                  <div className="h-full rounded-full bg-primary w-[84%] shadow-[0_0_8px_rgba(74,222,128,0.4)]" />
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none select-none leading-none text-[120px]">
                ✈
              </div>
            </div>

            {/* Cicilan Aktif */}
            <div className="rounded-xl p-6 bg-card border border-border">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground font-mono">
                  Cicilan Aktif
                </span>
                <Link
                  href="/cicilan"
                  className="text-[12px] font-semibold transition-opacity hover:opacity-75 text-primary"
                >
                  Lihat semua →
                </Link>
              </div>

              <p className="text-base font-semibold mb-0.5 text-foreground font-heading">
                Kredivo
              </p>
              <p className="text-[12px] mb-3 text-muted-foreground">
                Cicilan laptop · Rp 350.000/bln
              </p>

              <div className="h-1.5 rounded-full overflow-hidden mb-2 bg-border">
                <div className="h-full rounded-full transition-all duration-700 bg-primary w-[25%]" />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[12px] text-muted-foreground">25% lunas</span>
                <span className="text-[12px] text-muted-foreground">9 cicilan lagi</span>
              </div>

              <div className="flex items-center justify-between mt-3">
                <span className="text-[12px] text-primary font-mono">3 / 12</span>
                <span className="text-[12px] text-[#3d4a3e]">bulan berjalan</span>
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
