'use client'; // Wajib di baris pertama agar dibaca sebagai Client Component

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, ReactNode } from 'react';

export default function QueryProvider({ children }: { children: ReactNode }) {
  // Menggunakan useState agar QueryClient tidak terbuat ulang setiap kali layout re-render
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Sesuai dengan isi BLUEPRINT .md kita tadi:
            staleTime: 1000 * 60 * 5, // Data dianggap segar selama 5 menit
            refetchOnWindowFocus: false, // Gak perlu fetching ulang setiap kali user ganti tab browser
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}