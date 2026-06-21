"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Transaction } from "@/src/types/transaction";
import { fadeUp, typeConfig, formatDate } from "./constants";

interface TransactionTableProps {
  isLoading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  filteredTransactions: Transaction[];
  visibleTransactions: Transaction[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onRowClick: (tx: Transaction) => void;
}

function renderTableSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="h-12 rounded-lg animate-pulse" style={{ backgroundColor: "#334155" }} />
      ))}
    </div>
  );
}

export function TransactionTable({
  isLoading,
  search,
  onSearchChange,
  filteredTransactions,
  visibleTransactions,
  currentPage,
  totalPages,
  onPageChange,
  onRowClick,
}: TransactionTableProps) {
  return (
    <motion.section variants={fadeUp} aria-label="Transaction table">
      {/* Search bar above table */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #334155", backgroundColor: "#1E293B", borderRadius: "8px 8px 0 0" }}>
        <div className="relative" style={{ width: 320 }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: "#64748B" }} />
          <input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 w-full rounded text-sm outline-none"
            style={{
              backgroundColor: "#0F172A",
              border: "1px solid #334155",
              padding: "8px 16px 8px 36px",
              color: "#94A3B8",
              fontSize: 14,
              borderRadius: 4,
            }}
          />
        </div>
      </div>
      <div
        style={{
          backgroundColor: "#1E293B",
          border: "1px solid #334155",
          borderTop: "none",
          borderRadius: "0 0 8px 8px",
          overflow: "hidden",
        }}
      >
        {isLoading ? (
          <div className="p-5">{renderTableSkeleton()}</div>
        ) : (
          <>
            {/* Table Header */}
            <div
              className="flex items-center"
              style={{
                backgroundColor: "#0F172A",
                borderBottom: "1px solid #334155",
                padding: "12px 20px",
                fontSize: 11,
                fontWeight: 600,
                color: "#64748B",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              <div className="flex-1">Transaction</div>
              <div style={{ width: 140 }}>Date</div>
              <div style={{ width: 160 }}>Wallet</div>
              <div style={{ width: 140 }}>Category</div>
              <div style={{ width: 120, textAlign: "right" }}>Amount</div>
            </div>

            {/* Table Rows */}
            {filteredTransactions.length === 0 ? (
              <div className="py-14 text-center text-sm" style={{ color: "#94A3B8" }}>
                No transactions found.
              </div>
            ) : (
              visibleTransactions.map((tx) => {
                const normalizedType = tx.type.toLowerCase() as "income" | "expense" | "transfer";
                const tConfig = typeConfig[normalizedType] ?? typeConfig.expense;
                const Icon = tConfig.icon;

                return (
                  <div
                    key={tx.id}
                    className="flex items-center cursor-pointer transition-colors"
                    style={{
                      padding: "14px 20px",
                      borderBottom: "1px solid #1E293B",
                    }}
                    onClick={() => onRowClick(tx)}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#243044"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    {/* Transaction cell */}
                    <div className="flex-1 flex items-center gap-3">
                      <div
                        className="flex items-center justify-center"
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          backgroundColor: "#0F172A",
                          border: "1px solid #334155",
                          flexShrink: 0,
                        }}
                      >
                        <Icon className="size-4.5" style={{ color: "#64748B" }} />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate" style={{ fontSize: 14, fontWeight: 500, color: "#F8FAFC" }}>
                          {tx.description ?? "Untitled"}
                        </div>
                        {tx.note && (
                          <div className="truncate" style={{ fontSize: 12, color: "#94A3B8", marginTop: 1 }}>
                            {tx.note}
                          </div>
                        )}
                        {tx.isInstallment && (
                          <span
                            className="inline-block mt-1"
                            style={{
                              background: "rgba(249,115,22,0.15)",
                              color: "#F97316",
                              border: "1px solid rgba(249,115,22,0.3)",
                              borderRadius: 9999,
                              fontSize: 10,
                              fontWeight: 600,
                              padding: "2px 8px",
                            }}
                          >
                            INSTALLMENT{tx.currentTerm ? ` ${tx.currentTerm}/${tx.installmentMonths ?? "?"}` : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Date */}
                    <div style={{ width: 140, fontSize: 14, color: "#94A3B8" }}>
                      {formatDate(tx.date)}
                    </div>

                    {/* Wallet */}
                    <div style={{ width: 160, fontSize: 14, color: "#94A3B8" }}>
                      {tx.wallet ? tx.wallet.name : "—"}
                    </div>

                    {/* Category */}
                    <div style={{ width: 140 }}>
                      {tx.category?.name ? (
                        <span
                          className="inline-block"
                          style={{
                            backgroundColor: "#334155",
                            color: "#F8FAFC",
                            borderRadius: 9999,
                            fontSize: 12,
                            fontWeight: 500,
                            padding: "3px 10px",
                          }}
                        >
                          {tx.category.name}
                        </span>
                      ) : (
                        <span style={{ color: "#64748B", fontSize: 14 }}>—</span>
                      )}
                    </div>

                    {/* Amount */}
                    <div style={{ width: 120, textAlign: "right", fontSize: 14, ...tConfig.amountStyle }}>
                      {tConfig.prefix}{formatCurrency(tx.amount)}
                    </div>
                  </div>
                );
              })
            )}

            {/* Footer */}
            <div
              className="flex items-center justify-between"
              style={{
                padding: "12px 20px",
                fontSize: 13,
                color: "#64748B",
                borderTop: "1px solid #334155",
              }}
            >
              <span>
                Showing {visibleTransactions.length} of {filteredTransactions.length} transactions
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center justify-center cursor-pointer transition-opacity disabled:cursor-default"
                  style={{
                    width: 32,
                    height: 32,
                    backgroundColor: "#1E293B",
                    border: "1px solid #334155",
                    borderRadius: 4,
                    opacity: currentPage === 1 ? 0.4 : 1,
                  }}
                >
                  <ChevronLeft className="size-4" style={{ color: "#94A3B8" }} />
                </button>
                <span className="tabular-nums" style={{ fontSize: 13, color: "#94A3B8" }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center justify-center cursor-pointer transition-opacity disabled:cursor-default"
                  style={{
                    width: 32,
                    height: 32,
                    backgroundColor: "#1E293B",
                    border: "1px solid #334155",
                    borderRadius: 4,
                    opacity: currentPage === totalPages ? 0.4 : 1,
                  }}
                >
                  <ChevronRight className="size-4" style={{ color: "#94A3B8" }} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.section>
  );
}
