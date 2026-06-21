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
    <div className="space-y-2" style={{ padding: "8px 0" }}>
      {/* Top row: name + counter */}
      <div className="flex items-center justify-between">
        <span style={{ fontFamily: "var(--font-inter)", fontSize: "13px", fontWeight: 500, color: "#F8FAFC" }}>
          {item.walletName}
        </span>
        <span style={{ fontFamily: "var(--font-inter)", fontSize: "11px", color: "#94A3B8" }}>
          {item.currentTerm}/{item.installmentMonths}
        </span>
      </div>

      {/* Subtitle */}
      <p style={{ fontFamily: "var(--font-inter)", fontSize: "12px", color: "#94A3B8" }}>
        {formatCurrency(Math.round(item.monthlyAmount))}/bulan · {item.walletType === "CREDIT_CARD" ? "Credit Card" : "Paylater"}
      </p>

      {/* Progress bar */}
      <div style={{ height: "4px", backgroundColor: "#334155", borderRadius: "9999px", overflow: "hidden" }}>
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            borderRadius: "9999px",
            backgroundColor: percent >= 80 ? "#EF4444" : percent >= 30 ? "#F59E0B" : "#10B981",
          }}
        />
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between">
        <span style={{ fontFamily: "var(--font-inter)", fontSize: "12px", color: "#94A3B8" }}>{percent}% lunas</span>
        <span style={{ fontFamily: "var(--font-inter)", fontSize: "12px", color: "#94A3B8" }}>{item.installmentMonths - item.currentTerm} cicilan lagi</span>
      </div>
    </div>
  );
}

export function ActiveInstallmentsWidget() {
  const { data, isLoading } = useInstallments("ACTIVE");
  const installments = data ?? [];
  const displayItems = installments.slice(0, MAX_DISPLAY);

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
          Cicilan Aktif
        </span>
        {installments.length > 0 && (
          <Link href="/cicilan">
            <span style={{ fontFamily: "var(--font-inter)", fontSize: "11px", fontWeight: 600, color: "#38BDF8" }}>
              Lihat semua \u2192
            </span>
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded animate-pulse" style={{ backgroundColor: "#334155" }} />
          ))}
        </div>
      ) : installments.length === 0 ? (
        <p style={{ fontFamily: "var(--font-inter)", fontSize: "14px", color: "#94A3B8", textAlign: "center", padding: "24px 0" }}>
          Tidak ada cicilan aktif \ud83c\udf89
        </p>
      ) : (
        <div>
          {displayItems.map((item, index) => (
            <div key={item.id}>
              <InstallmentRow item={item} />
              {index < displayItems.length - 1 && (
                <div style={{ height: "1px", backgroundColor: "#334155", marginTop: "8px" }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}