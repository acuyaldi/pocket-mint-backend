"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCcw,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";
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
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
      amountColor: "text-emerald-400",
      prefix: "+",
    };
  }
  if (t === "expense") {
    return {
      iconBg: "bg-red-500/10",
      iconColor: "text-red-500",
      amountColor: "text-red-500",
      prefix: "-",
    };
  }
  return {
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
    amountColor: "text-blue-400",
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
    <Card className="border border-[#1a1a1a] bg-[#0a0a0a] hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/[0.02] transition-all duration-300">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Recent Transactions
          </span>
          <Link href="/transactions">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 gap-1 px-2"
            >
              Show All
              <ArrowRight className="size-3" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-zinc-900 rounded animate-pulse" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-6">No transactions yet.</p>
        ) : (
          <div className="space-y-1">
            {recent.map((tx) => {
              const Icon = getTxIcon(tx.type);
              const cfg = getTxConfig(tx.type);
              const category =
                typeof tx.category === "string"
                  ? tx.category
                  : tx.category?.name ?? "General";

              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-zinc-900/40 transition-colors"
                >
                  {/* Left: icon + description */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`p-2 rounded-lg ${cfg.iconBg} flex-shrink-0`}>
                      <Icon className={`size-3.5 ${cfg.iconColor}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-50 truncate">
                        {tx.description ?? "Untitled"}
                      </p>
                      <p className="text-[10px] text-zinc-500">{category}</p>
                    </div>
                  </div>

                  {/* Right: amount */}
                  <span className={`text-sm font-semibold tabular-nums flex-shrink-0 ml-3 ${cfg.amountColor}`}>
                    {cfg.prefix}
                    {formatCurrency(tx.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

      </CardContent>
    </Card>
  );
}
