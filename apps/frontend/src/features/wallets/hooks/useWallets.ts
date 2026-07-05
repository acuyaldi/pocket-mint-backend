'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Wallet, WalletType } from '@/src/types/wallet';

const STALE_TIME = 5 * 60 * 1000;

export const useWallets = () => {
  return useQuery<Wallet[], Error>({
    queryKey: ['wallets'],
    queryFn: async () => {
      const response = await api.get<{ status: string; data: Wallet[] }>('/wallets');
      const arr = response.data?.data ?? [];
      return Array.isArray(arr) ? arr : [];
    },
    staleTime: STALE_TIME,
  });
};

export interface CreateWalletDto {
  name: string;
  type: WalletType;
  balance?: number;
  creditLimit?: number;
  interestRate?: number;
  adminFee?: number;
  adminFeeType?: 'FLAT' | 'PERCENT';
  color?: string;
  icon?: string;
}

export const useCreateWallet = () => {
  const queryClient = useQueryClient();

  return useMutation<Wallet, Error, CreateWalletDto>({
    mutationFn: (dto) =>
      api.post<{ status: string; data: Wallet }>('/wallets', dto).then((res) => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};

export const useUpdateWallet = () => {
  const queryClient = useQueryClient();

  return useMutation<Wallet, Error, { id: string; isArchived?: boolean } & Partial<CreateWalletDto>>({
    mutationFn: ({ id, ...updates }) =>
      api.put<{ status: string; data: Wallet }>(`/wallets/${id}`, updates).then((res) => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};

export const useDeleteWallet = () => {
  const queryClient = useQueryClient();

  return useMutation<{ id: string }, Error, string>({
    mutationFn: (walletId) =>
      api.delete<{ status: string; data: { id: string } }>(`/wallets/${walletId}`).then((res) => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};
