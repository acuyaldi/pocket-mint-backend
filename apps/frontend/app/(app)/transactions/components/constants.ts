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
    iconStyle: { color: "#4ade80" },
    amountStyle: { color: "#4ade80", fontWeight: 600 },
    iconBg: "rgba(74,222,128,0.12)",
  },
  expense: {
    icon: ArrowDownLeft,
    label: "Expense",
    prefix: "-",
    iconStyle: { color: "#ffb4ab" },
    amountStyle: { color: "#ffb4ab", fontWeight: 600 },
    iconBg: "rgba(255,180,171,0.12)",
  },
  transfer: {
    icon: RefreshCcw,
    label: "Transfer",
    prefix: "",
    iconStyle: { color: "#4ade80" },
    amountStyle: { color: "#4ade80", fontWeight: 600 },
    iconBg: "rgba(74,222,128,0.12)",
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