"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import { Search, ArrowUpRight, ArrowDownLeft, RefreshCcw } from "lucide-react";
import { useState, useMemo, useCallback } from "react";

export interface Transaction {
  id: string;
  date: string;
  description?: string | null;
  category?: string | { id: string; name: string; type: string } | null;
  type: "income" | "expense" | "transfer" | "INCOME" | "EXPENSE" | "TRANSFER";
  amount: number;
  status?: "completed" | "pending" | "failed";
}

const typeConfig = {
  income: {
    icon: ArrowUpRight,
    label: "Pemasukan",
    iconClass: "text-emerald-400",
    amountClass: "text-emerald-400 font-semibold",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    prefix: "+",
  },
  expense: {
    icon: ArrowDownLeft,
    label: "Pengeluaran",
    iconClass: "text-rose-400",
    amountClass: "text-rose-400 font-semibold",
    badgeClass: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
    prefix: "-",
  },
  transfer: {
    icon: RefreshCcw,
    label: "Transfer",
    iconClass: "text-indigo-400",
    amountClass: "text-indigo-400 font-semibold",
    badgeClass: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
    prefix: "",
  },
};

const statusConfig = {
  completed: { label: "Selesai", class: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" },
  pending: { label: "Tertunda", class: "bg-amber-500/10 text-amber-400 border border-amber-500/20" },
  failed: { label: "Gagal", class: "bg-rose-500/10 text-rose-400 border border-rose-500/20" },
};


function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

const TABLE_PAGE_SIZE = 10;

const FILTER_BUTTONS: { label: string; value: "all" | "income" | "expense" | "transfer" }[] = [
  { label: "Semua", value: "all" },
  { label: "Pemasukan", value: "income" },
  { label: "Pengeluaran", value: "expense" },
  { label: "Transfer", value: "transfer" },
];

interface TransactionTableProps {
  transactions: Transaction[];
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense" | "transfer">("all");
  const [visibleCount, setVisibleCount] = useState(TABLE_PAGE_SIZE);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch =
        t.description?.toLowerCase().includes(search.toLowerCase()) ||
        (typeof t.category === "string" ? t.category?.toLowerCase() : t.category?.name?.toLowerCase() ?? "").includes(search.toLowerCase());
      const matchesType = typeFilter === "all" || t.type.toLowerCase() === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [transactions, search, typeFilter]);

  // Reset visible count when filters change
  const [prevFilterKey, setPrevFilterKey] = useState(`${search}-${typeFilter}`);
  const filterKey = `${search}-${typeFilter}`;
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setVisibleCount(TABLE_PAGE_SIZE);
  }

  const visibleRows = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  );
  const hasMore = visibleCount < filtered.length;

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => prev + TABLE_PAGE_SIZE);
  }, []);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <Input
            id="transaction-search"
            placeholder="Cari transaksi…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm bg-zinc-900/50 border-zinc-800 text-zinc-50 placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-zinc-900/50 backdrop-blur-md border border-zinc-800 p-1 rounded-lg">
          {FILTER_BUTTONS.map((btn) => (
            <Button
              key={btn.value}
              id={`filter-${btn.value}`}
              variant={typeFilter === btn.value ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-7 text-xs font-medium rounded-md transition-all",
                typeFilter === btn.value
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800"
              )}
              onClick={() => setTypeFilter(btn.value)}
            >
              {btn.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-900/50 hover:bg-zinc-900/50">
              <TableHead className="font-semibold text-zinc-400 w-32">Tanggal</TableHead>
              <TableHead className="font-semibold text-zinc-400">Deskripsi</TableHead>
              <TableHead className="font-semibold text-zinc-400 hidden md:table-cell">Kategori</TableHead>
              <TableHead className="font-semibold text-zinc-400 hidden sm:table-cell">Tipe</TableHead>
              <TableHead className="font-semibold text-zinc-400 hidden lg:table-cell">Status</TableHead>
              <TableHead className="font-semibold text-zinc-400 text-right">Jumlah</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-zinc-400 py-10 text-sm">
                  Tidak ada transaksi yang ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              visibleRows.map((tx, idx) => {
                const normalizedType = tx.type.toLowerCase() as "income" | "expense" | "transfer";
                const tConfig = typeConfig[normalizedType];
                const sConfig = statusConfig[tx.status ?? "completed"];
                const Icon = tConfig.icon;

                return (
                  <TableRow
                    key={tx.id}
                    className={cn(
                      "transition-colors cursor-pointer hover:bg-zinc-800/50",
                      idx % 2 === 0 ? "bg-zinc-950" : "bg-zinc-900/30"
                    )}
                  >
                    <TableCell className="text-sm text-zinc-400 whitespace-nowrap">
                      {formatDate(tx.date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "p-1.5 rounded-lg",
                          tx.type === "income" ? "bg-emerald-500/10" :
                          tx.type === "expense" ? "bg-rose-500/10" : "bg-indigo-500/10"
                        )}>
                          <Icon className={cn("size-3.5", tConfig.iconClass)} />
                        </div>
                        <span className="text-sm font-medium text-zinc-50 truncate max-w-[180px]">{tx.description}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm text-zinc-400">{typeof tx.category === "string" ? tx.category : tx.category?.name ?? "-"}</span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline" className={cn("text-xs", tConfig.badgeClass)}>
                        {tConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant="outline" className={cn("text-xs", sConfig.class)}>
                        {sConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className={cn("text-sm text-right font-mono tabular-nums", tConfig.amountClass)}>
                      {tConfig.prefix}{formatCurrency(tx.amount)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            onClick={loadMore}
            variant="outline"
            size="sm"
            className="border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-zinc-50 hover:border-zinc-700 transition-all"
          >
            Muat Lebih Banyak ({filtered.length - visibleCount} tersisa)
          </Button>
        </div>
      )}

      <p className="text-xs text-zinc-400 text-right">
        Menampilkan {Math.min(visibleCount, filtered.length)} dari {transactions.length} transaksi
      </p>
    </div>
  );
}
