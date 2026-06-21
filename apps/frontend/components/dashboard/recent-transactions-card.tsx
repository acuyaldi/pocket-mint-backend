"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, ShoppingBag, ArrowUpRight, RefreshCcw } from "lucide-react";
import Link from "next/link";
import type { Transaction } from "@/components/dashboard/transaction-table";
import { formatCurrency } from "@/lib/utils";

interface RecentTransactionsCardProps {
  transactions: Transaction[];
  isLoading?: boolean;
}

function getTxIcon(type: string) {
  const t = type.toLowerCase();
  if (t === "income") return ArrowUpRight;
  if (t === "expense") return ShoppingBag;
  return RefreshCcw;
}

function getTxConfig(type: string) {
  const t = type.toLowerCase();
  if (t === "income") {
    return {
      iconBg: "rgba(16, 185, 129, 0.1)",
      iconColor: "#10B981",
      amountColor: "#10B981",
      prefix: "+",
    };
  }
  if (t === "expense") {
    return {
      iconBg: "rgba(239, 68, 68, 0.1)",
      iconColor: "#EF4444",
      amountColor: "#EF4444",
      prefix: "-",
    };
  }
  return {
    iconBg: "rgba(56, 189, 248, 0.1)",
    iconColor: "#38BDF8",
    amountColor: "#38BDF8",
    prefix: "",
  };
}

const RECENT_LIMIT = 5;

export function RecentTransactionsCard({
  transactions,
  isLoading,
}: RecentTransactionsCardProps) {
  const recent = transactions.slice(0, RECENT_LIMIT);

  return (
    <div
      style={{ backgroundColor: "#1E293B", border: "1px solid #334155", borderRadius: "8px", padding: "16px" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: "12px" }}>
        <span
          className="uppercase font-semibold"
          style={{
            fontFamily: "var(--font-inter)",
            fontSize: "11px",
            fontWeight: 600,
            color: "#64748B",
            letterSpacing: "0.05em",
          }}
        >
          Transaksi Terbaru
        </span>
        <Link href="/transactions">
          <span style={{ fontFamily: "var(--font-inter)", fontSize: "11px", fontWeight: 600, color: "#38BDF8" }}>
            Lihat semua \u2192
          </span>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 rounded animate-pulse" style={{ backgroundColor: "#334155" }} />
          ))}
        </div>
      ) : recent.length === 0 ? (
        <p style={{ fontFamily: "var(--font-inter)", fontSize: "14px", color: "#94A3B8", textAlign: "center", padding: "24px 0" }}>No transactions yet.</p>
      ) : (
        <div>
          {recent.map((tx, index) => {
            const Icon = getTxIcon(tx.type);
            const cfg = getTxConfig(tx.type);
            const category =
              typeof tx.category === "string"
                ? tx.category
                : tx.category?.name ?? "General";
            const date = new Date(tx.date).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
            });

            return (
              <div key={tx.id}>
                <div className="flex items-center justify-between" style={{ padding: "16px 0" }}>
                  {/* Left: icon + name + meta */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="flex items-center justify-center flex-shrink-0"
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        backgroundColor: cfg.iconBg,
                      }}
                    >
                      <Icon className="size-4" style={{ color: cfg.iconColor }} />
                    </div>
                    <div className="min-w-0">
                      <p style={{ fontFamily: "var(--font-inter)", fontSize: "14px", fontWeight: 400, color: "#F8FAFC" }} className="truncate">
                        {tx.description ?? "Untitled"}
                      </p>
                      <p style={{ fontFamily: "var(--font-inter)", fontSize: "12px", color: "#94A3B8" }}>
                        {date} \u00b7 {category}
                      </p>
                    </div>
                  </div>

                  {/* Right: amount */}
                  <div className="text-right flex-shrink-0 ml-3">
                    <p style={{ fontFamily: "var(--font-inter)", fontSize: "14px", fontWeight: 600, color: cfg.amountColor }}>
                      {cfg.prefix}{formatCurrency(tx.amount)}
                    </p>
                  </div>
                </div>
                {index < recent.length - 1 && (
                  <div style={{ height: "1px", backgroundColor: "#334155" }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}