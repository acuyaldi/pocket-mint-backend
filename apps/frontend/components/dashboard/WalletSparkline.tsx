"use client";

import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { useWalletSparkline, SparklinePoint } from "@/src/features/wallets/hooks/useSparkline";

interface WalletSparklineProps {
  walletId: string;
  isDebt: boolean;
}

/**
 * Mini sparkline chart showing last 7 balance snapshots for a wallet.
 * Renders nothing while loading or if fewer than 2 data points exist.
 */
export function WalletSparkline({ walletId, isDebt }: WalletSparklineProps) {
  const { data, isLoading } = useWalletSparkline(walletId);

  if (isLoading) {
    return (
      <div
        className="w-full rounded-b-lg"
        style={{ height: 48, background: "linear-gradient(90deg, #1E293B 0%, #334155 50%, #1E293B 100%)", animation: "pulse 1.6s ease-in-out infinite" }}
      />
    );
  }

  if (!data || data.length < 2) return null;

  const strokeColor = isDebt ? "#EF4444" : "#10B981";
  const gradientId = `sparkline-gradient-${walletId}`;

  return (
    <div className="w-full" style={{ height: 48 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.15} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="balance"
            stroke={strokeColor}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
