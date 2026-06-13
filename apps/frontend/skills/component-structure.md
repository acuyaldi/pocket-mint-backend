# Component Structure Rules — Pocket Mint

## Struktur Folder
app/(app)/[feature]/

├── page.tsx              ← hanya layout + data fetching

├── components/           ← komponen spesifik fitur ini

│   ├── FeatureSummary.tsx

│   ├── FeatureList.tsx

│   └── FeatureModal.tsx

└── hooks/                ← custom hooks spesifik fitur

└── useFeatureData.ts
components/               ← komponen shared antar fitur

├── ui/                   ← komponen atomic (Button, Input, dll)

├── layout/               ← Sidebar, Header, dll

└── shared/               ← komponen reusable (Card, Modal, dll)

## Aturan page.tsx
- page.tsx HANYA boleh berisi:
  * Import komponen
  * Data fetching (fetch / API call)
  * State yang di-share antar komponen
  * Layout/susunan komponen
- Maksimal 150 baris — kalau lebih, pecah ke komponen

## Aturan Komponen
- Satu file = satu komponen utama
- Nama file PascalCase: `WalletList.tsx`, `CreateWalletModal.tsx`
- Props selalu didefinisikan dengan TypeScript interface di atas komponen
- State yang hanya dipakai satu komponen → taruh di komponen itu
- State yang dipakai lebih dari satu → angkat ke parent / page.tsx

## Aturan Penamaan
- Komponen  : PascalCase  → `WalletSummaryCard`
- File      : PascalCase  → `WalletSummaryCard.tsx`
- Hook      : camelCase + use prefix → `useWalletData`
- Helper    : camelCase   → `formatCurrency`
- Konstanta : UPPER_SNAKE → `PAYLATER_PRESETS`

## Data Fetching
- Fetch data di page.tsx atau custom hooks
- Komponen anak TIDAK fetch data sendiri
- Turunkan data via props ke komponen anak
- Gunakan React Query untuk data yang perlu di-cache atau refetch

## Modal Pattern
- Setiap modal adalah komponen terpisah
- Props wajib: `isOpen: boolean`, `onClose: () => void`
- Props opsional: `onSuccess: (data) => void` untuk callback
- State form ada di dalam modal, bukan di parent

## Design System
- SELALU gunakan warna dari design system (lihat WEB_DESIGN_GUIDELINES.md)
- JANGAN hardcode warna di luar token yang sudah didefinisikan
- Gunakan lucide-react untuk semua ikon
- JANGAN install UI library tambahan (shadcn, MUI, Chakra, dll)

## Yang Tidak Boleh
- JANGAN buat komponen lebih dari 300 baris
- JANGAN campur logic bisnis dengan UI di komponen yang sama
- JANGAN duplikasi komponen — cek folder shared dulu sebelum buat baru
- JANGAN gunakan inline style kecuali untuk nilai dinamis yang
  tidak bisa di-handle Tailwind