# 📑 RFC v2.1 — Pocket Mint (Core System)

> **Status:** Living document · **Terakhir direkonsiliasi dengan kode:** 2026-07-04
> **Sumber kebenaran teknis:** `apps/backend/prisma/schema.prisma` (skema) + `apps/frontend/app/globals.css` (design token).
> Dokumen ini _mendeskripsikan_ implementasi; jika ada konflik, **kode yang menang** — perbarui dokumen ini, bukan sebaliknya.

---

## 1. Ringkasan & Positioning Produk

Pocket Mint adalah **terminal manajemen keuangan pribadi** berbasis web yang bersifat **100% Private, Self-Hosted, dan Open-Source**. Fokusnya bukan sekadar mencatat pengeluaran, melainkan memberi **kejelasan finansial (financial clarity)** untuk pengguna Indonesia yang hidup dengan banyak dompet dan produk kredit/paylater sekaligus.

Tiga kapabilitas inti:

1. **Konsolidasi multi-wallet** — kas, bank, e-wallet, kartu kredit, dan paylater dalam satu Net Worth.
2. **Pelacakan limit kredit/paylater real-time** — outstanding, sisa limit, dan rasio utilisasi selalu akurat.
3. **Manajemen amortisasi cicilan** dengan kalkulator bunga dinamis (dua arah: maju & reverse).

### Aturan Autentikasi & Akses

- **No Public Sign-Up.** Tidak ada pendaftaran akun publik.
- Instance adalah milik satu **Owner**. Alur diarahkan ke `/login`, atau **Owner Setup** saat inisialisasi instance lokal pertama kali.
- Seluruh data di-scope per `userId` (Owner tunggal per deployment secara default, namun skema mendukung multi-user).

---

## 2. Tujuan & Non-Tujuan

### Tujuan (Goals)

- **Akurasi finansial mutlak** — nol floating-point error pada seluruh perhitungan uang.
- **Kejelasan utang** — pengguna tahu persis outstanding, sisa limit, dan beban cicilan berjalan.
- **Privasi total** — data tidak pernah keluar dari instance milik pengguna.
- **Low-friction input** — mencatat transaksi & cicilan harus cepat (preset bunga, kalkulator pintar).

### Non-Tujuan (Non-Goals)

- Bukan aplikasi investasi/trading, budgeting envelope, atau akuntansi double-entry penuh.
- Tidak ada integrasi bank/Open-Banking otomatis (data dimasukkan manual atau via otomasi milik pengguna, lihat Tahap 4).
- Tidak ada multi-currency conversion (kolom `currency` ada, tapi konversi lintas mata uang di luar lingkup v2).
- Tidak ada kolaborasi/sharing antar pengguna.

---

## 3. Definisi & Konsep Kunci

### 3.1 Tipe Wallet (granular) vs Kategori (derived)

`WalletType` adalah enum granular di database — **bukan** `ASSET`/`DEBT`:

| `WalletType` | Kategori turunan | Keterangan |
|---|---|---|
| `CASH` | ASSET | Uang tunai |
| `BANK` | ASSET | Rekening bank |
| `E_WALLET` | ASSET | GoPay, OVO, Dana, dll |
| `CREDIT_CARD` | **DEBT** | Kartu kredit |
| `LOAN_PAYLATER` | **DEBT** | Kredivo, Indodana, SPayLater, dll |

`ASSET`/`DEBT` adalah **klasifikasi turunan di aplikasi**, bukan kolom DB:

```ts
const DEBT_TYPES = ["CREDIT_CARD", "LOAN_PAYLATER"];
const isDebt = DEBT_TYPES.includes(wallet.type);
```

> ⚠️ **Konsistensi wajib.** Daftar `DEBT_TYPES` saat ini terduplikasi di beberapa file frontend (`wallets/page.tsx`, `WalletCard.tsx`) dan berbeda dengan konstanta di `dashboard/page.tsx` (yang keliru memakai `"LOAN"`/`"PAYLATER"`). Ini **bug turunan** yang harus dikonsolidasikan ke satu sumber (`src/types/wallet.ts`). Lihat §12.

