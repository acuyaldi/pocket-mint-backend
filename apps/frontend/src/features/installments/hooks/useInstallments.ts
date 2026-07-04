'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

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
  grandTotal: number;
  totalInterest: number;
  interestRate: number;
  status: 'ACTIVE' | 'SETTLED' | 'CANCELLED';
  startDate: string;
  balanceDeducted: boolean;
}

export interface PaylaterRate {
  match: string; // lowercase substring matched against wallet name
  name: string;
  rate: number; // bunga flat %/bulan
  adminFee: number; // % dari pokok, sekali bayar
}

/**
 * Static paylater provider rates from the backend. Never refetched (static data).
 */
export function usePaylaterRates() {
  return useQuery<PaylaterRate[], Error>({
    queryKey: ['paylater-rates'],
    queryFn: async () => {
      const res = await api.get<{ data: PaylaterRate[] }>('/installments/rates');
      return res.data?.data ?? [];
    },
    staleTime: Infinity,
  });
}

/**
 * Fetch installments, optionally filtered by status.
 */
export function useInstallments(status?: string) {
  return useQuery<Installment[], Error>({
    queryKey: ['installments', status ?? 'all'],
    queryFn: async () => {
      const params = status ? { status } : {};
      const res = await api.get<{ data: Installment[] }>('/installments', { params });
      return res.data?.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
