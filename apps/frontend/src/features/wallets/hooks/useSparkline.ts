'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface SparklinePoint {
  date: string;
  balance: number;
}

/**
 * Fetch sparkline data (up to 7 balance snapshots) for a single wallet.
 * Returns empty array while loading or if < 2 data points exist.
 */
export function useWalletSparkline(walletId: string) {
  return useQuery<SparklinePoint[], Error>({
    queryKey: ['wallet-sparkline', walletId],
    queryFn: async () => {
      const res = await api.get<{ data: SparklinePoint[] }>(`/wallets/${walletId}/sparkline`);
      return res.data?.data ?? [];
    },
    staleTime: 10 * 60 * 1000, // 10 min
    refetchOnWindowFocus: false,
  });
}
