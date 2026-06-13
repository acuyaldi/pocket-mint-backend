"use client";

import { useState, useMemo, useCallback, FormEvent, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from "@/src/features/transactions/hooks/useTransactions";
import { useWallets } from "@/src/features/wallets/hooks/useWallets";
import type { Wallet } from "@/src/types/wallet";
import { Transaction } from "@/src/types/transaction";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn, formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCcw,
  Pencil,
  Trash2,
  Plus,
  X,
  Loader2,
  TrendingUp,
  TrendingDown,
  Search,
  CalendarRange,
  CalendarDays,
  CalendarClock,
  Calendar,
  ChevronDown,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────


function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

function formatRupiah(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// ── Type config ──────────────────────────────────────────────────────────────

const typeConfig = {
  income: {
    icon: ArrowUpRight,
    label: "Pemasukan",
    iconClass: "text-emerald-400",
    amountClass: "text-emerald-400 font-semibold",
    badgeClass:
      "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    prefix: "+",
    bgClass: "bg-emerald-500/10",
  },
  expense: {
    icon: ArrowDownLeft,
    label: "Pengeluaran",
    iconClass: "text-rose-400",
    amountClass: "text-rose-400 font-semibold",
    badgeClass: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
    prefix: "-",
    bgClass: "bg-rose-500/10",
  },
  transfer: {
    icon: RefreshCcw,
    label: "Transfer",
    iconClass: "text-indigo-400",
    amountClass: "text-indigo-400 font-semibold",
    badgeClass: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
    prefix: "",
    bgClass: "bg-indigo-500/10",
  },
};

// ── Date filter types ────────────────────────────────────────────────────────

type DateFilter = "all" | "7d" | "30d" | "custom";

const PAGE_SIZE = 20;

// ── Animation variants ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
};

// ── Page Component ───────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { data, isLoading } = useTransactions();
  const { data: walletsData, isLoading: isLoadingWallets } = useWallets();
  const updateTransaction = useUpdateTransaction();
  const createTransaction = useCreateTransaction();
  const deleteTransaction = useDeleteTransaction();
  const transactions: Transaction[] = useMemo(() => data ?? [], [data]);
  const wallets = useMemo(() => walletsData ?? [], [walletsData]);

  // Auth guard
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) router.replace("/login");
    })();
  }, []);

  // ── Date filter state ───────────────────────────────────────────────────────
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // ── Search state ────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");

  // ── Filtered transactions ───────────────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    const now = new Date();

    return transactions.filter((tx) => {
      // Date filter
      const txDate = new Date(tx.date);
      let passDate = true;
      if (dateFilter === "7d") {
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - 7);
        passDate = txDate >= cutoff;
      } else if (dateFilter === "30d") {
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - 30);
        passDate = txDate >= cutoff;
      } else if (dateFilter === "custom") {
        if (customFrom) {
          passDate = passDate && txDate >= new Date(customFrom);
        }
        if (customTo) {
          const toDate = new Date(customTo);
          toDate.setHours(23, 59, 59, 999);
          passDate = passDate && txDate <= toDate;
        }
      }

      // Search filter
      const passSearch =
        !search ||
        (tx.description ?? "")
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        (tx.category?.name ?? "")
          .toLowerCase()
          .includes(search.toLowerCase());

      return passDate && passSearch;
    });
  }, [transactions, dateFilter, customFrom, customTo, search]);

  // ── Pagination state ──────────────────────────────────────────────────────
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [prevFilterKey, setPrevFilterKey] = useState(`${dateFilter}-${customFrom}-${customTo}-${search}`);

  // Reset pagination when filters change (derived state pattern – no effect needed)
  const filterKey = `${dateFilter}-${customFrom}-${customTo}-${search}`;
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setVisibleCount(PAGE_SIZE);
  }

  const visibleTransactions = useMemo(
    () => filteredTransactions.slice(0, visibleCount),
    [filteredTransactions, visibleCount]
  );
  const hasMore = visibleCount < filteredTransactions.length;

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }, []);

  // ── Edit modal state ────────────────────────────────────────────────────────
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editType, setEditType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [editDate, setEditDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const openEditModal = useCallback((tx: Transaction) => {
    setEditingTx(tx);
    setEditDescription(tx.description ?? "");
    setEditAmount(formatRupiah(String(tx.amount)));
    setEditType(tx.type === "INCOME" ? "INCOME" : "EXPENSE");
    // Pre-fill date as YYYY-MM-DD for the input[type=date]
    setEditDate(tx.date ? tx.date.slice(0, 10) : "");
  }, []);

  const closeEditModal = useCallback(() => {
    if (!isSaving) setEditingTx(null);
  }, [isSaving]);

  const handleEditAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    setEditAmount(formatRupiah(raw));
  }, []);

  const handleEditSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;

    const rawAmount = editAmount.replace(/\./g, "");
    const parsedAmount = Number(rawAmount);
    if (!editDescription.trim() || isNaN(parsedAmount) || parsedAmount <= 0)
      return;

    setIsSaving(true);
    try {
      await updateTransaction.mutateAsync({
        id: editingTx.id,
        description: editDescription.trim(),
        amount: parsedAmount,
        type: editType,
        date: editDate ? new Date(editDate).toISOString() : undefined,
      });
      setEditingTx(null);
    } catch (err) {
      console.error("Gagal memperbarui transaksi:", err);
    } finally {
      setIsSaving(false);
    }
  }, [editingTx, editAmount, editDescription, editType, editDate, updateTransaction]);

  // ── Delete confirmation state ───────────────────────────────────────────────
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = useCallback((id: string) => {
    setDeleteConfirmId(id);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      await deleteTransaction.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Gagal menghapus transaksi:", err);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteConfirmId, deleteTransaction]);

  // ── Add transaction modal state ──────────────────────────────────────────────
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addDescription, setAddDescription] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addType, setAddType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [addWalletId, setAddWalletId] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleAddAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    setAddAmount(formatRupiah(raw));
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

  // ── Date filter buttons config ──────────────────────────────────────────────
  const dateFilters: {
    label: string;
    value: DateFilter;
    icon: typeof Calendar;
  }[] = [
    { label: "Semua", value: "all", icon: CalendarRange },
    { label: "7 Hari Terakhir", value: "7d", icon: CalendarDays },
    { label: "30 Hari Terakhir", value: "30d", icon: CalendarClock },
    { label: "Kustom", value: "custom", icon: Calendar },
  ];

  // ── Skeleton ────────────────────────────────────────────────────────────────
  const renderTableSkeleton = () => (
    <div className="space-y-2">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="h-12 bg-zinc-800/50 rounded-lg animate-pulse"
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">

      <motion.main
        className="space-y-6"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
      >
        {/* Back nav + Title */}
        <motion.div variants={fadeUp} className="space-y-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-emerald-400 transition-colors duration-200 group"
          >
            <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
            Kembali ke Dashboard
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-50">
                Semua Riwayat Transaksi
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                Telusuri, cari, dan edit seluruh catatan keuangan Anda.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-zinc-500 tabular-nums">
                {filteredTransactions.length} dari{" "}
                {transactions.length} transaksi
              </div>
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-400 text-[#003919] font-semibold h-9 px-4 gap-2 rounded-lg shadow-lg shadow-emerald-500/10"
              >
                <Plus className="size-4" />
                Tambah Transaksi
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Filter Bar */}
        <motion.div variants={fadeUp}>
          <Card className="border shadow-sm" style={{ backgroundColor: "#0e0e0e", borderColor: "#1a1a1a" }}>
            <CardContent className="p-4 space-y-4">
              {/* Date filter chips */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-zinc-400 mr-1">
                  Periode:
                </span>
                {dateFilters.map((df) => {
                  const active = dateFilter === df.value;
                  const Icon = df.icon;
                  return (
                    <button
                      key={df.value}
                      onClick={() => setDateFilter(df.value)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 cursor-pointer",
                        active
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                          : "bg-zinc-800/40 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
                      )}
                    >
                      <Icon className="size-3.5" />
                      {df.label}
                    </button>
                  );
                })}
              </div>

              {/* Custom date inputs */}
              <AnimatePresence>
                {dateFilter === "custom" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-1"
                  >
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-zinc-400">
                        Dari Tanggal
                      </label>
                      <Input
                        type="date"
                        value={customFrom}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        className="h-9 bg-surface-highlight/40 border-[#1a1a1a] text-text-primary text-sm focus-visible:ring-1 focus-visible:ring-mint/40 focus-visible:border-mint transition-colors duration-150 ease-out [color-scheme:dark]"
                      />
                    </div>
                    <span className="text-zinc-600 pt-5 hidden sm:block">—</span>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-zinc-400">
                        Sampai Tanggal
                      </label>
                      <Input
                        type="date"
                        value={customTo}
                        onChange={(e) => setCustomTo(e.target.value)}
                        className="h-9 bg-surface-highlight/40 border-[#1a1a1a] text-text-primary text-sm focus-visible:ring-1 focus-visible:ring-mint/40 focus-visible:border-mint transition-colors duration-150 ease-out [color-scheme:dark]"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Search */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                <Input
                  placeholder="Cari transaksi…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm bg-surface-highlight/40 border-[#1a1a1a] text-text-primary placeholder:text-zinc-500 focus:border-mint focus:ring-mint/20 transition-all duration-150 ease-out"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Transaction Table */}
        <motion.section variants={fadeUp} aria-label="Tabel riwayat transaksi">
          <Card className="border shadow-sm overflow-hidden" style={{ backgroundColor: "#0e0e0e", borderColor: "#1a1a1a" }}>
            {isLoading ? (
              <CardContent className="pt-5">{renderTableSkeleton()}</CardContent>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-surface-highlight">
                      <TableHead className="font-semibold text-text-secondary w-32">
                        Tanggal
                      </TableHead>
                      <TableHead className="font-semibold text-text-secondary">
                        Deskripsi
                      </TableHead>
                      <TableHead className="font-semibold text-text-secondary hidden md:table-cell">
                        Kategori
                      </TableHead>
                      <TableHead className="font-semibold text-text-secondary hidden sm:table-cell">
                        Tipe
                      </TableHead>
                      <TableHead className="font-semibold text-text-secondary text-right">
                        Jumlah
                      </TableHead>
                      <TableHead className="font-semibold text-text-secondary text-right w-16">
                        Aksi
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-zinc-400 py-14 text-sm"
                        >
                          Tidak ada transaksi yang ditemukan.
                        </TableCell>
                      </TableRow>
                    ) : (
                      visibleTransactions.map((tx, idx) => {
                        const normalizedType = tx.type.toLowerCase() as
                          | "income"
                          | "expense"
                          | "transfer";
                        const tConfig =
                          typeConfig[normalizedType] ?? typeConfig.expense;
                        const Icon = tConfig.icon;

                        return (
                          <TableRow
                            key={tx.id}
                            className={cn(
                              "transition-colors hover:bg-surface-highlight",
                              idx % 2 === 0 ? "bg-surface" : "bg-surface-low"
                            )}
                          >
                            <TableCell className="text-sm text-zinc-400 whitespace-nowrap">
                              {formatDate(tx.date)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={cn(
                                    "p-1.5 rounded-lg",
                                    tConfig.bgClass
                                  )}
                                >
                                  <Icon
                                    className={cn(
                                      "size-3.5",
                                      tConfig.iconClass
                                    )}
                                  />
                                </div>
                                <span className="text-sm font-medium text-zinc-50 truncate max-w-[220px]">
                                  {tx.description}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <span className="text-sm text-zinc-400">
                                {tx.category?.name ?? "-"}
                              </span>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Badge
                                variant="outline"
                                className={cn("text-xs", tConfig.badgeClass)}
                              >
                                {tConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell
                              className={cn(
                                "text-sm text-right font-mono tabular-nums",
                                tConfig.amountClass
                              )}
                            >
                              {tConfig.prefix}
                              {formatCurrency(tx.amount)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => openEditModal(tx)}
                                  className="inline-flex items-center justify-center size-8 rounded-lg text-text-secondary hover:text-emerald-400 hover:bg-emerald-500/10 transition-all duration-150 ease-out cursor-pointer"
                                  title="Edit transaksi"
                                >
                                  <Pencil className="size-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(tx.id)}
                                  className="inline-flex items-center justify-center size-8 rounded-lg text-text-secondary hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-150 ease-out cursor-pointer"
                                  title="Hapus transaksi"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center mt-4">
              <Button
                onClick={loadMore}
                variant="outline"
                size="sm"
                className="border-[#1a1a1a] bg-[#0e0e0e] text-text-secondary hover:text-text-primary hover:border-[#262626] transition-all duration-150 ease-out"
              >
                Muat Lebih Banyak ({filteredTransactions.length - visibleCount} tersisa)
              </Button>
            </div>
          )}
        </motion.section>
      </motion.main>

      {/* ── Edit Transaction Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {editingTx && (
          <motion.div
            key="edit-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={closeEditModal}
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
              <Card className="border shadow-2xl" style={{ backgroundColor: "#111111", borderColor: "#262626" }}>
                {/* Header */}
                <div className="px-6 pt-6 pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-zinc-50">
                        Edit Transaksi
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Perbarui detail transaksi ini
                      </p>
                    </div>
                    <button
                      onClick={closeEditModal}
                      className="size-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 transition-all cursor-pointer"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>

                <Separator className="bg-divider/60" />

                {/* Form */}
                <CardContent className="pt-4 pb-6">
                  <form onSubmit={handleEditSubmit} className="space-y-5">
                    {/* Description */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium text-zinc-400">
                        Deskripsi Transaksi
                      </label>
                      <Input
                        type="text"
                        placeholder="Beli nasi padang"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        required
                        className="h-11 bg-surface-highlight/40 border-[#1a1a1a] text-text-primary placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-mint/40 focus-visible:border-mint transition-colors duration-150 ease-out"
                      />
                    </div>

                    {/* Amount */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium text-zinc-400">
                        Jumlah / Nominal
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500 pointer-events-none select-none">
                          Rp
                        </span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={editAmount}
                          onChange={handleEditAmountChange}
                          required
                          className="h-11 pl-10 pr-4 bg-surface-highlight/40 border-[#1a1a1a] text-text-primary placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-mint/40 focus-visible:border-mint transition-colors duration-150 ease-out [appearance:textfield]"
                        />
                      </div>
                    </div>

                    {/* Transaction Type */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium text-zinc-400">
                        Tipe Transaksi
                      </label>
                      <div className="flex gap-2">
                        {(["EXPENSE", "INCOME"] as const).map((type) => {
                          const active = editType === type;
                          const label =
                            type === "EXPENSE" ? "Pengeluaran" : "Pemasukan";
                          const Icon =
                            type === "EXPENSE" ? TrendingDown : TrendingUp;
                          const activeClass =
                            type === "EXPENSE"
                              ? "bg-red-500/15 border-red-500/40 text-red-400"
                              : "bg-emerald-500/15 border-emerald-500/40 text-emerald-400";
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setEditType(type)}
                              className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-md border text-sm font-medium transition-all duration-200 cursor-pointer ${
                                active
                                  ? activeClass
                                  : "bg-zinc-800/40 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400"
                              }`}
                            >
                              <Icon className="size-4" />
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Date */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium text-zinc-400">
                        Tanggal Transaksi
                      </label>
                      <Input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="h-11 bg-surface-highlight/40 border-[#1a1a1a] text-text-primary focus-visible:ring-1 focus-visible:ring-mint/40 focus-visible:border-mint transition-colors duration-150 ease-out [color-scheme:dark]"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={closeEditModal}
                        disabled={isSaving}
                        className="flex-1 h-11 border-[#1a1a1a] bg-surface-highlight/40 text-text-secondary hover:bg-surface-highlight hover:text-text-primary disabled:opacity-50"
                      >
                        Batal
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSaving}
                        className="flex-1 h-11 bg-mint hover:bg-mint-bright text-on-primary font-medium disabled:opacity-50 gap-2"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Menyimpan...
                          </>
                        ) : (
                          "Simpan Perubahan"
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

      {/* ── Delete Confirmation Modal ───────────────────────────────────── */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div
            key="delete-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => { if (!isDeleting) setDeleteConfirmId(null); }}
          >
            <motion.div
              key="delete-modal-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm mx-4"
            >
              <Card className="border shadow-2xl" style={{ backgroundColor: "#111111", borderColor: "#262626" }}>
                <CardContent className="pt-6 pb-6">
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="size-12 rounded-full bg-rose-500/10 flex items-center justify-center">
                      <Trash2 className="size-5 text-rose-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-zinc-50">Hapus Transaksi?</h3>
                      <p className="text-sm text-zinc-400 mt-1">
                        Transaksi yang dihapus akan mengembalikan saldo wallet secara otomatis. Tindakan ini tidak dapat dibatalkan.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 w-full">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => { if (!isDeleting) setDeleteConfirmId(null); }}
                        disabled={isDeleting}
                        className="flex-1 h-11 border-[#1a1a1a] bg-surface-highlight/40 text-text-secondary hover:bg-surface-highlight hover:text-text-primary disabled:opacity-50"
                      >
                        Batal
                      </Button>
                      <Button
                        onClick={confirmDelete}
                        disabled={isDeleting}
                        className="flex-1 h-11 bg-rose-500 hover:bg-rose-400 text-white font-medium disabled:opacity-50 gap-2"
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Menghapus...
                          </>
                        ) : (
                          "Hapus"
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add Transaction Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div
            key="add-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => { if (!isCreating) setIsAddModalOpen(false); }}
          >
            <motion.div
              key="add-modal-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md mx-4"
            >
              <Card className="border shadow-2xl" style={{ backgroundColor: "#111111", borderColor: "#262626" }}>
                <div className="px-6 pt-6 pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-zinc-50">Tambah Transaksi</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">Catat pemasukan atau pengeluaran baru</p>
                    </div>
                    <button
                      onClick={() => { if (!isCreating) setIsAddModalOpen(false); }}
                      className="size-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 transition-all cursor-pointer"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
                <Separator className="bg-divider/60" />
                <CardContent className="pt-4 pb-6">
                  <form onSubmit={handleAddSubmit} className="space-y-5">
                    {/* Description */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium text-zinc-400">Deskripsi Transaksi</label>
                      <Input
                        type="text"
                        placeholder="Beli kopi, Gaji bulanan..."
                        value={addDescription}
                        onChange={(e) => setAddDescription(e.target.value)}
                        required
                        className="h-11 bg-surface-highlight/40 border-[#1a1a1a] text-text-primary placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500 transition-colors duration-150 ease-out"
                      />
                    </div>

                    {/* Amount */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium text-zinc-400">Jumlah / Nominal</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500 pointer-events-none select-none">Rp</span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={addAmount}
                          onChange={handleAddAmountChange}
                          required
                          className="h-11 pl-10 pr-4 bg-surface-highlight/40 border-[#1a1a1a] text-text-primary placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500 transition-colors duration-150 ease-out [appearance:textfield]"
                        />
                      </div>
                    </div>

                    {/* Wallet Dropdown */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium text-zinc-400">Wallet / Sumber Dana</label>
                      <div className="relative">
                        <select
                          value={addWalletId}
                          onChange={(e) => setAddWalletId(e.target.value)}
                          className="w-full h-11 px-3.5 pr-10 rounded-md text-sm appearance-none bg-surface-highlight/40 border border-[#1a1a1a] text-text-primary focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500 transition-colors duration-150 ease-out cursor-pointer"
                        >
                          <option value="" className="bg-zinc-900 text-zinc-400">Pilih wallet (opsional)</option>
                          {wallets.map((w: Wallet) => (
                            <option key={w.id} value={w.id} className="bg-zinc-900 text-zinc-50">
                              {w.name} — {w.type.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500 pointer-events-none" />
                      </div>
                    </div>

                    {/* Transaction Type */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium text-zinc-400">Tipe Transaksi</label>
                      <div className="flex gap-2">
                        {(["EXPENSE", "INCOME"] as const).map((type) => {
                          const active = addType === type;
                          const label = type === "EXPENSE" ? "Pengeluaran" : "Pemasukan";
                          const Icon = type === "EXPENSE" ? TrendingDown : TrendingUp;
                          const activeClass =
                            type === "EXPENSE"
                              ? "bg-red-500/15 border-red-500/40 text-red-400"
                              : "bg-emerald-500/15 border-emerald-500/40 text-emerald-400";
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setAddType(type)}
                              className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-md border text-sm font-medium transition-all duration-200 cursor-pointer ${
                                active
                                  ? activeClass
                                  : "bg-zinc-800/40 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400"
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
                        onClick={() => { if (!isCreating) setIsAddModalOpen(false); }}
                        disabled={isCreating}
                        className="flex-1 h-11 border-[#1a1a1a] bg-surface-highlight/40 text-text-secondary hover:bg-surface-highlight hover:text-text-primary disabled:opacity-50"
                      >
                        Batal
                      </Button>
                      <Button
                        type="submit"
                        disabled={isCreating}
                        className="flex-1 h-11 bg-emerald-500 hover:bg-emerald-400 text-[#003919] font-medium disabled:opacity-50 gap-2"
                      >
                        {isCreating ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Menyimpan...
                          </>
                        ) : (
                          "Simpan Transaksi"
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
