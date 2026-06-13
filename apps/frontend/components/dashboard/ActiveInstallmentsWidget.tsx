"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, Receipt, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import {
  useInstallments,
  Installment,
} from "@/src/features/installments/hooks/useInstallments";

const WALLET_ICON_MAP: Record<string, typeof CreditCard> = {
  CREDIT_CARD: CreditCard,
  LOAN_PAYLATER: Receipt,
};

const MAX_DISPLAY = 3;

function InstallmentRow({ item }: { item: Installment }) {
  const Icon = WALLET_ICON_MAP[item.walletType] ?? CreditCard;
  const percent = Math.min(
    Math.round((item.currentTerm / item.installmentMonths) * 100),
    100
  );

  return (
    <div className="rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] p-3 space-y-2">
      <div className="flex items-start gap-2.5">
        <div className="p-1.5 rounded-md bg-red-500/10 shrink-0">
          <Icon className="size-3.5 text-red-400/70" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-zinc-50 truncate">
            {item.walletName}
          </p>
          <p className="text-[11px] text-zinc-400 truncate">
            {item.description ?? "Cicilan"}
          </p>
        </div>
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-xs font-bold text-zinc-50 tabular-nums">
          {formatCurrency(Math.round(item.monthlyAmount))}
          <span className="text-zinc-500 font-normal">/bulan</span>
        </span>
        <span className="text-[10px] text-zinc-500 tabular-nums">
          Cicilan {item.currentTerm} dari {item.installmentMonths}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "#1c1b1b" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: "#4ade80" }}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <p className="text-[10px] text-zinc-500 text-right tabular-nums">{percent}%</p>
    </div>
  );
}

export function ActiveInstallmentsWidget() {
  const { data, isLoading } = useInstallments("ACTIVE");
  const installments = data ?? [];
  const displayItems = installments.slice(0, MAX_DISPLAY);

  return (
    <Card className="border border-[#1a1a1a] bg-[#0a0a0a] hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/[0.02] transition-all duration-300">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Cicilan Aktif
          </span>
          {installments.length > 0 && (
            <span className="flex items-center justify-center size-5 rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-400 tabular-nums">
              {installments.length}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 rounded-lg bg-zinc-900 animate-pulse" />
            ))}
          </div>
        ) : installments.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: "#bccabb", fontSize: 14 }}>
            Tidak ada cicilan aktif 🎉
          </p>
        ) : (
          <div className="space-y-3">
            {displayItems.map((item) => (
              <InstallmentRow key={item.id} item={item} />
            ))}

            {installments.length > MAX_DISPLAY && (
              <p className="text-[10px] text-zinc-500 text-center">
                +{installments.length - MAX_DISPLAY} cicilan lainnya
              </p>
            )}
          </div>
        )}

        {/* Link to full list */}
        {!isLoading && installments.length > 0 && (
          <Link
            href="/cicilan"
            className="flex items-center justify-center gap-1.5 mt-4 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Lihat Semua Cicilan
            <ArrowRight className="size-3" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
