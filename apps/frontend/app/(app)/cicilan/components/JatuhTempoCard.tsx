"use client";

interface JatuhTempoCardProps {
  nearestDue: string;
}

export function JatuhTempoCard({ nearestDue }: JatuhTempoCardProps) {
  const hasDate = nearestDue !== "—";
  return (
    <div className="rounded-lg p-5" style={{ backgroundColor: "#0e0e0e", border: "1px solid #262626" }}>
      <p
        className="text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: "#bccabb", fontFamily: "var(--font-mono)" }}
      >
        Jatuh Tempo
      </p>
      <p
        className="mt-3 text-[20px] font-bold"
        style={{ color: "#e5e2e1", fontFamily: "var(--font-heading)" }}
      >
        {nearestDue}
      </p>

      {hasDate && (
        <div className="mt-3 flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px]"
            style={{ backgroundColor: "#1c1b1b", border: "1px solid #262626", color: "#bccabb" }}
          >
            {nearestDue}
            <span style={{ color: "#4ade80" }}>↗</span>
          </span>
        </div>
      )}

      {!hasDate && (
        <p className="mt-2 text-[11px]" style={{ color: "#3d4a3e" }}>
          Tidak ada cicilan aktif
        </p>
      )}
    </div>
  );
}
