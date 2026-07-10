"use client";

interface JatuhTempoCardProps {
  nearestDue: string;
}

export function JatuhTempoCard({ nearestDue }: JatuhTempoCardProps) {
  const hasDate = nearestDue !== "—";
  return (
    <div className="rounded-lg p-5" style={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)" }}>
      <p
        className="text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-mono)" }}
      >
        Next Due Date
      </p>
      <p
        className="mt-3 text-[20px] font-bold"
        style={{ color: "var(--color-foreground)", fontFamily: "var(--font-heading)" }}
      >
        {nearestDue}
      </p>

      {hasDate && (
        <div className="mt-3 flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px]"
            style={{ backgroundColor: "var(--color-muted)", border: "1px solid var(--color-border)", color: "var(--color-muted-foreground)" }}
          >
            {nearestDue}
            <span style={{ color: "var(--color-primary)" }}>↗</span>
          </span>
        </div>
      )}

      {!hasDate && (
        <p className="mt-2 text-[11px]" style={{ color: "var(--color-muted-foreground)" }}>
          No active installments
        </p>
      )}
    </div>
  );
}
