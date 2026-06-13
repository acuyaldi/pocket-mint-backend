# 🚀 Pocket Mint — Frontend Optimization Blueprint (Next.js & React Query)

Dokumen ini berisi cetak biru arsitektur, rencana optimisasi, dan panduan integrasi frontend (`apps/frontend`) dengan backend Express (`apps/5001`). Berdasarkan praktik terbaik industri modern 2026.

---

## 🏗️ 1. Arsitektur Folder Frontend (`apps/frontend/src`)
Untuk menjaga skalabilitas monorepo, kita akan menerapkan struktur folder berbasis fitur (*feature-based layers*):

```text
src/
├── app/                  # Next.js App Router (Pages, Layouts)
├── components/           # UI Components Global (Re-useable seperti Button, Input)
│   └── ui/               # Shadcn UI primitives
├── features/             # Logika Bisnis Spesifik Fitur
│   ├── dashboard/        # Fitur Ringkasan Saldo & Grafik
│   └── transactions/     # Fitur CRUD Transaksi (Form, Tabel, Detail)
│       ├── components/   # UI khusus transaksi (TransactionTable.tsx)
│       ├── hooks/        # React Query Custom Hooks (useTransactions.ts)
│       └── services/     # API fetcher (transactionService.ts)
├── lib/                  # Konfigurasi Pihak Ketiga (Axios, React Query Client)
└── types/                # TypeScript Interfaces global