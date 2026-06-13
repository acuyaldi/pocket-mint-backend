---
name: prisma-backend
description: Prisma ORM best practices untuk backend Pocket Mint.
  Gunakan skill ini saat menulis query Prisma, membuat migration,
  atau menghandle transaksi finansial atomik.
license: MIT
metadata:
  author: pocket-mint
  version: "1.0.0"
---

# Prisma Backend Best Practices

## When to Apply
- Menulis query Prisma baru
- Membuat atau memodifikasi schema
- Menghandle transaksi atomik
- Serialisasi Decimal ke JSON response

## Rules

### Singleton Client
SELALU gunakan singleton PrismaClient:
```typescript
// lib/prisma.ts
const globalForPrisma = global as { prisma?: PrismaClient }
export const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### Atomic Transactions
Semua operasi multi-tabel WAJIB pakai $transaction:
```typescript
// ✅ Benar
await prisma.$transaction([
  prisma.transaction.create({ ... }),
  prisma.wallet.update({ ... })
])

// ❌ Salah
await prisma.transaction.create({ ... })
await prisma.wallet.update({ ... })
```

### Decimal Handling
```typescript
// Input
new Prisma.Decimal(amount)

// Output — wajib sebelum kirim ke JSON
parseFloat(val.toString())
```

### Security
- SELALU filter by userId di setiap query
- JANGAN return data tanpa where: { userId }