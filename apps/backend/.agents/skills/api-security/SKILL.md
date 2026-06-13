---
name: api-security
description: Keamanan API untuk backend Pocket Mint. Gunakan
  skill ini saat membuat endpoint baru atau review keamanan
  endpoint yang sudah ada.
license: MIT
metadata:
  author: pocket-mint
  version: "1.0.0"
---

# API Security Rules

## When to Apply
- Membuat endpoint baru
- Review endpoint yang sudah ada
- Integrasi dengan n8n atau automation external

## Rules

### User Isolation
Setiap endpoint WAJIB validasi userId:
```typescript
// ✅ Benar
const wallets = await prisma.wallet.findMany({
  where: { userId: session.userId }
})

// ❌ Salah — data semua user bocor
const wallets = await prisma.wallet.findMany()
```

### Internal API Key
Endpoint untuk n8n/automation wajib validasi header:
```typescript
const apiKey = request.headers.get('x-api-key')
if (apiKey !== process.env.INTERNAL_API_KEY) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### Error Response
JANGAN expose stack trace di production:
```typescript
// ✅ Benar
return Response.json({ error: 'Internal server error' }, { status: 500 })

// ❌ Salah
return Response.json({ error: err.message, stack: err.stack }, { status: 500 })
```

### Input Validation
Validasi semua input sebelum query:
- walletId → cek exists + milik userId
- amount   → cek positif, bukan NaN
- interestRate → cek 0-100