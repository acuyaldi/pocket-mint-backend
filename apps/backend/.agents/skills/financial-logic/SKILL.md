---
name: financial-logic
description: Logika bisnis finansial Pocket Mint. Gunakan skill
  ini saat mengimplementasi kalkulasi wallet, cicilan, transfer,
  atau net worth.
license: MIT
metadata:
  author: pocket-mint
  version: "1.0.0"
---

# Financial Logic — Pocket Mint

## When to Apply
- Kalkulasi net worth, sisa limit, outstanding
- Membuat transaksi cicilan
- Transfer antar wallet
- Update wallet.balance

## Wallet Types
- ASSET : CASH, BANK, E_WALLET → balance selalu positif
- DEBT  : CREDIT_CARD, LOAN_PAYLATER → balance selalu negatif/nol

## Kalkulasi Utama
Net Worth    = Σ balance ASSET - Σ Math.abs(balance DEBT)
Sisa Limit   = credit_limit + balance  (balance negatif)
Outstanding  = Math.abs(balance)       (untuk DEBT wallet)

## Cicilan (Model A — Potong Penuh di Awal)
total_interest = amount × (interestRate/100) × months
grand_total    = amount + total_interest
monthly_amount = grand_total / months
Bulan 1 : wallet.balance -= grand_total (sekali, potong penuh)
installments.balance_deducted = true
Bulan 2+: INSERT transactions saja, JANGAN update balance lagi

## Transfer Antar Wallet
```typescript
// WAJIB atomik
await prisma.$transaction([
  prisma.wallet.update({
    where: { id: fromWalletId },
    data: { balance: { decrement: amount } }
  }),
  prisma.wallet.update({
    where: { id: toWalletId },
    data: { balance: { increment: amount } }
  }),
  prisma.transfer.create({ ... })
])
```

## Yang Tidak Boleh
- JANGAN hitung net worth dari SUM tabel transactions
- JANGAN update balance lebih dari sekali per cicilan
- JANGAN gunakan float untuk kalkulasi finansial
- JANGAN buat cicilan di wallet ASSET