### 3.2 Rumus Turunan

```
Net Worth      = Σ balance(ASSET)            − Σ |balance(DEBT)|
Outstanding    = |balance|  untuk wallet DEBT (balance disimpan negatif = utang)
Sisa Limit     = creditLimit − Outstanding
Utilisasi (%)  = min( round(Outstanding / creditLimit × 100), 100 )
Debt Ratio (%) = (Σ Outstanding DEBT / Σ creditLimit DEBT) × 100
```

- **Ambang aman Debt Ratio:** `< 30%` (status "Aman"), `30–50%` (waspada), `> 50%` (bahaya).
- Utilisasi/rasio hanya dihitung bila `creditLimit > 0`.

---

## 4. Model Data (Prisma)

Sumber kebenaran: `apps/backend/prisma/schema.prisma`. ID = **`cuid()`**. Nama field di bawah adalah field **Prisma model** (camelCase); kolom DB memakai `@map` snake_case. Semua nilai uang **`Decimal(15,2)`**, bunga **`Decimal(5,2)`**.

### 4.1 `User`
| Field | Tipe | Keterangan |
|---|---|---|
| `id` | String `cuid()` | PK |
| `email` | String @unique | Login Owner |
| `name` | String | Nama Owner |
| `password` | String | Hash (jangan pernah plaintext) |
| `avatarUrl` | String? | Opsional |
| `createdAt`/`updatedAt` | DateTime | Audit |

Relasi: `wallets`, `categories`, `transactions`, `installments`, `transfers` (semua `onDelete: Cascade`).

### 4.2 `Wallet`
| Field | Tipe | Keterangan |
|---|---|---|
| `id` | String `cuid()` | PK |
| `userId` | String | FK → User, `@@index` |
| `name` | String | e.g. Kredivo, GoPay |
| `type` | `WalletType` | default `CASH` |
| `balance` | Decimal(15,2) | Saldo berjalan; **negatif = utang** untuk DEBT |
| `creditLimit` | Decimal(15,2) | default 0; hanya relevan untuk DEBT |
| `initialBalance` | Decimal(15,2) | Saldo awal saat wallet dibuat (basis rekonsiliasi) |
| `interestRate` | Decimal(5,2) | Bunga flat **per bulan** (%). default 0 (ASSET) |
| `icon` / `color` | String? | Presentasi UI |
| `isArchived` | Boolean | default false; wallet diarsip tidak tampil di listing |
| `createdAt`/`updatedAt` | DateTime | Audit |

### 4.3 `Category`
| Field | Tipe | Keterangan |
|---|---|---|
| `id` | String `cuid()` | PK |
| `userId` | String | FK → User |
| `name` | String | Nama kategori |
| `type` | `CategoryType` | `INCOME` \| `EXPENSE` |
| `icon`/`color` | String? | Presentasi |

Constraint: `@@unique([userId, name, type])`.

### 4.4 `Transaction`
| Field | Tipe | Keterangan |
|---|---|---|
| `id` | String `cuid()` | PK |
| `userId` | String | FK → User |
| `walletId` | String | FK → Wallet (`onDelete: Cascade`) |
| `categoryId` | String? | FK → Category (`onDelete: SetNull`) |
| `type` | `TransactionType` | `INCOME` \| `EXPENSE` \| `TRANSFER` |
| `amount` | Decimal(15,2) | Nominal; **beban bulan berjalan** bila cicilan |
| `description` | String? | Keterangan |
| `isInstallment` | Boolean | default false |
| `installmentId` | String? | FK → Installment (`onDelete: SetNull`) |
| `date` | DateTime | Tanggal diakui |

Index: `[userId,date]`, `[userId,type]`, `[walletId,date]`, `[categoryId]`, `[installmentId]`.

