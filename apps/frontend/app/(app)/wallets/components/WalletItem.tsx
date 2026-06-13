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
import { cn } from "@/lib/utils";
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

  const borderColor = isAsset ? "border-emerald-500/40" : "border-amber-500/40";
  const iconBg = isAsset ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400";

  const debt = !isAsset ? (wallet as DebtWallet) : null;
  const remaining = debt ? debt.creditLimit - debt.outstanding : 0;
  const utilization = debt ? (debt.outstanding / debt.creditLimit) * 100 : 0;

  return (
    <motion.div
      variants={fadeUp}
      onClick={onClick}
      className={cn(
        "relative rounded-2xl border bg-[#0a0a0a] overflow-hidden",
        borderColor,
        "hover:-translate-y-1 hover:shadow-lg hover:shadow-black/40 transition-all duration-300 cursor-pointer",
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          {Icon && (
            <div className={cn("size-9 rounded-lg flex items-center justify-center shrink-0", iconBg)}>
              <Icon className="size-4" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{wallet.name}</p>
            <p className="text-[11px] text-white/40 mt-0.5 capitalize">
              {wallet.kind === "e_wallet"
                ? "E-Wallet"
                : wallet.kind === "paylater"
                  ? "Credit Line"
                  : wallet.kind === "bank"
                    ? "High-Yield Account"
                    : wallet.kind.replace("_", " ")}
            </p>
          </div>
          <button className="text-white/20 hover:text-white/50 transition-colors p-0.5 -mr-0.5 -mt-0.5">
            <MoreVertical className="size-3.5" />
          </button>
        </div>

        {isAsset ? (
          <>
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">Available Balance</p>
            <p className="text-xl font-bold text-white tracking-tight mt-1">{formatRp(wallet.balance)}</p>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">Outstanding</p>
                <p className="text-base font-bold text-red-400 mt-0.5">{formatRp(debt!.outstanding)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">Remaining</p>
                <p className="text-base font-bold text-white mt-0.5">{formatRp(remaining)}</p>
              </div>
            </div>

            <div className="mb-3 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                className={cn(
                  "h-full rounded-full",
                  utilization > 70 ? "bg-red-500/80" : utilization > 40 ? "bg-amber-500/70" : "bg-emerald-500/60",
                )}
                initial={{ width: 0 }}
                animate={{ width: `${utilization}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/40">Utilization</span>
              <span
                className={cn(
                  "text-[10px] font-semibold",
                  utilization > 70 ? "text-red-400" : utilization > 40 ? "text-amber-400" : "text-emerald-400",
                )}
              >
                {utilization.toFixed(0)}%
              </span>
            </div>
          </>
        )}
      </div>

      {isAsset && wallet.sparklineData && (
        <div className="px-0 pb-3">
          <FullWidthSparkline data={wallet.sparklineData} />
        </div>
      )}
    </motion.div>
  );
}
