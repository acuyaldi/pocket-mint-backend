"use client";

import { motion } from "framer-motion";
import {
  Landmark,
  CreditCard,
  Wallet,
  Banknote,
  Handshake,
  MoreVertical,
} from "lucide-react";
import { FullWidthSparkline } from "./FullWidthSparkline";
import type { WalletItem as WalletType, DebtWallet } from "../page";

interface WalletItemProps {
  wallet: WalletType;
  onClick?: () => void;
}

const ICON_MAP = {
  landmark: Landmark,
  creditcard: CreditCard,
  wallet: Wallet,
  banknote: Banknote,
  handshake: Handshake,
} as const;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

function formatRp(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export default function WalletItem({ wallet, onClick }: WalletItemProps) {
  const Icon = ICON_MAP[wallet.icon as keyof typeof ICON_MAP] || Wallet;
  const isAsset = wallet.category === "asset";

  const borderColor = isAsset ? "#10B981" : "#F59E0B";
  const iconColor = isAsset ? "#38BDF8" : "#EF4444";
  const iconBgColor = isAsset ? "rgba(56,189,248,0.1)" : "rgba(239,68,68,0.1)";

  const debt = !isAsset ? (wallet as DebtWallet) : null;
  const remaining = debt ? debt.creditLimit - debt.outstanding : 0;
  const utilization = debt ? (debt.outstanding / debt.creditLimit) * 100 : 0;

  // Progress bar fill color based on utilization
  const progressColor =
    utilization >= 80 ? "#EF4444" : utilization >= 30 ? "#F59E0B" : "#10B981";

  return (
    <motion.div
      variants={fadeUp}
      onClick={onClick}
      className="relative overflow-hidden cursor-pointer"
      style={{
        backgroundColor: "#1E293B",
        border: `1px solid ${borderColor}`,
        borderRadius: "8px",
      }}
    >
      <div style={{ padding: "16px" }}>
        <div className="flex items-start gap-3 mb-3">
          {Icon && (
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                backgroundColor: iconBgColor,
                color: iconColor,
              }}
            >
              <Icon className="size-4" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p
              className="truncate"
              style={{
                fontSize: "14px",
                fontWeight: 500,
                color: "#F8FAFC",
                fontFamily: "var(--font-inter)",
              }}
            >
              {wallet.name}
            </p>
            <p
              className="capitalize mt-0.5"
              style={{
                fontSize: "11px",
                color: "#94A3B8",
                fontFamily: "var(--font-inter)",
              }}
            >
              {wallet.kind === "e_wallet"
                ? "E-Wallet"
                : wallet.kind === "paylater"
                  ? "Credit Line"
                  : wallet.kind === "bank"
                    ? "High-Yield Account"
                    : wallet.kind.replace("_", " ")}
            </p>
          </div>
          <button
            className="p-0.5 -mr-0.5 -mt-0.5 transition-colors"
            style={{ color: "#64748B" }}
          >
            <MoreVertical className="size-3.5" />
          </button>
        </div>

        {isAsset ? (
          <>
            <p
              className="uppercase tracking-widest"
              style={{ fontSize: "10px", fontWeight: 600, color: "#94A3B8", fontFamily: "var(--font-inter)" }}
            >
              Available Balance
            </p>
            <p
              className="tracking-tight mt-1"
              style={{
                fontSize: "20px",
                fontWeight: 600,
                color: "#F8FAFC",
                fontFamily: "var(--font-hanken)",
              }}
            >
              {formatRp(wallet.balance)}
            </p>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p
                  className="uppercase tracking-widest"
                  style={{ fontSize: "10px", fontWeight: 600, color: "#94A3B8", fontFamily: "var(--font-inter)" }}
                >
                  Outstanding
                </p>
                <p
                  className="mt-0.5"
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#EF4444",
                    fontFamily: "var(--font-hanken)",
                  }}
                >
                  {formatRp(debt!.outstanding)}
                </p>
              </div>
              <div className="text-right">
                <p
                  className="uppercase tracking-widest"
                  style={{ fontSize: "10px", fontWeight: 600, color: "#94A3B8", fontFamily: "var(--font-inter)" }}
                >
                  Remaining
                </p>
                <p
                  className="mt-0.5"
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#F8FAFC",
                    fontFamily: "var(--font-hanken)",
                  }}
                >
                  {formatRp(remaining)}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div
              className="overflow-hidden mb-3"
              style={{ height: "4px", borderRadius: "9999px", backgroundColor: "#334155" }}
            >
              <motion.div
                className="h-full"
                style={{ borderRadius: "9999px", backgroundColor: progressColor }}
                initial={{ width: 0 }}
                animate={{ width: `${utilization}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: "10px", color: "#94A3B8", fontFamily: "var(--font-inter)" }}>
                Utilization
              </span>
              <span
                className="font-semibold"
                style={{ fontSize: "10px", color: progressColor, fontFamily: "var(--font-inter)" }}
              >
                {utilization.toFixed(0)}%
              </span>
            </div>
          </>
        )}
      </div>

      {isAsset && wallet.sparklineData && (
        <div className="px-0 pb-3">
          <FullWidthSparkline data={wallet.sparklineData} color="#38BDF8" />
        </div>
      )}
    </motion.div>
  );
}
