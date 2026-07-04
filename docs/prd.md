# 📄 PRD — Pocket Mint

> **Product Requirements Document** · v1.0 · 2026-07-04
> Dokumen pendamping [RFC v2.1](./rfc.md). RFC = **bagaimana** membangun; PRD = **apa & mengapa**.

---

## 1. Ringkasan Eksekutif

Pocket Mint adalah **personal finance tracker** self-hosted dan private, dirancang untuk pengguna Indonesia yang mengelola banyak dompet dan produk kredit/paylater sekaligus. Nilai jual utamanya: **kejelasan utang & net worth yang akurat secara real-time**, dengan presisi finansial tingkat-produksi dan tanpa mengorbankan privasi.

---

## 2. Masalah & Latar Belakang

Aplikasi keuangan konsumen umumnya:
- **Melacak pengeluaran, tapi buruk melacak utang** — outstanding kartu kredit & paylater sering tidak akurat.
- **Menyembunyikan cicilan** — pengguna tidak tahu total beban bunga atau sisa tenor sampai tagihan datang.
- **Meminta data ke cloud pihak ketiga** — masalah privasi.
- **Salah menghitung uang** — floating-point error membuat angka "hampir benar".

Pengguna target hidup dengan 4–8 dompet (GoPay, OVO, bank, kas) **plus** 1–3 produk paylater (Kredivo, SPayLater, Indodana). Mereka butuh satu layar yang menjawab: _"Berapa net worth saya, berapa utang saya, dan cicilan apa yang jatuh tempo?"_

---

## 3. Visi Produk & Prinsip

**Visi:** terminal keuangan pribadi yang memberi **financial clarity** — jujur, presisi, dan sepenuhnya milik pengguna.

**Prinsip:**
1. **Privasi dulu** — data tidak pernah meninggalkan instance pengguna.
2. **Akurasi tidak bisa ditawar** — semua uang `Decimal`, nol floating-point error.
3. **Kejujuran data** — tidak memalsukan metrik; angka dekoratif tanpa data riil tidak ditampilkan.
4. **Low friction** — mencatat cepat (preset, kalkulator pintar, FAB, Add Transaction global).
5. **Data density tanpa clutter** — estetika Pro-Fintech Dark, kedalaman lewat kontras bukan dekorasi.

---

## 4. Target Pengguna & Persona

**Persona utama — "Rizal, si Pengguna Paylater Sadar-Finansial"**
- 25–35 th, melek teknologi, nyaman self-host (Docker/VPS/lokal).
- Punya banyak e-wallet + 2 paylater aktif; sering cicilan gadget/kebutuhan.
- Peduli privasi, tidak percaya app keuangan cloud.
- Butuh tahu: sisa limit paylater, beban cicilan bulan ini, net worth riil.

**Persona sekunder — "Developer yang ingin extend"**
- Ingin menambah otomasi (n8n, webhook WhatsApp) di atas API terbuka.

---

## 5. Tujuan & Metrik Keberhasilan

| Tujuan | Metrik keberhasilan |
|---|---|
| Net worth & utang akurat | 0 selisih rekonsiliasi antara `balance` dan riwayat transaksi |
| Presisi finansial | 0 bug floating-point; semua uang `Decimal(15,2)` |
| Input cepat | Catat transaksi < 10 detik; buat cicilan (preset) < 20 detik |
| Kejelasan cicilan | Setiap cicilan ACTIVE tampil dengan progres tenor & sisa |
| Privasi | 0 panggilan data keluar dari instance (selain otomasi yang diaktifkan pengguna) |

---

## 6. Ruang Lingkup

### In-Scope (v2)
- Multi-wallet (kas, bank, e-wallet, kartu kredit, paylater) dengan arsip.
- Transaksi INCOME/EXPENSE/TRANSFER + kategori.
- Cicilan dengan kalkulator bunga dua-mode (maju & reverse) — Model A front-loaded.
- Dashboard: net worth, total aset/utang, P&L bulanan, cicilan aktif, ringkasan wallet.
- Halaman Wallets: filter (All/Assets/Debts), sort, utilisasi & debt-ratio.
- Auth Owner-only (no public sign-up).
- Design system Pro-Fintech Dark.

### Out-of-Scope (v2)
- Investasi/trading, budgeting envelope, akuntansi double-entry.
- Open-Banking / sinkronisasi bank otomatis.
- Konversi multi-currency.
- Kolaborasi/multi-user sharing.
- Aplikasi mobile native (web responsif saja).

---

## 7. User Stories

**Wallets**
- Sebagai Owner, saya membuat wallet paylater dengan memilih preset (Kredivo 2.60%) agar bunga terisi otomatis.
- Sebagai Owner, saya melihat utilisasi & sisa limit tiap wallet DEBT agar tidak over-limit.
- Sebagai Owner, saya mengarsip wallet lama tanpa menghapus riwayatnya.

**Transactions**
- Sebagai Owner, saya mencatat pengeluaran dan memilih wallet + kategori dalam satu modal cepat.
- Sebagai Owner, saya melakukan transfer antar wallet dan kedua saldo terupdate atomik.

