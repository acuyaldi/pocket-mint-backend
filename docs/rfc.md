📑 RFC v2.0: Pocket Mint — Personal Finance Tracker (Core System)

Overview & Product Positioning

Pocket Mint adalah terminal manajemen keuangan pribadi (personal finance tracker) berbasis web yang bersifat 100% Private, Self-Hosted, dan Open-Source. Aplikasi ini dirancang khusus untuk mengonsolidasikan multi-wallet, melacak limit kredit/paylater secara real-time, serta mengelola amortisasi cicilan dengan kalkulator bunga dinamis.
Aturan Autentikasi & Akses:
    Tidak menyediakan pendaftaran akun publik (No Public Sign-Up).
    Alur utama langsung diarahkan ke halaman /login atau inisialisasi Owner Setup pada instance lokal milik pengguna.

Definisi, Konsep Kunci & Rumus Finansial

    Tipe Wallet:
        ASSET: Dompet bernilai positif (Cash, Bank, E-Wallet).
        DEBT: Dompet berbasis limit kredit (Kartu Kredit, Loan/Paylater).
    Net Worth:
    Net Worth=∑Saldo Wallet ASSET−∑Outstanding Wallet DEBT
    Arsitektur Balance Cicilan (Model A):
        Ketika transaksi cicilan dibuat, wallet.balance langsung dipotong sebesar grand_total (Pokok + Total Bunga) di bulan pertama agar sisa limit kredit instan akurat.
        Laporan pengeluaran bulanan hanya mencatat beban berjalan (monthly_amount) demi menjaga akurasi cash flow.
        Scheduler di bulan ke-2 dan seterusnya hanya mencatat riwayat pengeluaran tanpa memotong wallet.balance lagi.

Skema Database (Prisma Schema)
Tabel wallets
Field	Type	Keterangan
id	String (UUID)	Primary Key
name	String	Nama dompet (e.g., Kredivo, GoPay)
type	Enum (ASSET / DEBT)	Tipe dompet
balance	Decimal	Saldo berjalan (negatif = utang)
credit_limit	Decimal?	Limit Kredit (Hanya untuk tipe DEBT)
interest_rate	Decimal	Default 0. Bunga flat bawaan wallet per bulan dalam %
created_at	DateTime	Timestamp
Tabel installments
Field	Type	Keterangan
id	String (UUID)	Primary Key
wallet_id	String (UUID)	FK ke wallets
total_amount	Decimal	Harga pokok barang asli
interest_rate	Decimal	Snapshot % bunga saat transaksi dibuat (Default 0)
total_interest	Decimal	Total bunga hasil kalkulasi
grand_total	Decimal	Total hutang baru (total_amount + total_interest)
installment_months	Int	Tenor/Durasi Cicilan (Bulan)
current_term	Int	Pembayaran bulan ke-berapa saat ini
monthly_amount	Decimal	Beban bulanan riil (grand_total / installment_months)
balance_deducted	Boolean	Flag apakah wallet.balance sudah dipotong penuh (Default false)
status	Enum	ACTIVE / SETTLED / CANCELLED
start_date	DateTime	Bulan pertama cicilan dimulai
description	String	Deskripsi transaksi cicilan
Tabel transactions
Field	Type	Keterangan
id	String (UUID)	Primary Key
wallet_id	String (UUID)	FK ke wallets
type	Enum	INCOME / EXPENSE / TRANSFER
amount	Decimal	Nominal transaksi (Beban bulan berjalan jika cicilan)
description	String	Keterangan
category_id	String (UUID)	FK ke categories
is_installment	Boolean	Default false
installment_id	String (UUID)?	Nullable, FK ke installments
date	DateTime	Tanggal transaksi diakui
Logika Bisnis Kritis & Komponen Presisi
4.1. Operasi Finansial di Backend (Prisma Core)

Semua operasi matematika finansial wajib menggunakan pustaka Prisma.Decimal untuk menghindari floating-point error JavaScript.
    Rumus Kalkulasi Cicilan Baru:
    TypeScript
    total_interest = amount.mul(interestRate.div(100)).mul(installmentMonths);
    grand_total = amount.add(total_interest);
    monthly_amount = grand_total.div(installmentMonths);

**Validasi Mutlak:** API wajib menolak request jika interestRate < 0 atau interestRate > 100 (HTTP 400).

### 4.2. Layer Frontend Presentation (Anti-Angka Pecahan)
Semua nilai pecahan desimal hasil pembagian yang tampil di UI (seperti Rp 116.666,67) wajib dibungkus menggunakan Math.round() di dalam fungsi pembentuk format (*formatter helper*), contoh:
$   \text{Output UI} = \text{Math.round(monthly\_amount)} \rightarrow \text{Rp 116.667}   $

## 5. Spesifikasi Smart UX & Frontend Layout
### 5.1. Preset Data Bunga (Wallet Creation)
Konstanta statis di frontend untuk mempermudah pengisian bunga secara otomatis (*auto-fill*) tanpa disimpan di kolom database provider:
JavaScriptCopyconst PAYLATER_PRESETS = [
  { label: "Kredivo", rate: 2.60 },
  { label: "Indodana", rate: 3.00 },
  { label: "SPayLater", rate: 2.95 },
  { label: "GoPayLater", rate: 2.00 },
  { label: "Custom", rate: 0.00 }
]

5.2. Dua Mode Input Transaksi Cicilan (Smart Calculator)

    Mode A (Default - Input via Cicilan/Bulan): User hanya menginput nominal tagihan bulanan yang tertera di aplikasi paylater mereka. Sistem melakukan reverse calculation untuk mencari rate bunga:
    interestRate=(amount×installmentMonthsgrand_total−amount​)×100

    Dibatasi maksimal 2 angka di belakang koma (.toFixed(2)).

    Mode B (Input via Persentase Bunga): Diaktifkan lewat toggle manual. Sistem menggunakan angka interest_rate bawaan wallet untuk menghitung maju nominal cicilan bulanan.

6. API Endpoints
Wallets

    GET /api/v1/wallets — Menyertakan kolom interest_rate.

    POST /api/v1/wallets — Menyimpan preset bunga awal.

    GET /api/v1/wallets/:id/summary — Saldo berjalan, sisa limit, outstanding utang.

Transactions (Sistem Cicilan Terintegrasi)

    POST /api/v1/transactions — Menerima payload interestRate. Menangani penulisan ganda (dual-write) ke tabel installments dan transactions secara atomik di dalam blok $transaction.

7. Status Tahapan Implementasi

    [x] Tahap 1 — Database & Skema (Prisma Modifikasi + Push)

    [x] Tahap 2 — Backend Core (CRUD + Arsitektur Transaksi Atomik)

    [x] Tahap 3 — Logika Cicilan + Bunga (Smart Reverse Calculator & Formatter UI)

    [x] Tahap 3.5 — Pro-Fintech Dark Redesign (Landing Page & Login Vibe Alignment)

    [ ] Tahap 4 — Integrasi Otomatisasi (CURRENT STEPS)

        Pembuatan Webhook Secure Auth Token di backend Pocket Mint.

        Penyusunan alur kerja (Workflow) n8n.

        Ekstraksi teks pesan WhatsApp menggunakan LLM AI Node di n8n.