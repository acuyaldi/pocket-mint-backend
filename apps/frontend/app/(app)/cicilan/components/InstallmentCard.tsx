"use client";

import { formatCurrency } from "@/lib/utils";

export interface Installment {
  id: string;
  description: string | null;
  walletId: string;
  walletName: string;
  walletType: string;
  monthlyAmount: number;
  currentTerm: number;
  installmentMonths: number;
  totalAmount: number;
  status: "ACTIVE" | "SETTLED" | "CANCELLED";
  startDate: string;
  balanceDeducted: boolean;
}

interface InstallmentCardProps {
  installment: Installment;
}

export function InstallmentCard({ installment }: InstallmentCardProps) {
  const dueDate = new Date(installment.startDate);
  dueDate.setMonth(dueDate.getMonth() + installment.currentTerm);
  const today = new Date();
  const isOverdue = dueDate < today;
  const isUpcoming =
    !isOverdue &&
    dueDate > today &&
    dueDate <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  const progress =
    installment.installmentMonths > 0
      ? Math.min(100, Math.round((installment.currentTerm / installment.installmentMonths) * 100))
      : 0;

  const accentColor = isOverdue ? "#ffb4ab" : isUpcoming ? "#facc15" : "#4ade80";

  const remaining = Math.max(
    0,
    installment.totalAmount - installment.monthlyAmount * installment.currentTerm,
  );

  return (
    <div
      className="rounded-lg p-5 relative overflow-hidden"
      style={{
        backgroundColor: "#0e0e0e",
        border: "1px solid #262626",
        borderLeft: `3px solid ${accentColor}`,
      }}
    >
      {/* Header row: icon + name + badge + meta */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="flex items-center justify-center size-9 rounded-lg shrink-0"
          style={{ backgroundColor: `${accentColor}18`, border: "1px solid #262626" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke={accentColor} strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[14px] font-semibold"
              style={{ color: "#e5e2e1", fontFamily: "var(--font-heading)" }}
            >
              {installment.walletName}
            </span>
            {isUpcoming && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "rgba(250,204,21,0.15)", border: "1px solid rgba(250,204,21,0.3)", color: "#facc15" }}
              >
                UPCOMING
              </span>
            )}
            {isOverdue && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "rgba(255,180,171,0.12)", border: "1px solid rgba(255,180,171,0.3)", color: "#ffb4ab" }}
              >
                TERLAMBAT
              </span>
            )}
          </div>
          <p
            className="text-[11px] mt-0.5"
            style={{ color: "#bccabb", fontFamily: "var(--font-sans)" }}
          >
            {installment.walletType} · Source Wallet · Monthly
          </p>
        </div>
      </div>

      {/* Amount + period */}
      <div className="flex items-baseline gap-3 mb-1">
        <span
          className="text-[20px] font-bold"
          style={{ color: "#e5e2e1", fontFamily: "var(--font-heading)" }}
        >
          {formatCurrency(installment.monthlyAmount)}
        </span>
        <span className="text-[12px]" style={{ color: "#bccabb" }}>
          {installment.currentTerm} / {installment.installmentMonths} months
        </span>
      </div>

      {/* Progress label row */}
      <div className="flex justify-between text-[11px] mb-1.5" style={{ color: "#bccabb" }}>
        <span>Bulan {installment.currentTerm} dari {installment.installmentMonths}</span>
        <span>{formatCurrency(remaining)} tersisa</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full overflow-hidden mb-4" style={{ backgroundColor: "#262626" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${progress}%`, backgroundColor: accentColor }}
        />
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-2">
        <button
          className="px-4 py-2 rounded-md text-[12px] font-medium transition-colors"
          style={{
            backgroundColor: "#1c1b1b",
            border: "1px solid #262626",
            color: "#bccabb",
          }}
        >
          Lihat Detail
        </button>
        {installment.status === "ACTIVE" ? (
          <button
            className="px-4 py-2 rounded-md text-[12px] font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: "#4ade80", color: "#003919", border: "none" }}
          >
            Lunasi Sekarang
          </button>
        ) : (
          <button
            className="px-4 py-2 rounded-md text-[12px] font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: "rgba(255,180,171,0.12)", border: "1px solid rgba(255,180,171,0.3)", color: "#ffb4ab" }}
          >
            Batalkan
          </button>
        )}
      </div>
    </div>
  );
}
