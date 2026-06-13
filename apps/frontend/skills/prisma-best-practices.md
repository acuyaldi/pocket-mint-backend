# Prisma Best Practices — Pocket Mint

## Koneksi & Client
- SELALU gunakan singleton PrismaClient, jangan buat instance baru
  di setiap file
- Import dari: `src/generated/prisma/client`
- Jangan lupa `prisma.$disconnect()` di seed dan script one-off

## Operasi Atomik
- Semua operasi yang menyentuh lebih dari 1 tabel WAJIB pakai
  `prisma.$transaction([...])`
- Contoh wajib atomic: buat transaksi + update wallet.balance
- Contoh wajib atomic: transfer (debit from + credit to)
- Kalau $transaction gagal di tengah jalan → rollback otomatis,
  jangan handle manual

## Decimal & Tipe Data Finansial
- Semua field uang (amount, balance, credit_limit, dll) → Decimal
- Input  : `new Prisma.Decimal(value)`
- Output : `parseFloat(val.toString())`
- JANGAN pakai `Number()` langsung pada Decimal — hasilnya tidak presisi

## Query Performance
- Selalu tambahkan `where: { userId }` untuk semua query
  agar tidak ada data bocor antar user
- Gunakan `select` untuk ambil field yang dibutuhkan saja,
  jangan `findMany()` tanpa filter di tabel transactions
- Index yang sudah ada: wallet_id, date, category_id —
  manfaatkan di query filter

## onDelete Behavior
- Wallet dihapus → installments otomatis CANCELLED (via cascade)
- Jangan handle cascade manually di aplikasi layer
- Cek schema.prisma untuk memastikan relasi sudah benar

## Yang Tidak Boleh
- JANGAN pakai `upsert` untuk transaksi finansial
  (gunakan create + explicit check)
- JANGAN update wallet.balance lebih dari sekali
  dalam satu $transaction yang sama
- JANGAN gunakan raw SQL kecuali untuk reporting/aggregasi kompleks