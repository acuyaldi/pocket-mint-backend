"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Transaction } from "@/src/types/transaction";
import { fadeUp, formatDate, typeConfig } from "./constants";

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
        <div key={i} className="h-12 animate-pulse rounded-lg" style={{ backgroundColor: "var(--color-accent)" }} />
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
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--color-border)",
          backgroundColor: "var(--color-card)",
          borderRadius: "8px 8px 0 0",
        }}
      >
        <div className="relative w-full max-w-sm">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2" style={{ color: "var(--color-muted-foreground)" }} />
          <input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 w-full rounded text-sm outline-none"
            style={{
              backgroundColor: "var(--color-input)",
              border: "1px solid var(--color-border)",
              padding: "8px 16px 8px 36px",
              color: "var(--color-muted-foreground)",
              fontSize: 14,
              borderRadius: 4,
            }}
          />
        </div>
      </div>

      <div
        style={{
          backgroundColor: "var(--color-card)",
          border: "1px solid var(--color-border)",
          borderTop: "none",
          borderRadius: "0 0 8px 8px",
          overflow: "hidden",
        }}
      >
        {isLoading ? (
          <div className="p-5">{renderTableSkeleton()}</div>
        ) : (
          <>
            <div
              className="hidden items-center md:flex"
              style={{
                backgroundColor: "var(--color-input)",
                borderBottom: "1px solid var(--color-border)",
                padding: "12px 20px",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--color-muted-foreground)",
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

            {filteredTransactions.length === 0 ? (
              <div className="py-14 text-center text-sm" style={{ color: "var(--color-muted-foreground)" }}>
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
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: "1px solid rgba(188,202,187,0.4)" }}
                    onClick={() => onRowClick(tx)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--color-muted)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <div className="flex items-start gap-3 px-4 py-4 md:hidden">
                      <div
                        className="flex shrink-0 items-center justify-center"
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          backgroundColor: tConfig.iconBg,
                        }}
                      >
                        <Icon className="size-4.5" style={tConfig.iconStyle} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate" style={{ fontSize: 14, fontWeight: 500, color: "var(--color-foreground)" }}>
                              {tx.description ?? "Untitled"}
                            </div>
                            {tx.note && (
                              <div className="mt-0.5 truncate" style={{ fontSize: 12, color: "var(--color-muted-foreground)" }}>
                                {tx.note}
                              </div>
                            )}
                          </div>

                          <div className="shrink-0 text-right tabular-nums" style={{ fontSize: 14, ...tConfig.amountStyle }}>
                            {tConfig.prefix}
                            {formatCurrency(tx.amount)}
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2 text-[12px]" style={{ color: "var(--color-muted-foreground)" }}>
                          <span>{formatDate(tx.date)}</span>
                          <span>{tx.wallet ? tx.wallet.name : "-"}</span>
                          <span>{tx.category?.name ?? "-"}</span>
                        </div>

                        {tx.isInstallment && (
                          <span
                            className="mt-2 inline-block"
                            style={{
                              background: "rgba(137,80,36,0.10)",
                              color: "var(--color-warning)",
                              border: "1px solid rgba(137,80,36,0.3)",
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

                    <div className="hidden items-center px-5 py-[14px] md:flex">
                      <div className="flex flex-1 items-center gap-3">
                        <div
                          className="flex items-center justify-center"
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            backgroundColor: tConfig.iconBg,
                            flexShrink: 0,
                          }}
                        >
                          <Icon className="size-4.5" style={tConfig.iconStyle} />
                        </div>

                        <div className="min-w-0">
                          <div className="truncate" style={{ fontSize: 14, fontWeight: 500, color: "var(--color-foreground)" }}>
                            {tx.description ?? "Untitled"}
                          </div>
                          {tx.note && (
                            <div className="truncate" style={{ fontSize: 12, color: "var(--color-muted-foreground)", marginTop: 1 }}>
                              {tx.note}
                            </div>
                          )}
                          {tx.isInstallment && (
                            <span
                              className="mt-1 inline-block"
                              style={{
                                background: "rgba(137,80,36,0.10)",
                                color: "var(--color-warning)",
                                border: "1px solid rgba(137,80,36,0.3)",
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

                      <div style={{ width: 140, fontSize: 14, color: "var(--color-muted-foreground)" }}>
                        {formatDate(tx.date)}
                      </div>
                      <div style={{ width: 160, fontSize: 14, color: "var(--color-muted-foreground)" }}>
                        {tx.wallet ? tx.wallet.name : "-"}
                      </div>
                      <div style={{ width: 140 }}>
                        {tx.category?.name ? (
                          <span
                            className="inline-block"
                            style={{
                              backgroundColor: "var(--color-accent)",
                              color: "var(--color-accent-foreground)",
                              borderRadius: 9999,
                              fontSize: 12,
                              fontWeight: 500,
                              padding: "3px 10px",
                            }}
                          >
                            {tx.category.name}
                          </span>
                        ) : (
                          <span style={{ color: "var(--color-muted-foreground)", fontSize: 14 }}>-</span>
                        )}
                      </div>
                      <div className="tabular-nums" style={{ width: 120, textAlign: "right", fontSize: 14, ...tConfig.amountStyle }}>
                        {tConfig.prefix}
                        {formatCurrency(tx.amount)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            <div
              className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5"
              style={{
                fontSize: 13,
                color: "var(--color-muted-foreground)",
                borderTop: "1px solid var(--color-border)",
              }}
            >
              <span>
                Showing {visibleTransactions.length} of {filteredTransactions.length} transactions
              </span>

              <div className="flex items-center gap-2 self-end md:self-auto">
                <button
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="flex cursor-pointer items-center justify-center transition-opacity disabled:cursor-default"
                  style={{
                    width: 32,
                    height: 32,
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 4,
                    opacity: currentPage === 1 ? 0.4 : 1,
                  }}
                >
                  <ChevronLeft className="size-4" style={{ color: "var(--color-muted-foreground)" }} />
                </button>
                <span className="tabular-nums" style={{ fontSize: 13, color: "var(--color-muted-foreground)" }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="flex cursor-pointer items-center justify-center transition-opacity disabled:cursor-default"
                  style={{
                    width: 32,
                    height: 32,
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 4,
                    opacity: currentPage === totalPages ? 0.4 : 1,
                  }}
                >
                  <ChevronRight className="size-4" style={{ color: "var(--color-muted-foreground)" }} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.section>
  );
}