### 4.5 `Installment` (cicilan)
| Field | Tipe | Keterangan |
|---|---|---|
| `id` | String `cuid()` | PK |
| `userId` / `walletId` | String | FK |
| `totalAmount` | Decimal(15,2) | Harga pokok barang |
| `interestRate` | Decimal(5,2) | **Snapshot** bunga saat transaksi dibuat |
| `totalInterest` | Decimal(15,2) | Hasil kalkulasi bunga |
| `grandTotal` | Decimal(15,2) | `totalAmount + totalInterest` |
| `installmentMonths` | Int | Tenor (bulan) |
| `currentTerm` | Int | Cicilan bulan ke-berapa; default 1 |
| `monthlyAmount` | Decimal(15,2) | `grandTotal / installmentMonths` |
| `status` | `InstallmentStatus` | `ACTIVE` \| `SETTLED` \| `CANCELLED` |
| `startDate` | DateTime | Bulan pertama |
| `balanceDeducted` | Boolean | Flag: saldo sudah dipotong penuh (Model A). default false |
| `description` | String? | Deskripsi |

### 4.6 `Transfer` (baru — belum ada di RFC lama)
Transfer antar-wallet yang **atomik** (potong `fromWallet`, tambah `toWallet` dalam satu `$transaction`).

| Field | Tipe | Keterangan |
|---|---|---|
| `id` | String `cuid()` | PK |
| `userId` | String | FK → User |
| `fromWalletId` / `toWalletId` | String | FK → Wallet |
| `amount` | Decimal(15,2) | Nominal transfer |
| `note` | String? | Catatan |
| `date` | DateTime | Tanggal |

---

## 5. Logika Bisnis Kritis & Presisi

### 5.1 Presisi Decimal (mutlak di backend)

Seluruh operasi matematika uang **wajib** memakai `Prisma.Decimal` — **tidak boleh** `number`/`float`/`parseInt`. Konversi ke `number` hanya di **output boundary** via `parseFloat(val.toString())`. Prisma client di-generate ke path non-default: `apps/backend/src/generated/prisma`.

### 5.2 Model A — Front-Loaded Balance Deduction

Arsitektur pemotongan saldo cicilan:

1. **Bulan pertama:** `wallet.balance` langsung dipotong sebesar **`grandTotal`** (pokok + total bunga) → sisa limit kredit instan akurat. Set `balanceDeducted = true`.
2. **Laporan pengeluaran bulanan** hanya mencatat **`monthlyAmount`** (beban berjalan) → menjaga akurasi cash-flow, bukan double-count.
3. **Scheduler bulan ke-2 dst.** hanya menulis **riwayat pengeluaran** (`Transaction`) tanpa memotong `balance` lagi (dijaga oleh flag `balanceDeducted`).

> **Invarian:** untuk satu `Installment`, saldo wallet hanya boleh dipotong **satu kali** sepanjang `grandTotal`. Flag `balanceDeducted` adalah guard-nya.

### 5.3 Rumus Kalkulator Cicilan (bunga flat)

**Maju — Mode Persen (input: pokok `P`, tenor `n`, rate `r`%):**
```ts
totalInterest = P.mul(r.div(100)).mul(n);
grandTotal    = P.add(totalInterest);
monthlyAmount = grandTotal.div(n);
```

**Reverse — Mode Cicilan/Bulan (input: pokok `P`, tenor `n`, cicilan bulanan `M`):**
```
grandTotal    = M × n
totalInterest = grandTotal − P
rate (%)      = (totalInterest / (P × n)) × 100      // dibatasi .toFixed(2)
```
> Klarifikasi vs RFC lama: Mode reverse **butuh 3 input** (pokok + tenor + cicilan/bulan) untuk menyelesaikan `rate`. "Hanya input cicilan bulanan" tidak cukup secara matematis.

### 5.4 Validasi Mutlak (backend)

- **Tolak** request bila `interestRate < 0` **atau** `interestRate > 100` → **HTTP 400**.
- Tenor `installmentMonths >= 1`. Pokok `totalAmount > 0`.
- Transfer: `fromWalletId != toWalletId`, `amount > 0`.
- Kepemilikan: setiap wallet/kategori/transaksi yang direferensikan **wajib** milik `userId` pemanggil (tolak 403/404 bila bukan).

