"use client";

interface StatCardProps {
  label: string;
  value: string;
  color: string;
}

export function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className="min-w-0 sm:px-5 sm:first:pl-0">
      <p
        className="mb-1 text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-mono)" }}
      >
        {label}
      </p>
      <p
        className="text-[14px] font-semibold leading-tight break-words"
        style={{ color, fontFamily: "var(--font-heading)" }}
      >
        {value}
      </p>
    </div>
  );
}
