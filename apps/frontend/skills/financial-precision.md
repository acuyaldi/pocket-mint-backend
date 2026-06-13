# Financial Precision Rules

## Wajib Diikuti untuk Semua Kalkulasi Finansial

### Tipe Data
- SELALU gunakan `Prisma.Decimal` untuk semua field finansial
- JANGAN gunakan `number`, `float`, atau `parseInt` untuk uang
- Konversi output: `parseFloat(val.toString())` sebelum kirim ke JSON

### Kalkulasi
- Pembulatan tampilan: `Math.round()` bukan `.toFixed()`
- `.toFixed()` mengembalikan STRING, bukan number — hindari untuk kalkulasi
- Semua operasi aritmatika finansial harus via Prisma.Decimal:
  new Prisma.Decimal(amount).plus(fee)
  new Prisma.Decimal(amount).times(rate)

### Rumus Bisnis Pocket Mint
- Net Worth = total_aset - total_utang
- Sisa Limit = credit_limit + balance (balance DEBT selalu negatif)
- Outstanding = Math.abs(balance) untuk wallet DEBT
- Monthly installment = grand_total / installment_months
- Grand total cicilan = amount + (amount × rate/100 × months)

### Yang Tidak Boleh
- JANGAN simpan hasil kalkulasi bunga sebagai float mentah
- JANGAN update wallet.balance lebih dari sekali per transaksi cicilan
- JANGAN hitung net worth dari sum tabel transactions
  (gunakan wallet.balance sebagai source of truth)