### 5.5 Layer Presentasi — Anti-Angka Pecahan

Nilai desimal hasil pembagian (mis. `Rp 116.666,67`) **wajib** dibungkus `Math.round()` di dalam formatter helper sebelum ditampilkan:

```
Output UI = Math.round(monthlyAmount)   →   Rp 116.667
```
Pembulatan hanya di **tampilan**; nilai tersimpan di DB tetap presisi penuh `Decimal(15,2)`.

---

## 6. Autentikasi & Keamanan

- **Owner Setup** sekali jalan pada instance baru (buat User pertama). Setelah itu **no public sign-up**.
- Frontend memakai **Supabase Auth** (`@supabase/ssr`) hanya untuk sesi/gate; middleware `updateSession` me-redirect request tak terautentikasi ke `/login` (307).
- Backend melindungi endpoint state-changing dengan **API key / token** (lihat `middleware/apiKeyAuth.ts`) dan **ownership scoping** per `userId`.
- Password disimpan sebagai **hash** — tidak pernah plaintext, tidak pernah di-log.
- Webhook otomasi (Tahap 4) memakai **Secure Auth Token** terpisah dengan scope minimal.

---

## 7. Kontrak API (v1)

Base path: `/api/v1`. Semua endpoint (kecuali auth) butuh sesi terautentikasi + scoping `userId`. Uang dikirim sebagai string/number hasil `parseFloat` di boundary.

### Auth
- `POST /api/v1/auth/setup` — Owner Setup (hanya bila belum ada User). ✅ core
- `POST /api/v1/auth/login` — login. ✅ core

### Wallets
- `GET /api/v1/wallets` — daftar wallet (termasuk `interestRate`, `creditLimit`, `isArchived`). ✅
- `POST /api/v1/wallets` — buat wallet (simpan preset bunga awal). ✅
- `PATCH /api/v1/wallets/:id` — update / arsip (`isArchived`). ✅
- `DELETE /api/v1/wallets/:id` — hapus (cascade transaksi). ✅
- `GET /api/v1/wallets/:id/summary` — saldo berjalan, sisa limit, outstanding, utilisasi. ✅

### Categories
- `GET/POST/PATCH/DELETE /api/v1/categories` — CRUD kategori (INCOME/EXPENSE). ✅

### Transactions (terintegrasi cicilan)
- `GET /api/v1/transactions` — daftar (filter by wallet/type/date). ✅
- `POST /api/v1/transactions` — menerima payload `interestRate` saat cicilan; **dual-write** ke `installments` + `transactions` **atomik** dalam satu blok `$transaction` (Model A). ✅
- `PATCH/DELETE /api/v1/transactions/:id` — dengan reversal saldo yang konsisten. ✅

### Installments
- `GET /api/v1/installments` — daftar cicilan aktif + progres (`currentTerm/installmentMonths`). ✅
- `PATCH /api/v1/installments/:id` — update status (`SETTLED`/`CANCELLED`). ✅

### Transfers
- `POST /api/v1/transfers` — transfer antar wallet **atomik**. ✅

### Automation (Tahap 4 — planned)
- `POST /api/v1/webhooks/ingest` — endpoint aman untuk n8n mengirim transaksi hasil ekstraksi LLM dari pesan WhatsApp. 🚧

> Legenda: ✅ core (Tahap 1–3 selesai) · 🚧 direncanakan.

---

## 8. Smart UX & Frontend

### 8.1 Preset Bunga (auto-fill saat buat wallet DEBT)
Konstanta statis frontend (tidak disimpan sebagai tabel provider):

```ts
const PAYLATER_PRESETS = [
  { label: "Kredivo",    rate: 2.60 },
  { label: "Indodana",   rate: 3.00 },
  { label: "SPayLater",  rate: 2.95 },
  { label: "GoPayLater", rate: 2.00 },
  { label: "Custom",     rate: 0.00 },
];
```

