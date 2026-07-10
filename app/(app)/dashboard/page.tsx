"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useTransactions, useCreateTransaction, useMonthlySummary } from "@/src/features/transactions/hooks/useTransactions";
import { useWallets } from "@/src/features/wallets/hooks/useWallets";
import { useInstallments } from "@/src/features/installments/hooks/useInstallments";
import { WalletCard } from "@/components/WalletCard";
import { formatCurrency } from "@/lib/utils";
import { isDebtWallet } from "@/src/types/wallet";
import { TrendingUp, ArrowDownLeft, ArrowUpRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddTransactionModal, type AddTransactionData } from "@/app/(app)/transactions/components/AddTransactionModal";

function buildMiniBarHeights(value: number, maxValue: number) {
  const normalized = maxValue > 0 ? value / maxValue : 0;
  const bars = [0.38, 0.58, 0.76, 1];

  return bars.map((bar) => {
    const height = Math.round((18 + normalized * 26) * bar);
    return Math.max(8, Math.min(44, height));
  });
}

export default function DashboardPage() {
  const { data, isLoading } = useTransactions();
  const { data: walletsData } = useWallets();
  const createTransaction = useCreateTransaction();
  const transactions = useMemo(() => data ?? [], [data]);
  const wallets = useMemo(() => walletsData ?? [], [walletsData]);

  // ── Add Transaction Modal State ──
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleAddSubmit = useCallback(async (d: AddTransactionData) => {
    setIsCreating(true);
    try {
      await createTransaction.mutateAsync(d);
      setIsAddModalOpen(false);
    } catch (err) {
      console.error("Failed to add transaction:", err);
      throw err; // let the modal surface the message
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
    const assets = wallets.filter((w) => !isDebtWallet(w.type)).reduce((s, w) => s + w.balance, 0);
    const debts = wallets.filter((w) => isDebtWallet(w.type)).reduce((s, w) => s + Math.abs(w.balance), 0);
    // Net worth = assets only; debt reduces it only via repayment transactions
    return { totalAssets: assets, totalDebts: debts, netWorth: assets };
  }, [wallets]);

  // Monthly P&L from the backend summary endpoint (current calendar month)
  const { data: summary } = useMonthlySummary();
  const income = summary?.income ?? 0;
  const expense = summary?.expenses ?? 0;
  const netSavings = summary?.netSavings ?? 0;

  // Most recent active installment for the Cicilan Aktif widget
  const { data: activeInstallments } = useInstallments("ACTIVE");
  const activeInstallment = activeInstallments?.[0] ?? null;
  const maxPnl = Math.max(income, expense, 1);
  const incomeBarPct = Math.round((income / maxPnl) * 100);
  const expenseBarPct = Math.round((expense / maxPnl) * 100);
  const summaryChartMax = Math.max(totalAssets, totalDebts, 1);
  const assetBarHeights = useMemo(
    () => buildMiniBarHeights(totalAssets, summaryChartMax),
    [totalAssets, summaryChartMax],
  );
  const debtBarHeights = useMemo(
    () => buildMiniBarHeights(totalDebts, summaryChartMax),
    [totalDebts, summaryChartMax],
  );

  const dashboardWallets = useMemo(
    () => wallets.filter((w) => !w.isArchived).slice(0, 4),
    [wallets],
  );

  return (
    <div className="space-y-6" style={{opacity: isLoading ? 0.5 : 1, transition: "opacity 0.3s ease-in-out"}}>
      <div className="w-full flex flex-col gap-6">
        <section className="surface-card flex flex-col gap-4 rounded-2xl border border-white/80 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <p className="font-mono text-[11px] tracking-[0.08em] text-primary">
              OVERVIEW
            </p>
            <h1 className="mt-2 font-heading text-3xl font-bold tracking-[-0.02em] text-foreground">
              Financial clarity at a glance
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Net worth, wallet exposure, monthly cash movement, and active
              cicilan stay visible in one owner workspace.
            </p>
          </div>
          <div className="w-full shrink-0 md:w-auto">
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="h-9 w-full gap-2 rounded-lg bg-primary px-5 font-semibold text-primary-foreground md:w-auto"
            >
              <Plus className="size-4" /> Add New Transaction
            </Button>
          </div>
        </section>

        {/* ── HERO: Net Worth Summary — full width ── */}
        <section className="surface-card group relative overflow-hidden rounded-2xl border border-white/80 p-8">
          {/* Background graphic placeholder */}
          <div className="absolute right-0 top-0 h-full w-1/2 opacity-5 pointer-events-none transition-transform group-hover:scale-105 duration-700" />
          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
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
            <div className="grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:min-w-[360px]">
              <div className="rounded-xl border border-white/80 bg-white/72 p-4 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.52)]">
                <div className="mb-3 flex h-12 items-end justify-end gap-1.5">
                  {assetBarHeights.map((height, index) => (
                    <div
                      key={`asset-bar-${index}`}
                      className="w-2 rounded-full bg-primary/18"
                      style={{ height: `${height}px` }}
                    >
                      <div
                        className="w-full rounded-full bg-primary shadow-[0_0_14px_rgba(0,109,54,0.18)]"
                        style={{ height: `${Math.max(6, height - 6)}px` }}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[11px] uppercase tracking-widest font-semibold mb-1 text-muted-foreground font-mono">
                  Total Assets
                </p>
                <p className="text-xl font-semibold text-primary font-mono">
                  {formatCurrency(totalAssets)}
                </p>
              </div>
              <div className="rounded-xl border border-white/80 bg-white/72 p-4 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.52)]">
                <div className="mb-3 flex h-12 items-end justify-end gap-1.5">
                  {debtBarHeights.map((height, index) => (
                    <div
                      key={`debt-bar-${index}`}
                      className="w-2 rounded-full bg-destructive/16"
                      style={{ height: `${height}px` }}
                    >
                      <div
                        className="w-full rounded-full bg-destructive shadow-[0_0_14px_rgba(186,26,26,0.14)]"
                        style={{ height: `${Math.max(6, height - 6)}px` }}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[11px] uppercase tracking-widest font-semibold mb-1 text-muted-foreground font-mono">
                  Total Debt
                </p>
                <p className="text-xl font-semibold text-destructive font-mono">
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

            {/* Wallets Overview — hidden when there are no wallets; a CTA takes its place */}
            {walletsData && dashboardWallets.length === 0 ? (
              <Link
                href="/wallets"
                className="flex items-center justify-center gap-2 rounded-xl py-10 border border-dashed border-border bg-card text-sm font-semibold text-primary transition-opacity hover:opacity-75"
              >
                <Plus className="size-4" />
                Add New Wallet
              </Link>
            ) : (
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
            )}

            {/* Recent Transactions */}
            <div className="surface-card overflow-hidden rounded-2xl border border-white/80">
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
                    {i > 0 && <div className="mx-6 h-px bg-border/70" />}
                    <div className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/60">
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
                  No transactions yet
                </p>
              )}
              {isLoading && (
                <p className="text-sm text-center py-6 text-muted-foreground">
                  Loading...
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
            <div className="surface-card rounded-2xl border border-white/80 p-6">
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
                <div className="flex items-center justify-between border-t border-border/70 pt-4">
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

            {/* Cicilan Aktif */}
            <div className="surface-card rounded-2xl border border-white/80 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground font-mono">
                  Active Installments
                </span>
                <Link
                  href="/cicilan"
                  className="text-[12px] font-semibold transition-opacity hover:opacity-75 text-primary"
                >
                  Lihat semua →
                </Link>
              </div>

              {activeInstallment ? (
                <>
                  <p className="text-base font-semibold mb-0.5 text-foreground font-heading">
                    {activeInstallment.walletName}
                  </p>
                  <p className="text-[12px] mb-3 text-muted-foreground">
                    {activeInstallment.description || "Installment"} ·{" "}
                    <span className="font-mono">{formatCurrency(activeInstallment.monthlyAmount)}/mo</span>
                  </p>

                  <div className="h-1.5 rounded-full overflow-hidden mb-2 bg-border">
                    <div
                      className="h-full rounded-full transition-all duration-700 bg-primary"
                      style={{
                        width: `${Math.min(100, Math.round((activeInstallment.currentTerm / activeInstallment.installmentMonths) * 100))}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-muted-foreground font-mono">
                      {Math.min(100, Math.round((activeInstallment.currentTerm / activeInstallment.installmentMonths) * 100))}% paid off
                    </span>
                    <span className="text-[12px] text-muted-foreground">
                      {activeInstallment.installmentMonths - activeInstallment.currentTerm} payments left
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[12px] text-primary font-mono">
                      {activeInstallment.currentTerm} / {activeInstallment.installmentMonths}
                    </span>
                    <span className="text-[12px] text-muted-foreground">months elapsed</span>
                  </div>
                </>
              ) : (
                <p className="text-sm py-2 text-muted-foreground">No active installments</p>
              )}
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
