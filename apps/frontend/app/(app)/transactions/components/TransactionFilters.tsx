"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { fadeUp } from "./constants";
import type { DateRangeFilter } from "./constants";
import type { Wallet } from "@/src/types/wallet";

interface TransactionFiltersProps {
  wallets: Wallet[];
  uniqueCategories: string[];
  pendingDate: DateRangeFilter;
  pendingWallet: string;
  pendingCategory: string;
  pendingType: string;
  pendingCustomFrom: string;
  pendingCustomTo: string;
  onPendingDateChange: (v: DateRangeFilter) => void;
  onPendingWalletChange: (v: string) => void;
  onPendingCategoryChange: (v: string) => void;
  onPendingTypeChange: (v: string) => void;
  onPendingCustomFromChange: (v: string) => void;
  onPendingCustomToChange: (v: string) => void;
  onApply: () => void;
}

export function TransactionFilters(props: TransactionFiltersProps) {
  const {
    wallets,
    uniqueCategories,
    pendingDate,
    pendingWallet,
    pendingCategory,
    pendingType,
    pendingCustomFrom,
    pendingCustomTo,
    onPendingDateChange,
    onPendingWalletChange,
    onPendingCategoryChange,
    onPendingTypeChange,
    onPendingCustomFromChange,
    onPendingCustomToChange,
    onApply,
  } = props;

  return (
    <motion.div variants={fadeUp}>
      <div
        style={{
          backgroundColor: "var(--color-card)",
          border: "1px solid var(--color-border)",
          borderRadius: 8,
          padding: "16px 20px",
        }}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto] xl:items-end">
          <div className="flex min-w-0 flex-col gap-1.5">
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--color-muted-foreground)",
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                fontFamily: "var(--font-mono)",
              }}
            >
              Date Range
            </span>
            <div className="relative">
              <select
                value={pendingDate}
                onChange={(e) => onPendingDateChange(e.target.value as DateRangeFilter)}
                className="h-9 w-full cursor-pointer appearance-none rounded px-3 pr-8 text-sm outline-none"
                style={{
                  backgroundColor: "var(--color-input)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-foreground)",
                  borderRadius: 4,
                  fontSize: 14,
                }}
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="3m">Last 3 Months</option>
                <option value="6m">Last 6 Months</option>
                <option value="year">This Year</option>
                <option value="all">All Time</option>
                <option value="custom">Custom</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2"
                style={{ color: "var(--color-muted-foreground)" }}
              />
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-1.5">
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--color-muted-foreground)",
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                fontFamily: "var(--font-mono)",
              }}
            >
              Wallet
            </span>
            <div className="relative">
              <select
                value={pendingWallet}
                onChange={(e) => onPendingWalletChange(e.target.value)}
                className="h-9 w-full cursor-pointer appearance-none rounded px-3 pr-8 text-sm outline-none"
                style={{
                  backgroundColor: "var(--color-input)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-foreground)",
                  borderRadius: 4,
                  fontSize: 14,
                }}
              >
                <option value="all">All Wallets</option>
                {wallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2"
                style={{ color: "var(--color-muted-foreground)" }}
              />
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-1.5">
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--color-muted-foreground)",
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                fontFamily: "var(--font-mono)",
              }}
            >
              Category
            </span>
            <div className="relative">
              <select
                value={pendingCategory}
                onChange={(e) => onPendingCategoryChange(e.target.value)}
                className="h-9 w-full cursor-pointer appearance-none rounded px-3 pr-8 text-sm outline-none"
                style={{
                  backgroundColor: "var(--color-input)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-foreground)",
                  borderRadius: 4,
                  fontSize: 14,
                }}
              >
                <option value="all">All Categories</option>
                {uniqueCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2"
                style={{ color: "var(--color-muted-foreground)" }}
              />
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-1.5">
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--color-muted-foreground)",
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                fontFamily: "var(--font-mono)",
              }}
            >
              Type
            </span>
            <div className="relative">
              <select
                value={pendingType}
                onChange={(e) => onPendingTypeChange(e.target.value)}
                className="h-9 w-full cursor-pointer appearance-none rounded px-3 pr-8 text-sm outline-none"
                style={{
                  backgroundColor: "var(--color-input)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-foreground)",
                  borderRadius: 4,
                  fontSize: 14,
                }}
              >
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="transfer">Transfer</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2"
                style={{ color: "var(--color-muted-foreground)" }}
              />
            </div>
          </div>

          <button
            onClick={onApply}
            className="flex h-9 w-full items-center justify-center gap-2 whitespace-nowrap rounded px-4 text-sm font-medium transition-colors xl:w-auto"
            style={{
              backgroundColor: "var(--color-accent)",
              color: "var(--color-foreground)",
              border: "1px solid var(--color-border)",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <Filter className="size-3.5" />
            Apply Filters
          </button>
        </div>
      </div>

      <AnimatePresence>
        {pendingDate === "custom" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center"
          >
            <Input
              type="date"
              value={pendingCustomFrom}
              onChange={(e) => onPendingCustomFromChange(e.target.value)}
              className="h-9 text-sm"
              style={{
                backgroundColor: "var(--color-input)",
                border: "1px solid var(--color-border)",
                color: "var(--color-foreground)",
              }}
            />
            <span className="hidden text-center sm:block" style={{ color: "var(--color-muted-foreground)" }}>
              -
            </span>
            <Input
              type="date"
              value={pendingCustomTo}
              onChange={(e) => onPendingCustomToChange(e.target.value)}
              className="h-9 text-sm"
              style={{
                backgroundColor: "var(--color-input)",
                border: "1px solid var(--color-border)",
                color: "var(--color-foreground)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
