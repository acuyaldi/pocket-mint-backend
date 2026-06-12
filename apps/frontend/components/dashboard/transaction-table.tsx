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
import { cn } from "@/lib/utils";
import { Search, Filter, ArrowUpRight, ArrowDownLeft, RefreshCcw } from "lucide-react";
import { useState } from "react";

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  status: "completed" | "pending" | "failed";
}

const typeConfig = {
  income: {
    icon: ArrowUpRight,
    label: "Pemasukan",
    iconClass: "text-[var(--income)]",
    amountClass: "text-[var(--income)] font-semibold",
    badgeClass: "bg-[var(--income-muted)] text-[var(--income)] border-0",
    prefix: "+",
  },
  expense: {
    icon: ArrowDownLeft,
    label: "Pengeluaran",
    iconClass: "text-[var(--expense)]",
    amountClass: "text-[var(--expense)] font-semibold",
    badgeClass: "bg-[var(--expense-muted)] text-[var(--expense)] border-0",
    prefix: "-",
  },
  transfer: {
    icon: RefreshCcw,
    label: "Transfer",
    iconClass: "text-[var(--balance)]",
    amountClass: "text-[var(--balance)] font-semibold",
    badgeClass: "bg-[var(--balance-muted)] text-[var(--balance)] border-0",
    prefix: "",
  },
};

const statusConfig = {
  completed: { label: "Selesai", class: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-0" },
  pending: { label: "Tertunda", class: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-0" },
  failed: { label: "Gagal", class: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 border-0" },
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

interface TransactionTableProps {
  transactions: Transaction[];
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense" | "transfer">("all");

  const filtered = transactions.filter((t) => {
    const matchesSearch =
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const filterButtons: { label: string; value: typeof typeFilter }[] = [
    { label: "Semua", value: "all" },
    { label: "Pemasukan", value: "income" },
    { label: "Pengeluaran", value: "expense" },
    { label: "Transfer", value: "transfer" },
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            id="transaction-search"
            placeholder="Cari transaksi…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm bg-background"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg">
          {filterButtons.map((btn) => (
            <Button
              key={btn.value}
              id={`filter-${btn.value}`}
              variant={typeFilter === btn.value ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-7 text-xs font-medium rounded-md transition-all",
                typeFilter === btn.value ? "shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setTypeFilter(btn.value)}
            >
              {btn.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="font-semibold text-foreground/70 w-32">Tanggal</TableHead>
              <TableHead className="font-semibold text-foreground/70">Deskripsi</TableHead>
              <TableHead className="font-semibold text-foreground/70 hidden md:table-cell">Kategori</TableHead>
              <TableHead className="font-semibold text-foreground/70 hidden sm:table-cell">Tipe</TableHead>
              <TableHead className="font-semibold text-foreground/70 hidden lg:table-cell">Status</TableHead>
              <TableHead className="font-semibold text-foreground/70 text-right">Jumlah</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10 text-sm">
                  Tidak ada transaksi yang ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((tx, idx) => {
                const tConfig = typeConfig[tx.type];
                const sConfig = statusConfig[tx.status];
                const Icon = tConfig.icon;

                return (
                  <TableRow
                    key={tx.id}
                    className={cn(
                      "transition-colors cursor-pointer",
                      idx % 2 === 0 ? "bg-background" : "bg-muted/20"
                    )}
                  >
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(tx.date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "p-1.5 rounded-lg",
                          tx.type === "income" ? "bg-[var(--income-muted)]" :
                          tx.type === "expense" ? "bg-[var(--expense-muted)]" : "bg-[var(--balance-muted)]"
                        )}>
                          <Icon className={cn("size-3.5", tConfig.iconClass)} />
                        </div>
                        <span className="text-sm font-medium truncate max-w-[180px]">{tx.description}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">{tx.category}</span>
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

      <p className="text-xs text-muted-foreground text-right">
        Menampilkan {filtered.length} dari {transactions.length} transaksi
      </p>
    </div>
  );
}
