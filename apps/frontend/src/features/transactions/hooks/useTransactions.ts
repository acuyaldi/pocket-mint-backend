'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Transaction } from '@/src/types/transaction';

// Stale time: 5 minutes (in milliseconds)
const STALE_TIME = 5 * 60 * 1000;

/**
 * Fetch all transactions.
 * The backend returns an array of Transaction objects.
 */
export const useTransactions = () => {
  return useQuery<Transaction[], Error>({
    queryKey: ['transactions'],
    queryFn: async () => {
      const response = await api.get<{ status: string; data: Transaction[] }>('/transactions');
      // Backend wraps in {status, data}
      const arr = response.data?.data ?? [];
      return Array.isArray(arr) ? arr : [];
    },
    staleTime: STALE_TIME,
  });
};

/**
 * Update an existing transaction by ID.
 * Invalidates the transactions query on success so the list auto-refreshes.
 */
export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Transaction, // response type
    Error,       // error type
    { id: string } & Partial<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'userId'>>
  >({
    mutationFn: ({ id, ...updates }) =>
      api.put<{ status: string; data: Transaction }>(`/transactions/${id}`, updates).then((res) => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
    },
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Transaction, // response type
    Error,       // error type
    Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & {
      userId?: string;
    }
  >({
    mutationFn: (newTx) => api.post<{ status: string; data: Transaction }>('/transactions', newTx).then((res) => res.data.data),
    onSuccess: () => {
        // Refetch the transaction list and wallets after creating a new one
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['wallets'] });
      },
    }
  );
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { id: string },
    Error,
    string // transaction ID
  >({
    mutationFn: (id) =>
      api.delete<{ status: string; data: { id: string } }>(`/transactions/${id}`).then((res) => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
    },
  });
};
