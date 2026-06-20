"use client";

import Link from "next/link";
import { CreditCard, Receipt, ArrowRight } from "lucide-react";
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
    <div className="space-y-2" style={{ padding: "7px 0" }}>
      {/* Top row: name + counter */}
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-[500]" style={{ color: "#e4e4e7" }}>
          {item.walletName}
        </span>
        <span className="text-[11px]" style={{ color: "#71717a" }}>
          {item.currentTerm}/{item.installmentMonths}
        </span>
      </div>

      {/* Subtitle */}
      <p className="text-[11px]" style={{ color: "#71717a" }}>
        {formatCurrency(Math.round(item.monthlyAmount))}/bulan · {item.walletType === "CREDIT_CARD" ? "Credit Card" : "Paylater"}
      </p>

      {/* Progress bar */}
      <div className="w-full overflow-hidden" style={{ height: "3px", backgroundColor: "#262626", borderRadius: "1.5px" }}>
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            backgroundColor: "#4ade80",
          }}
        />
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between">
        <span className="text-[10px]" style={{ color: "#71717a" }}>{percent}% lunas</span>
        <span className="text-[10px]" style={{ color: "#71717a" }}>{item.installmentMonths - item.currentTerm} cicilan lagi</span>
      </div>

      {/* Bottom border except last */}
    </div>
  );
}

export function ActiveInstallmentsWidget() {
  const { data, isLoading } = useInstallments("ACTIVE");
  const installments = data ?? [];
  const displayItems = installments.slice(0, MAX_DISPLAY);

  return (
    <div
      style={{
        backgroundColor: "#131313",
        border: "0.5px solid #262626",
        borderRadius: "10px",
        padding: "14px 16px",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "#71717a" }}>
          Cicilan Aktif
        </span>
        {installments.length > 0 && (
          <Link href="/cicilan">
            <span className="text-[11px] font-medium" style={{ color: "#4ade80" }}>
              Lihat semua →
            </span>
          </Link>
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
        <div>
          {displayItems.map((item, index) => (
            <div key={item.id}>
              <InstallmentRow item={item} />
              {index < displayItems.length - 1 && (
                <div className="h-px" style={{ backgroundColor: "#262626", marginTop: "7px" }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