**Installments**
- Sebagai Owner, saya input cicilan dengan **hanya tahu tagihan bulanan** (+ harga & tenor), sistem menghitung bunga efektifnya.
- Sebagai Owner, saya melihat sisa limit paylater **langsung berkurang penuh** begitu cicilan dibuat (Model A).
- Sebagai Owner, saya memantau progres tiap cicilan (bulan ke-3 dari 12).

**Dashboard**
- Sebagai Owner, saya membuka satu layar dan langsung tahu net worth, aset, utang, income/expense bulan ini, dan cicilan aktif.

**Automation (Tahap 4)**
- Sebagai Owner, saya meneruskan notifikasi transaksi WhatsApp ke n8n, yang mengekstrak nominal via LLM dan mencatatnya otomatis via webhook.

---

## 8. Kebutuhan Fungsional

### 8.1 Wallets
- CRUD wallet; tipe granular (`CASH/BANK/E_WALLET/CREDIT_CARD/LOAN_PAYLATER`).
- `creditLimit` & `interestRate` untuk DEBT; preset auto-fill.
- Arsip (`isArchived`) — tersembunyi dari listing, riwayat tetap ada.
- Ringkasan per wallet: outstanding, sisa limit, utilisasi.

### 8.2 Transactions & Categories
- CRUD transaksi INCOME/EXPENSE/TRANSFER; filter by wallet/type/tanggal.
- Kategori INCOME/EXPENSE (unik per Owner).
- Transfer antar wallet **atomik**.
- Reversal saldo konsisten saat edit/hapus transaksi.

### 8.3 Installments (kritis)
- Kalkulator dua mode (§RFC 5.3): reverse (default) & persen.
- Model A: potong `grandTotal` sekali di bulan pertama (`balanceDeducted`), catat `monthlyAmount` sebagai beban berjalan.
- Status lifecycle: `ACTIVE → SETTLED/CANCELLED`.
- Snapshot `interestRate` saat pembuatan (tidak berubah walau rate wallet berubah).

### 8.4 Dashboard
- Net worth + total aset/utang; P&L bulanan (income/expense/net savings); daftar cicilan aktif; ringkasan wallet; transaksi terbaru.

### 8.5 Auth
- Owner Setup sekali; login; no public sign-up; semua data di-scope `userId`.

---

## 9. Kebutuhan Non-Fungsional

- **Privasi & self-host:** jalan penuh di instance pengguna (Supabase/Postgres milik pengguna).
- **Presisi:** semua uang `Decimal(15,2)`, bunga `Decimal(5,2)`; pembulatan hanya di UI (`Math.round`).
- **Integritas:** operasi multi-tabel atomik (`$transaction`); tanpa silent failure.
- **Keamanan:** password di-hash; ownership scoping; webhook token terpisah scope minimal.
- **Performa:** query ter-index (`userId`, `date`, `walletId`); dashboard load cepat.
- **Aksesibilitas & konsistensi UI:** design token tunggal, layout `(app)` container-max 1280px, kontras tinggi.
- **DX:** Prisma client di `apps/backend/src/generated/prisma`; frontend port **4000**.

---

## 10. Rencana Rilis (Milestone)

| Milestone | Cakupan | Status |
|---|---|---|
| M1 | DB & skema Prisma | ✅ Selesai |
| M2 | Backend core (CRUD + transaksi atomik) | ✅ Selesai |
| M3 | Cicilan + bunga (reverse calc, formatter) | ✅ Selesai |
| M3.5 | Redesign Pro-Fintech Dark (landing, login, dashboard, wallets) | ✅ Selesai |
| **M4** | **Otomatisasi (webhook + n8n + LLM WhatsApp)** | 🚧 Current |
| M5 (usulan) | Konsolidasi utang teknis (`DEBT_TYPES` tunggal, scheduler, test coverage) | ⬜ Backlog |

---

## 11. Risiko & Asumsi

**Risiko**
- `DEBT_TYPES` tidak konsisten antar file → salah hitung aset/utang di dashboard (lihat RFC §12). **Mitigasi:** satu sumber konstanta.
- Scheduler cicilan bulan ke-2+ belum terverifikasi → beban bulanan bisa tidak tercatat. **Mitigasi:** verifikasi/implement di M4/M5.
- Ketergantungan LLM eksternal (M4) berpotensi menyalahi prinsip privasi. **Mitigasi:** opt-in, dokumentasikan aliran data.

**Asumsi**
- Bunga pasar paylater ID bersifat **flat** (bukan efektif menurun).
- Satu Owner per deployment (skema tetap multi-user-ready).
- Pengguna nyaman self-host & mengelola instance Supabase sendiri.

---

## 12. Pertanyaan Terbuka
- Scheduler cicilan: cron backend vs komputasi lazy saat render?
- Perlakuan cicilan `ACTIVE` saat wallet-nya dihapus?
- Multi-currency: sinkronkan kolom `currency` (tipe FE) ke skema, atau hapus dari v2?
