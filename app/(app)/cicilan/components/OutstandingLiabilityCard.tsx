"use client";

import { formatCurrency } from "@/lib/utils";

interface OutstandingLiabilityCardProps {
  total: number;
}

export function OutstandingLiabilityCard({ total }: OutstandingLiabilityCardProps) {
  return (
    <div className="rounded-lg p-5" style={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)" }}>
      <p
        className="text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-mono)" }}
      >
        Remaining Debt
      </p>
      <p
        className="mt-3 text-[20px] font-bold"
        style={{ color: "var(--color-destructive)", fontFamily: "var(--font-heading)" }}
      >
        {formatCurrency(total)}
      </p>
      <p className="mt-1 text-[11px]" style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-sans)" }}>
        Across all active installments
      </p>

      <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(188,202,187,0.5)" }}>
        <div className="flex justify-between text-[12px] mb-2">
          <span style={{ color: "var(--color-muted-foreground)" }}>Principal</span>
          <span style={{ color: "var(--color-foreground)", fontFamily: "var(--font-mono)" }}>{formatCurrency(total * 0.7)}</span>
        </div>
        <div className="flex justify-between text-[12px]">
          <span style={{ color: "var(--color-muted-foreground)" }}>Interest</span>
          <span style={{ color: "var(--color-foreground)", fontFamily: "var(--font-mono)" }}>{formatCurrency(total * 0.3)}</span>
        </div>
      </div>
    </div>
  );
}
