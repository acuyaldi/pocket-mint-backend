"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from "@/src/features/transactions/hooks/useTransactions";
import { useWallets } from "@/src/features/wallets/hooks/useWallets";
import { Transaction } from "@/src/types/transaction";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { PAGE_SIZE } from "./components/constants";
import type { DateRangeFilter } from "./components/constants";
import { TransactionHeader } from "./components/TransactionHeader";
import { TransactionStats } from "./components/TransactionStats";
import { TransactionFilters } from "./components/TransactionFilters";
import { TransactionTable } from "./components/TransactionTable";
import { TransactionDetailPanel } from "./components/TransactionDetailPanel";
import { EditTransactionModal } from "./components/EditTransactionModal";
import { DeleteTransactionModal } from "./components/DeleteTransactionModal";
import { AddTransactionModal, type AddTransactionData } from "./components/AddTransactionModal";

export default function TransactionsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { data, isLoading } = useTransactions();
  const { data: walletsData } = useWallets();
  const updateTransaction = useUpdateTransaction();
  const createTransaction = useCreateTransaction();
  const deleteTransaction = useDeleteTransaction();
  const transactions: Transaction[] = useMemo(() => data ?? [], [data]);
  const wallets = useMemo(() => walletsData ?? [], [walletsData]);

  // Auth guard
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.replace("/login");
    })();
  }, [router, supabase.auth]);

  // ── Filter state ─────────────────────────────────────────────────────────
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [walletFilter, setWalletFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Pending filter state
  const [pendingDate, setPendingDate] = useState<DateRangeFilter>("30d");
  const [pendingWallet, setPendingWallet] = useState("all");
  const [pendingCategory, setPendingCategory] = useState("all");
  const [pendingType, setPendingType] = useState("all");
  const [pendingCustomFrom, setPendingCustomFrom] = useState("");
  const [pendingCustomTo, setPendingCustomTo] = useState("");
  const handleApplyFilters = useCallback(() => {
    setDateFilter(pendingDate); setWalletFilter(pendingWallet);
    setCategoryFilter(pendingCategory); setTypeFilter(pendingType);
    setCustomFrom(pendingCustomFrom); setCustomTo(pendingCustomTo);
  }, [pendingDate, pendingWallet, pendingCategory, pendingType, pendingCustomFrom, pendingCustomTo]);

  const uniqueCategories = useMemo(() => {
    const cats = new Map<string, string>();
    transactions.forEach((tx) => { if (tx.category?.name) cats.set(tx.category.name, tx.category.name); });
    return Array.from(cats.values()).sort();
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter((tx) => {
      const txDate = new Date(tx.date);
      let passDate = true;
      if (dateFilter === "7d") { const c = new Date(now); c.setDate(c.getDate() - 7); passDate = txDate >= c; }
      else if (dateFilter === "30d") { const c = new Date(now); c.setDate(c.getDate() - 30); passDate = txDate >= c; }
      else if (dateFilter === "3m") { const c = new Date(now); c.setMonth(c.getMonth() - 3); passDate = txDate >= c; }
      else if (dateFilter === "6m") { const c = new Date(now); c.setMonth(c.getMonth() - 6); passDate = txDate >= c; }
      else if (dateFilter === "year") { passDate = txDate >= new Date(now.getFullYear(), 0, 1); }
      else if (dateFilter === "custom") {
        if (customFrom) passDate = txDate >= new Date(customFrom);
        if (customTo) { const to = new Date(customTo); to.setHours(23, 59, 59, 999); passDate = passDate && txDate <= to; }
      }
      const passWallet = walletFilter === "all" || tx.walletId === walletFilter;
      const passCategory = categoryFilter === "all" || tx.category?.name === categoryFilter;
      const passType = typeFilter === "all" || tx.type.toLowerCase() === typeFilter.toLowerCase();
      const passSearch = !search || (tx.description ?? "").toLowerCase().includes(search.toLowerCase()) || (tx.category?.name ?? "").toLowerCase().includes(search.toLowerCase());
      return passDate && passSearch && passWallet && passCategory && passType;
    });
  }, [transactions, dateFilter, customFrom, customTo, search, walletFilter, categoryFilter, typeFilter]);

  const stats = useMemo(() => {
    let income = 0, expense = 0;
    filteredTransactions.forEach((tx) => { if (tx.type === "INCOME") income += tx.amount; else if (tx.type === "EXPENSE") expense += tx.amount; });
    return { income, expense, net: income - expense };
  }, [filteredTransactions]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE));
  const filterKey = `${dateFilter}-${customFrom}-${customTo}-${search}-${walletFilter}-${categoryFilter}-${typeFilter}`;

  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) { setPrevFilterKey(filterKey); setCurrentPage(1); }
  const visibleTransactions = useMemo(() => filteredTransactions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filteredTransactions, currentPage]);

  // Modals & panel
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleEditSubmit = useCallback(async (d: { id: string; description: string; amount: number; type: "EXPENSE" | "INCOME"; date?: string }) => {
    setIsSaving(true); try { await updateTransaction.mutateAsync({ id: d.id, description: d.description, amount: d.amount, type: d.type, date: d.date }); setEditingTx(null); } catch (e) { console.error(e); } finally { setIsSaving(false); }
  }, [updateTransaction]);
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirmId) return; setIsDeleting(true); try { await deleteTransaction.mutateAsync(deleteConfirmId); setDeleteConfirmId(null); setSelectedTx(null); } catch (e) { console.error(e); } finally { setIsDeleting(false); }
  }, [deleteConfirmId, deleteTransaction]);
  const handleAddSubmit = useCallback(async (d: AddTransactionData) => {
    setIsCreating(true);
    try { await createTransaction.mutateAsync(d); setIsAddModalOpen(false); }
    catch (e) { console.error(e); throw e; } // let the modal surface the message
    finally { setIsCreating(false); }
  }, [createTransaction]);

  return (
    <div className="space-y-6">
      <motion.main className="space-y-6" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>
        {/* Header row: title (left) + stats (right) */}
        <motion.div
          className="flex items-start justify-between gap-6 flex-wrap"
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } }}
        >
          <div>
            <h2 className="tracking-tight" style={{ fontSize: 28, fontWeight: 700, color: "#e5e2e1", fontFamily: "var(--font-heading)" }}>
              Transactions History
            </h2>
            <p className="mt-1" style={{ fontSize: 14, color: "#bccabb", fontFamily: "var(--font-inter)" }}>
              Track every cent of your growth.
            </p>
          </div>
          <TransactionStats income={stats.income} expense={stats.expense} net={stats.net} />
        </motion.div>
        <TransactionFilters
          wallets={wallets} uniqueCategories={uniqueCategories}
          pendingDate={pendingDate} pendingWallet={pendingWallet} pendingCategory={pendingCategory} pendingType={pendingType}
          pendingCustomFrom={pendingCustomFrom} pendingCustomTo={pendingCustomTo}
          onPendingDateChange={setPendingDate} onPendingWalletChange={setPendingWallet}
          onPendingCategoryChange={setPendingCategory} onPendingTypeChange={setPendingType}
          onPendingCustomFromChange={setPendingCustomFrom} onPendingCustomToChange={setPendingCustomTo}
          onApply={handleApplyFilters}
        />
        <TransactionTable
          isLoading={isLoading} search={search} onSearchChange={setSearch} filteredTransactions={filteredTransactions} visibleTransactions={visibleTransactions}
          currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} onRowClick={setSelectedTx}
        />
      </motion.main>

      <TransactionDetailPanel tx={selectedTx} onClose={() => setSelectedTx(null)} onEdit={setEditingTx} onDelete={setDeleteConfirmId} />
      <EditTransactionModal tx={editingTx} isSaving={isSaving} onClose={() => setEditingTx(null)} onSubmit={handleEditSubmit} />
      <DeleteTransactionModal isOpen={!!deleteConfirmId} isDeleting={isDeleting} onClose={() => setDeleteConfirmId(null)} onConfirm={handleDeleteConfirm} />
      <AddTransactionModal isOpen={isAddModalOpen} isCreating={isCreating} wallets={wallets} onClose={() => setIsAddModalOpen(false)} onSubmit={handleAddSubmit} />
    </div>
  );
}
