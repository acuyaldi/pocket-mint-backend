"use client";

interface ActiveInstallmentsWidgetProps {
  total: number;
  remaining: number;
}

export function ActiveInstallmentsWidget({ total }: ActiveInstallmentsWidgetProps) {
  return (
    <div className="rounded-lg p-5" style={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)" }}>
      <p
        className="text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-mono)" }}
      >
        Active Installments
      </p>
      <p
        className="mt-3 text-[40px] font-bold leading-none"
        style={{ color: "var(--color-primary)", fontFamily: "var(--font-heading)" }}
      >
        {total}
      </p>
      <p className="mt-1 text-[12px]" style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-sans)" }}>
        in progress
      </p>
    </div>
  );
}