### 8.2 Dua Mode Kalkulator Cicilan
- **Mode Cicilan/Bulan (default):** reverse-calc `rate` dari pokok + tenor + cicilan bulanan (§5.3). Rate `.toFixed(2)`.
- **Mode Persen (toggle manual):** hitung maju `monthlyAmount` dari `interestRate` bawaan wallet.

### 8.3 Design System — "Pro-Fintech Dark"
- Token warna hardcoded via `globals.css @theme` (bukan palet default Tailwind). Sumber kebenaran token: `apps/frontend/skills/design.md`.
- **Container-max 1280px** (`max-w-7xl`) diterapkan di layout `(app)` — topbar + semua halaman berbagi satu kolom agar konsisten.
- Kartu memakai `rounded-xl`; frame chrome (sidebar/topbar) memakai border token `#262626`.

---

## 9. Error Handling & Validasi

- Validasi payload dengan **Zod** di boundary API; error → **HTTP 400** dengan pesan field-level.
- Pelanggaran kepemilikan → **403/404** (jangan bocorkan eksistensi resource milik user lain).
- Operasi multi-tabel (cicilan, transfer, hapus wallet) **wajib** dalam `$transaction` — gagal separuh dilarang.
- Jangan menelan error diam-diam; propagasikan agar tidak terjadi kehilangan/inkoherensi data.

## 10. Testing & Kualitas

- Belum ada test runner terpasang (README root menyebut Jest/Supertest — **stale**).
- Prioritas coverage saat ditambahkan: rumus cicilan (maju & reverse), invarian Model A (`balanceDeducted` sekali potong), transfer atomik, dan scoping kepemilikan.
- `npm run lint` + `tsc --noEmit` sebagai gate minimum sebelum merge.

---

## 11. Tahapan Implementasi

- [x] **Tahap 1** — Database & Skema (Prisma + push)
- [x] **Tahap 2** — Backend Core (CRUD + arsitektur transaksi atomik)
- [x] **Tahap 3** — Logika Cicilan + Bunga (reverse calculator & formatter UI)
- [x] **Tahap 3.5** — Pro-Fintech Dark Redesign (landing, login, dashboard, wallets)
- [ ] **Tahap 4 — Integrasi Otomatisasi (CURRENT)**
  - [ ] Webhook Secure Auth Token di backend
  - [ ] Workflow n8n
  - [ ] Ekstraksi teks WhatsApp via LLM node di n8n → `POST /api/v1/webhooks/ingest`

---

## 12. Pertanyaan Terbuka, Risiko & Alternatif

**Risiko / utang teknis yang teridentifikasi:**
1. **`DEBT_TYPES` terduplikasi & tidak konsisten** — `dashboard/page.tsx` memakai `["CREDIT_CARD","LOAN","PAYLATER"]` sementara skema/tipe memakai `LOAN_PAYLATER`. Akibatnya perhitungan aset/utang dashboard bisa salah. **Aksi:** ekspor satu konstanta dari `src/types/wallet.ts`.
2. **Scheduler bulan ke-2 dst.** (§5.2) belum jelas terimplementasi — perlu verifikasi cron/scheduler sumbernya.
3. **Multi-currency** — kolom `currency` ada di tipe frontend tapi tidak di skema Prisma; sinkronkan atau hapus.

**Pertanyaan terbuka:**
- Apakah scheduler cicilan berjalan sebagai cron backend, atau dihitung lazy saat render? (menentukan kebutuhan Tahap 4)
- Kebijakan saat wallet DEBT dihapus sementara cicilan masih `ACTIVE`?

**Alternatif yang ditolak:**
- **Amortisasi efektif (bunga menurun)** ditolak demi kesederhanaan — pasar paylater ID umumnya flat. Bisa ditinjau ulang bila dibutuhkan.
- **Model B (potong saldo per bulan)** ditolak: membuat sisa limit tidak akurat sampai cicilan lunas.
