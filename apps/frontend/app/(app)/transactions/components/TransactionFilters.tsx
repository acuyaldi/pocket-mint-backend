"use client";

import { motion, AnimatePresence } from "framer-motion";
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
          backgroundColor: "#0e0e0e",
          border: "1px solid #262626",
          borderRadius: 8,
          padding: "16px 20px",
        }}
      >
        <div className="flex flex-wrap items-end gap-3">
          {/* Date Range */}
          <div className="flex flex-col gap-1.5" style={{ minWidth: 160 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "#bccabb", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
              Date Range
            </span>
            <div className="relative">
              <select
                value={pendingDate}
                onChange={(e) => onPendingDateChange(e.target.value as DateRangeFilter)}
                className="w-full h-9 px-3 pr-8 rounded text-sm appearance-none cursor-pointer outline-none"
                style={{ backgroundColor: "#131313", border: "1px solid #262626", color: "#e5e2e1", borderRadius: 4, fontSize: 14 }}
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="3m">Last 3 Months</option>
                <option value="6m">Last 6 Months</option>
                <option value="year">This Year</option>
                <option value="all">All Time</option>
                <option value="custom">Custom</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 pointer-events-none" style={{ color: "#3d4a3e" }} />
            </div>
          </div>

          {/* Wallet */}
          <div className="flex flex-col gap-1.5" style={{ minWidth: 160 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "#bccabb", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
              Wallet
            </span>
            <div className="relative">
              <select
                value={pendingWallet}
                onChange={(e) => onPendingWalletChange(e.target.value)}
                className="w-full h-9 px-3 pr-8 rounded text-sm appearance-none cursor-pointer outline-none"
                style={{ backgroundColor: "#131313", border: "1px solid #262626", color: "#e5e2e1", borderRadius: 4, fontSize: 14 }}
              >
                <option value="all">All Wallets</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 pointer-events-none" style={{ color: "#3d4a3e" }} />
            </div>
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5" style={{ minWidth: 160 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "#bccabb", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
              Category
            </span>
            <div className="relative">
              <select
                value={pendingCategory}
                onChange={(e) => onPendingCategoryChange(e.target.value)}
                className="w-full h-9 px-3 pr-8 rounded text-sm appearance-none cursor-pointer outline-none"
                style={{ backgroundColor: "#131313", border: "1px solid #262626", color: "#e5e2e1", borderRadius: 4, fontSize: 14 }}
              >
                <option value="all">All Categories</option>
                {uniqueCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 pointer-events-none" style={{ color: "#3d4a3e" }} />
            </div>
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1.5" style={{ minWidth: 160 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "#bccabb", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
              Type
            </span>
            <div className="relative">
              <select
                value={pendingType}
                onChange={(e) => onPendingTypeChange(e.target.value)}
                className="w-full h-9 px-3 pr-8 rounded text-sm appearance-none cursor-pointer outline-none"
                style={{ backgroundColor: "#131313", border: "1px solid #262626", color: "#e5e2e1", borderRadius: 4, fontSize: 14 }}
              >
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="transfer">Transfer</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 pointer-events-none" style={{ color: "#3d4a3e" }} />
            </div>
          </div>

          {/* Apply Filters */}
          <button
            onClick={onApply}
            className="flex items-center gap-2 h-9 px-4 rounded text-sm font-medium cursor-pointer transition-colors"
            style={{ backgroundColor: "#2a2a2a", color: "#e5e2e1", border: "1px solid #262626", borderRadius: 4, fontSize: 13, fontWeight: 500 }}
          >
            <Filter className="size-3.5" />
            Apply Filters
          </button>
        </div>
      </div>

      {/* Custom date range inputs */}
      <AnimatePresence>
        {pendingDate === "custom" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-3 mt-3"
          >
            <Input
              type="date"
              value={pendingCustomFrom}
              onChange={(e) => onPendingCustomFromChange(e.target.value)}
              className="h-9 text-sm"
              style={{ backgroundColor: "#0a0a0a", border: "1px solid #262626", color: "#e5e2e1" }}
            />
            <span style={{ color: "#3d4a3e" }}>—</span>
            <Input
              type="date"
              value={pendingCustomTo}
              onChange={(e) => onPendingCustomToChange(e.target.value)}
              className="h-9 text-sm"
              style={{ backgroundColor: "#0a0a0a", border: "1px solid #262626", color: "#e5e2e1" }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}