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

// Human labels for wallet-type enums — raw CREDIT_CARD/LOAN_PAYLATER is backend jargon
const WALLET_TYPE_LABELS: Record<string, string> = {
  CREDIT_CARD: "Credit Card",
  LOAN_PAYLATER: "Paylater",
};

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

  // Token literals (destructive / warning / primary) — concatenated with an
  // alpha suffix below, so CSS vars can't be used here
  const accentColor = isOverdue ? "#ba1a1a" : isUpcoming ? "#895024" : "#006d36";

  const remaining = Math.max(
    0,
    installment.totalAmount - installment.monthlyAmount * installment.currentTerm,
  );

  return (
    <div
      className="rounded-lg p-5 relative overflow-hidden"
      style={{
        backgroundColor: "var(--color-card)",
        border: "1px solid var(--color-border)",
        borderLeft: `3px solid ${accentColor}`,
      }}
    >
      {/* Header row: icon + name + badge + meta */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="flex items-center justify-center size-9 rounded-lg shrink-0"
          style={{ backgroundColor: `${accentColor}18`, border: "1px solid var(--color-border)" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke={accentColor} strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[14px] font-semibold"
              style={{ color: "var(--color-foreground)", fontFamily: "var(--font-heading)" }}
            >
              {installment.walletName}
            </span>
            {isUpcoming && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "rgba(137,80,36,0.10)", border: "1px solid rgba(137,80,36,0.3)", color: "var(--color-warning)" }}
              >
                UPCOMING
              </span>
            )}
            {isOverdue && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "rgba(186,26,26,0.08)", border: "1px solid rgba(186,26,26,0.3)", color: "var(--color-destructive)" }}
              >
                OVERDUE
              </span>
            )}
          </div>
          <p
            className="text-[11px] mt-0.5"
            style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-sans)" }}
          >
            {WALLET_TYPE_LABELS[installment.walletType] ?? installment.walletType} · Monthly
          </p>
        </div>
      </div>

      {/* Amount + period */}
      <div className="flex items-baseline gap-3 mb-1">
        <span
          className="text-[20px] font-bold"
          style={{ color: "var(--color-foreground)", fontFamily: "var(--font-heading)" }}
        >
          {formatCurrency(installment.monthlyAmount)}
        </span>
        <span className="text-[12px]" style={{ color: "var(--color-muted-foreground)" }}>
          {installment.currentTerm} / {installment.installmentMonths} months
        </span>
      </div>

      {/* Progress label row */}
      <div className="flex justify-between text-[11px] mb-1.5" style={{ color: "var(--color-muted-foreground)" }}>
        <span>{progress}% paid</span>
        <span>{formatCurrency(remaining)} remaining</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full overflow-hidden mb-4" style={{ backgroundColor: "rgba(84,95,115,0.15)" }}>
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
            backgroundColor: "var(--color-card)",
            border: "1px solid var(--color-border)",
            color: "var(--color-muted-foreground)",
          }}
        >
          View Details
        </button>
        {installment.status === "ACTIVE" ? (
          <button
            className="px-4 py-2 rounded-md text-[12px] font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-foreground)", border: "none" }}
          >
            Pay Off Now
          </button>
        ) : (
          <button
            className="px-4 py-2 rounded-md text-[12px] font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: "rgba(186,26,26,0.08)", border: "1px solid rgba(186,26,26,0.3)", color: "var(--color-destructive)" }}
          >
            Cancel Installment
          </button>
        )}
      </div>
    </div>
  );
}
