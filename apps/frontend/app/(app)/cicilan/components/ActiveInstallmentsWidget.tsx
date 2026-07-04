"use client";

interface ActiveInstallmentsWidgetProps {
  total: number;
  remaining: number;
}

export function ActiveInstallmentsWidget({ total }: ActiveInstallmentsWidgetProps) {
  return (
    <div className="rounded-lg p-5" style={{ backgroundColor: "#0e0e0e", border: "1px solid #262626" }}>
      <p
        className="text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: "#bccabb", fontFamily: "var(--font-mono)" }}
      >
        Active Commitments
      </p>
      <p
        className="mt-3 text-[40px] font-bold leading-none"
        style={{ color: "#4ade80", fontFamily: "var(--font-heading)" }}
      >
        {total}
      </p>
      <p className="mt-1 text-[12px]" style={{ color: "#bccabb", fontFamily: "var(--font-sans)" }}>
        cicilan berjalan
      </p>
    </div>
  );
}
