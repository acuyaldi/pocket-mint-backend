"use client";

import { useMemo, useState, useCallback, useEffect, FormEvent } from "react";
import { useTransactions, useCreateTransaction } from "@/src/features/transactions/hooks/useTransactions";
import { useWallets } from "@/src/features/wallets/hooks/useWallets";
import { WalletCard } from "@/components/WalletCard";
import { Plus, X, Loader2, TrendingUp, TrendingDown, ChevronDown } from "lucide-react";
import type { Wallet } from "@/src/types/wallet";

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
  const [addDescription, setAddDescription] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addType, setAddType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [addWalletId, setAddWalletId] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleAddAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    setAddAmount(formatted);
  }, []);

  const handleAddSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    const rawAmount = addAmount.replace(/\./g, "");
    const parsedAmount = Number(rawAmount);
    if (!addDescription.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    setIsCreating(true);
    try {
      await createTransaction.mutateAsync({
        description: addDescription.trim(),
        amount: parsedAmount,
        type: addType,
        date: new Date().toISOString(),
        walletId: addWalletId || undefined,
      });
      setIsAddModalOpen(false);
      setAddDescription("");
      setAddAmount("");
      setAddType("EXPENSE");
      setAddWalletId("");
    } catch (err) {
      console.error("Gagal menambah transaksi:", err);
    } finally {
      setIsCreating(false);
    }
  }, [addDescription, addAmount, addType, addWalletId, createTransaction]);

  const openAddTransaction = useCallback(() => setIsAddModalOpen(true), []);

  // Listen for FAB button click from TopBar (cross-component event bridge)
  useEffect(() => {
    const handler = () => setIsAddModalOpen(true);
    window.addEventListener("fab-add-transaction", handler);
    return () => window.removeEventListener("fab-add-transaction", handler);
  }, []);

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

  const netSavings = income - expense;

  const formatRupiah = (amount: number) =>
    `Rp ${amount.toLocaleString("id-ID")}`;

  const dashboardWallets = useMemo(
    () => wallets.filter((w) => !w.isArchived).slice(0, 2),
    [wallets],
  );

  return (
    <div className="w-full">
      <div style={{ paddingBottom: "40px" }}>
        <div className="flex items-start justify-between">
          {/* Left: Net Worth value + badge */}
          <div>
            <div
              className="uppercase font-semibold"
              style={{
                fontFamily: "var(--font-inter)",
                fontSize: "11px",
                fontWeight: 600,
                color: "#64748B",
                letterSpacing: "0.05em",
              }}
            >
              NET WORTH
            </div>

            <div
              style={{
                fontFamily: "var(--font-hanken)",
                fontSize: "40px",
                fontWeight: 600,
                color: "#38BDF8",
                lineHeight: 1.1,
                marginTop: "8px",
              }}
            >
              {formatRupiah(netWorth)}
            </div>

            <div
              className="inline-flex items-center gap-1"
              style={{
                borderRadius: "9999px",
                padding: "3px 10px",
                marginTop: "8px",
                backgroundColor: "rgba(16, 185, 129, 0.15)",
                border: "1px solid #10B981",
                fontFamily: "var(--font-inter)",
                fontSize: "11px",
                fontWeight: 600,
                color: "#10B981",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
              +4.2% bulan ini
            </div>
          </div>

          {/* Right: Total Aset / Total Utang / Net Savings + Add Transaction Button */}
          <div className="flex flex-col items-end gap-3" style={{ paddingTop: "4px" }}>
            <button
              onClick={openAddTransaction}
              className="flex items-center gap-1.5 transition-opacity hover:opacity-90"
              style={{
                backgroundColor: "#38BDF8",
                color: "#0F172A",
                padding: "9px 16px",
                borderRadius: "4px",
                fontSize: "13px",
                fontWeight: 600,
                fontFamily: "var(--font-inter)",
                border: "none",
                cursor: "pointer",
              }}
            >
              <Plus className="size-4" strokeWidth={2.5} />
              Add Transaction
            </button>
            <div className="flex gap-8">
            <div className="text-right">
              <div
                className="uppercase font-semibold"
                style={{
                  fontFamily: "var(--font-inter)",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#64748B",
                  letterSpacing: "0.05em",
                }}
              >
                Total Aset
              </div>
              <div
                style={{
                  fontFamily: "var(--font-inter)",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#F8FAFC",
                  marginTop: "4px",
                }}
              >
                {formatRupiah(totalAssets)}
              </div>
            </div>
            <div className="text-right">
              <div
                className="uppercase font-semibold"
                style={{
                  fontFamily: "var(--font-inter)",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#64748B",
                  letterSpacing: "0.05em",
                }}
              >
                Total Utang
              </div>
              <div
                style={{
                  fontFamily: "var(--font-inter)",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#EF4444",
                  marginTop: "4px",
                }}
              >
                {formatRupiah(totalDebts)}
              </div>
            </div>
            <div className="text-right">
              <div
                className="uppercase font-semibold"
                style={{
                  fontFamily: "var(--font-inter)",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#64748B",
                  letterSpacing: "0.05em",
                }}
              >
                Net Savings
              </div>
              <div
                style={{
                  fontFamily: "var(--font-inter)",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: netSavings >= 0 ? "#F8FAFC" : "#EF4444",
                  marginTop: "4px",
                }}
              >
                {formatRupiah(netSavings)}
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="grid"
        style={{
          gridTemplateColumns: "1fr 300px",
          gap: "32px",
          paddingBottom: "24px",
        }}
      >
        <div className="flex flex-col" style={{ gap: "32px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {dashboardWallets.length > 0 &&
              dashboardWallets.map((w) => (
                <WalletCard key={w.id} wallet={w} variant="compact" />
              ))}
            {dashboardWallets.length === 0 &&
              !walletsData &&
              [...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse"
                  style={{
                    background: "#1E293B",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    height: "100px",
                  }}
                />
              ))}
          </div>

          <div style={{ backgroundColor: "#1E293B", border: "1px solid #334155", borderRadius: "8px", padding: "20px" }}>
            <div className="flex items-center justify-between" style={{ marginBottom: "12px" }}>
              <span
                className="uppercase font-semibold"
                style={{ fontFamily: "var(--font-inter)", fontSize: "11px", fontWeight: 600, color: "#64748B", letterSpacing: "0.05em" }}
              >
                TRANSAKSI TERBARU
              </span>
              <span
                className="cursor-pointer"
                style={{ fontFamily: "var(--font-inter)", fontSize: "11px", fontWeight: 600, color: "#38BDF8" }}
              >
                Lihat semua &rarr;
              </span>
            </div>
            {transactions.slice(0, 5).map((t, i) => (
              <div key={t.id || i}>
                {i > 0 && <div style={{ height: "1px", backgroundColor: "#334155" }} />}
                <div className="flex items-center" style={{ padding: "16px 0" }}>
                  <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      backgroundColor: t.type === "INCOME" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                      fontSize: "12px",
                      color: t.type === "INCOME" ? "#10B981" : "#EF4444",
                    }}
                  >
                    {t.type === "INCOME" ? "\u2191" : "\u2193"}
                  </div>
                  <div className="ml-2 flex-1 min-w-0">
                    <div style={{ fontFamily: "var(--font-inter)", fontSize: "14px", fontWeight: 400, color: "#F8FAFC" }} className="truncate">
                      {t.description || "Transaction"}
                    </div>
                    <div style={{ fontFamily: "var(--font-inter)", fontSize: "12px", color: "#94A3B8" }}>
                      {new Date(t.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} &middot;{" "}
                      {t.categoryId ?? "Uncategorized"}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div style={{ fontFamily: "var(--font-inter)", fontSize: "14px", fontWeight: 600, color: t.type === "EXPENSE" ? "#EF4444" : "#10B981" }}>
                      {t.type === "EXPENSE" ? "-" : "+"}{formatRupiah(t.amount)}
                    </div>
                    <div style={{ fontFamily: "var(--font-inter)", fontSize: "12px", color: "#94A3B8" }}>
                      {wallets.find((w) => w.id === t.walletId)?.name ?? "-"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {transactions.length === 0 && !isLoading && (
              <div style={{ fontFamily: "var(--font-inter)", fontSize: "14px", color: "#94A3B8", padding: "16px 0", textAlign: "center" }}>
                Belum ada transaksi
              </div>
            )}
            {isLoading && (
              <div style={{ fontFamily: "var(--font-inter)", fontSize: "14px", color: "#94A3B8", padding: "16px 0", textAlign: "center" }}>
                Memuat...
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col" style={{ gap: "32px" }}>
          <div style={{ backgroundColor: "#1E293B", border: "1px solid #334155", borderRadius: "8px", padding: "20px" }}>
            <div
              className="uppercase font-semibold"
              style={{ fontFamily: "var(--font-inter)", fontSize: "11px", fontWeight: 600, color: "#64748B", letterSpacing: "0.05em", marginBottom: "12px" }}
            >
              MONTHLY P&L
            </div>
            <div className="flex items-center justify-between" style={{ padding: "8px 0" }}>
              <div className="flex items-center gap-2">
                <div style={{ width: "5px", height: "5px", borderRadius: "9999px", backgroundColor: "#10B981" }} />
                <span style={{ fontFamily: "var(--font-inter)", fontSize: "12px", color: "#94A3B8" }}>Pemasukan</span>
              </div>
              <span style={{ fontFamily: "var(--font-inter)", fontSize: "12px", fontWeight: 600, color: "#10B981" }}>{formatRupiah(income)}</span>
            </div>
            <div style={{ height: "1px", backgroundColor: "#334155" }} />
            <div className="flex items-center justify-between" style={{ padding: "8px 0" }}>
              <div className="flex items-center gap-2">
                <div style={{ width: "5px", height: "5px", borderRadius: "9999px", backgroundColor: "#EF4444" }} />
                <span style={{ fontFamily: "var(--font-inter)", fontSize: "12px", color: "#94A3B8" }}>Pengeluaran</span>
              </div>
              <span style={{ fontFamily: "var(--font-inter)", fontSize: "12px", fontWeight: 600, color: "#EF4444" }}>{formatRupiah(expense)}</span>
            </div>
            <div style={{ height: "1px", backgroundColor: "#334155" }} />
            <div className="flex items-center justify-between" style={{ padding: "8px 0" }}>
              <div className="flex items-center gap-2">
                <div style={{ width: "5px", height: "5px", borderRadius: "9999px", backgroundColor: netSavings >= 0 ? "#10B981" : "#EF4444" }} />
                <span style={{ fontFamily: "var(--font-inter)", fontSize: "12px", color: "#94A3B8" }}>Net Savings</span>
              </div>
              <span style={{ fontFamily: "var(--font-inter)", fontSize: "12px", fontWeight: 600, color: netSavings >= 0 ? "#F8FAFC" : "#EF4444" }}>{formatRupiah(netSavings)}</span>
            </div>
          </div>

          <div style={{ backgroundColor: "#1E293B", border: "1px solid #334155", borderRadius: "8px", padding: "20px" }}>
            <div
              className="uppercase font-semibold"
              style={{ fontFamily: "var(--font-inter)", fontSize: "11px", fontWeight: 600, color: "#64748B", letterSpacing: "0.05em", marginBottom: "12px" }}
            >
              PENGELUARAN
            </div>
            {(() => {
              const categoryMap = new Map<string, number>();
              transactions
                .filter((t) => t.type === "EXPENSE")
                .forEach((t) => {
                  const cat = t.categoryId ?? "Lainnya";
                  categoryMap.set(cat, (categoryMap.get(cat) || 0) + t.amount);
                });
              const totalExpense = Array.from(categoryMap.values()).reduce((a, b) => a + b, 0) || 1;
              const sorted = Array.from(categoryMap.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

              return sorted.map(([cat, amt], i) => {
                const pct = Math.round((amt / totalExpense) * 100);
                return (
                  <div key={cat}>
                    {i > 0 && <div style={{ height: "1px", backgroundColor: "#334155", margin: "8px 0" }} />}
                    <div className="flex items-center gap-2" style={{ padding: "4px 0" }}>
                      <span style={{ fontFamily: "var(--font-inter)", fontSize: "11px", color: "#94A3B8", width: "52px", flexShrink: 0 }} className="truncate">
                        {cat}
                      </span>
                      <div style={{ flex: 1, height: "4px", backgroundColor: "#334155", borderRadius: "9999px", overflow: "hidden" }}>
                        <div
                          style={{ height: "100%", borderRadius: "9999px", backgroundColor: "#38BDF8", width: `${pct}%` }}
                        />
                      </div>
                      <span style={{ fontFamily: "var(--font-inter)", fontSize: "11px", fontWeight: 500, color: "#F8FAFC", flexShrink: 0 }}>
                        {formatRupiah(amt)}
                      </span>
                    </div>
                  </div>
                );
              });
            })()}
            {transactions.filter((t) => t.type === "EXPENSE").length === 0 && (
              <div style={{ fontFamily: "var(--font-inter)", fontSize: "14px", color: "#94A3B8", padding: "12px 0", textAlign: "center" }}>
                Belum ada pengeluaran
              </div>
            )}
          </div>

          <div style={{ backgroundColor: "#1E293B", border: "1px solid #334155", borderRadius: "8px", padding: "20px" }}>
            <div className="flex items-center justify-between" style={{ marginBottom: "12px" }}>
              <span
                className="uppercase font-semibold"
                style={{ fontFamily: "var(--font-inter)", fontSize: "11px", fontWeight: 600, color: "#64748B", letterSpacing: "0.05em" }}
              >
                CICILAN AKTIF
              </span>
              <span
                className="cursor-pointer"
                style={{ fontFamily: "var(--font-inter)", fontSize: "11px", fontWeight: 600, color: "#38BDF8" }}
              >
                Lihat semua &rarr;
              </span>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span style={{ fontFamily: "var(--font-inter)", fontSize: "13px", fontWeight: 500, color: "#F8FAFC" }}>Kredivo</span>
                <span style={{ fontFamily: "var(--font-inter)", fontSize: "11px", color: "#94A3B8" }}>3/12</span>
              </div>
              <div style={{ fontFamily: "var(--font-inter)", fontSize: "12px", color: "#94A3B8", marginBottom: "8px" }}>
                Cicilan laptop - Rp 350.000/bln
              </div>
              {/* Progress bar */}
              <div style={{ height: "4px", backgroundColor: "#334155", borderRadius: "9999px", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: "9999px", backgroundColor: "#10B981", width: "25%" }} />
              </div>
              <div className="flex justify-between" style={{ fontFamily: "var(--font-inter)", fontSize: "12px", color: "#94A3B8", marginTop: "4px" }}>
                <span>25% lunas</span>
                <span>9 cicilan lagi</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Add Transaction Modal ── */}
      {isAddModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => { if (!isCreating) setIsAddModalOpen(false); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#1E293B",
              border: "1px solid #334155",
              borderRadius: "8px",
              width: "100%",
              maxWidth: "420px",
              margin: "0 16px",
            }}
          >
            {/* Header */}
            <div style={{ padding: "20px 24px 8px" }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#F8FAFC", fontFamily: "var(--font-hanken)" }}>Tambah Transaksi</h3>
                  <p style={{ fontSize: "12px", color: "#64748B", fontFamily: "var(--font-inter)", marginTop: "2px" }}>Catat pemasukan atau pengeluaran baru</p>
                </div>
                <button
                  onClick={() => { if (!isCreating) setIsAddModalOpen(false); }}
                  className="flex items-center justify-center"
                  style={{ width: "32px", height: "32px", borderRadius: "6px", color: "#94A3B8", background: "none", border: "none", cursor: "pointer" }}
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
            <div style={{ height: "1px", backgroundColor: "#334155", margin: "0 24px" }} />
            {/* Form */}
            <form onSubmit={handleAddSubmit} style={{ padding: "16px 24px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Description */}
              <div className="flex flex-col gap-2">
                <label style={{ fontSize: "12px", fontWeight: 500, color: "#94A3B8", fontFamily: "var(--font-inter)" }}>Deskripsi Transaksi</label>
                <input
                  type="text"
                  placeholder="Beli kopi, Gaji bulanan..."
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  required
                  style={{ height: "44px", padding: "0 12px", backgroundColor: "#334155", border: "1px solid #334155", borderRadius: "6px", color: "#F8FAFC", fontSize: "14px", fontFamily: "var(--font-inter)", outline: "none" }}
                />
              </div>
              {/* Amount */}
              <div className="flex flex-col gap-2">
                <label style={{ fontSize: "12px", fontWeight: 500, color: "#94A3B8", fontFamily: "var(--font-inter)" }}>Jumlah / Nominal</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: "#64748B", pointerEvents: "none" }}>Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={addAmount}
                    onChange={handleAddAmountChange}
                    required
                    style={{ height: "44px", padding: "0 12px 0 38px", backgroundColor: "#334155", border: "1px solid #334155", borderRadius: "6px", color: "#F8FAFC", fontSize: "14px", fontFamily: "var(--font-inter)", outline: "none", width: "100%" }}
                  />
                </div>
              </div>
              {/* Wallet */}
              <div className="flex flex-col gap-2">
                <label style={{ fontSize: "12px", fontWeight: 500, color: "#94A3B8", fontFamily: "var(--font-inter)" }}>Wallet / Sumber Dana</label>
                <div style={{ position: "relative" }}>
                  <select
                    value={addWalletId}
                    onChange={(e) => setAddWalletId(e.target.value)}
                    style={{ height: "44px", padding: "0 36px 0 12px", backgroundColor: "#334155", border: "1px solid #334155", borderRadius: "6px", color: "#F8FAFC", fontSize: "14px", fontFamily: "var(--font-inter)", outline: "none", width: "100%", appearance: "none" }}
                  >
                    <option value="" style={{ backgroundColor: "#1E293B", color: "#94A3B8" }}>Pilih wallet (opsional)</option>
                    {wallets.map((w: Wallet) => (
                      <option key={w.id} value={w.id} style={{ backgroundColor: "#1E293B", color: "#F8FAFC" }}>
                        {w.name} — {w.type.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="size-4" style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748B", pointerEvents: "none" }} />
                </div>
              </div>
              {/* Type toggle */}
              <div className="flex flex-col gap-2">
                <label style={{ fontSize: "12px", fontWeight: 500, color: "#94A3B8", fontFamily: "var(--font-inter)" }}>Tipe Transaksi</label>
                <div className="flex gap-2">
                  {(["EXPENSE", "INCOME"] as const).map((type) => {
                    const active = addType === type;
                    const label = type === "EXPENSE" ? "Pengeluaran" : "Pemasukan";
                    const TypeIcon = type === "EXPENSE" ? TrendingDown : TrendingUp;
                    const activeStyle = type === "EXPENSE"
                      ? { backgroundColor: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#EF4444" }
                      : { backgroundColor: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)", color: "#10B981" };
                    const inactiveStyle = { backgroundColor: "#1E293B", border: "1px solid #334155", color: "#64748B" };
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setAddType(type)}
                        className="flex-1 flex items-center justify-center gap-2 transition-all"
                        style={{ height: "44px", borderRadius: "6px", fontSize: "13px", fontWeight: 500, fontFamily: "var(--font-inter)", cursor: "pointer", ...(active ? activeStyle : inactiveStyle) }}
                      >
                        <TypeIcon className="size-4" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Actions */}
              <div className="flex items-center gap-3" style={{ paddingTop: "4px" }}>
                <button
                  type="button"
                  onClick={() => { if (!isCreating) setIsAddModalOpen(false); }}
                  className="flex-1 transition-opacity hover:opacity-80"
                  style={{ height: "44px", backgroundColor: "#334155", border: "1px solid #334155", borderRadius: "6px", color: "#94A3B8", fontSize: "14px", fontFamily: "var(--font-inter)", cursor: "pointer" }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 flex items-center justify-center gap-2 font-medium transition-opacity hover:opacity-90"
                  style={{ height: "44px", backgroundColor: "#38BDF8", color: "#0F172A", border: "none", borderRadius: "6px", fontSize: "14px", fontFamily: "var(--font-inter)", cursor: isCreating ? "not-allowed" : "pointer", opacity: isCreating ? 0.7 : 1 }}
                >
                  {isCreating ? (<><Loader2 className="size-4 animate-spin" /> Menyimpan...</>) : "Simpan Transaksi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}