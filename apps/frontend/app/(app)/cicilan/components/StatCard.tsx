"use client";

interface StatCardProps {
  label: string;
  value: string;
  color: string;
}

export function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className="px-5 first:pl-0">
      <p
        className="mb-1 text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: "#bccabb", fontFamily: "var(--font-mono)" }}
      >
        {label}
      </p>
      <p
        className="text-[14px] font-semibold leading-none"
        style={{ color, fontFamily: "var(--font-heading)" }}
      >
        {value}
      </p>
    </div>
  );
}
