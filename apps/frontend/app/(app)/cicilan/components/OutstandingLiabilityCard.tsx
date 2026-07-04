"use client";

import { formatCurrency } from "@/lib/utils";

interface OutstandingLiabilityCardProps {
  total: number;
}

export function OutstandingLiabilityCard({ total }: OutstandingLiabilityCardProps) {
  return (
    <div className="rounded-lg p-5" style={{ backgroundColor: "#0e0e0e", border: "1px solid #262626" }}>
      <p
        className="text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: "#bccabb", fontFamily: "var(--font-mono)" }}
      >
        Outstanding Liability
      </p>
      <p
        className="mt-3 text-[20px] font-bold"
        style={{ color: "#ffb4ab", fontFamily: "var(--font-heading)" }}
      >
        {formatCurrency(total)}
      </p>
      <p className="mt-1 text-[11px]" style={{ color: "#bccabb", fontFamily: "var(--font-sans)" }}>
        Total sisa semua cicilan
      </p>

      <div className="mt-3 pt-3" style={{ borderTop: "1px solid #1a1a1a" }}>
        <div className="flex justify-between text-[12px] mb-2">
          <span style={{ color: "#bccabb" }}>Pokok</span>
          <span style={{ color: "#e5e2e1", fontFamily: "var(--font-mono)" }}>{formatCurrency(total * 0.7)}</span>
        </div>
        <div className="flex justify-between text-[12px]">
          <span style={{ color: "#bccabb" }}>Bunga</span>
          <span style={{ color: "#e5e2e1", fontFamily: "var(--font-mono)" }}>{formatCurrency(total * 0.3)}</span>
        </div>
      </div>
    </div>
  );
}
