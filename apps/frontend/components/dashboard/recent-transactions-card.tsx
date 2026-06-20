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
      iconColor: "#10b981",
      amountColor: "#10b981",
      prefix: "+",
    };
  }
  if (t === "expense") {
    return {
      iconBg: "rgba(248, 113, 113, 0.1)",
      iconColor: "#f87171",
      amountColor: "#f87171",
      prefix: "-",
    };
  }
  return {
    iconBg: "rgba(59, 130, 246, 0.1)",
    iconColor: "#3b82f6",
    amountColor: "#3b82f6",
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
      style={{
        backgroundColor: "#131313",
        border: "0.5px solid #262626",
        borderRadius: "10px",
        padding: "14px 16px",
        marginLeft: "22px",
        marginRight: "22px",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "#71717a" }}>
          Transaksi Terbaru
        </span>
        <Link href="/transactions">
          <span className="text-[11px] font-medium" style={{ color: "#4ade80" }}>
            Lihat semua →
          </span>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-zinc-900 rounded animate-pulse" />
          ))}
        </div>
      ) : recent.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-6">No transactions yet.</p>
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
                <div className="flex items-center justify-between" style={{ padding: "8px 0" }}>
                  {/* Left: icon + name + meta */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="flex items-center justify-center flex-shrink-0"
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "7px",
                        backgroundColor: cfg.iconBg,
                      }}
                    >
                      <Icon className="size-4" style={{ color: cfg.iconColor }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-[500]" style={{ color: "#e4e4e7" }}>
                        {tx.description ?? "Untitled"}
                      </p>
                      <p className="text-[11px]" style={{ color: "#71717a" }}>
                        {date} · {category}
                      </p>
                    </div>
                  </div>

                  {/* Right: amount + source wallet */}
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-[13px] font-[500]" style={{ color: cfg.amountColor }}>
                      {cfg.prefix}{formatCurrency(tx.amount)}
                    </p>
                    <p className="text-[11px]" style={{ color: "#71717a" }}>
                      {tx.wallet?.name ?? "Cash"}
                    </p>
                  </div>
                </div>
                {index < recent.length - 1 && (
                  <div className="h-px" style={{ backgroundColor: "#262626" }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
