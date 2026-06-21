import {
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCcw,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

export type DateRangeFilter = "all" | "7d" | "30d" | "3m" | "6m" | "year" | "custom";

// ── Constants ────────────────────────────────────────────────────────────────

export const PAGE_SIZE = 10;

export const typeConfig = {
  income: {
    icon: ArrowUpRight,
    label: "Income",
    prefix: "+",
    iconStyle: { color: "#10B981" },
    amountStyle: { color: "#10B981", fontWeight: 600 },
    iconBg: "rgba(16,185,129,0.1)",
  },
  expense: {
    icon: ArrowDownLeft,
    label: "Expense",
    prefix: "-",
    iconStyle: { color: "#EF4444" },
    amountStyle: { color: "#EF4444", fontWeight: 600 },
    iconBg: "rgba(239,68,68,0.1)",
  },
  transfer: {
    icon: RefreshCcw,
    label: "Transfer",
    prefix: "",
    iconStyle: { color: "#38BDF8" },
    amountStyle: { color: "#38BDF8", fontWeight: 600 },
    iconBg: "rgba(56,189,248,0.1)",
  },
};

// ── Animation variants ───────────────────────────────────────────────────────

export const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

export function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));
}

export function formatRupiah(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatSignedCurrency(amount: number, prefix: string): string {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat("id-ID").format(abs);
  return `${prefix}Rp ${formatted}`;
}
