# API Design Rules — Pocket Mint

## Format Response Standar

### Success Response
```json
{
  "data": { ... },
  "message": "Berhasil"
}
```

### Error Response
```json
{
  "error": "Pesan error yang jelas",
  "code": "ERROR_CODE"
}
```

## HTTP Status Codes
- 200 → GET berhasil, PATCH berhasil
- 201 → POST berhasil (resource baru dibuat)
- 400 → Input tidak valid / validasi gagal
- 404 → Resource tidak ditemukan
- 500 → Server error / $transaction gagal

## Aturan Endpoint
- Semua endpoint diawali `/api/v1/`
- Gunakan noun bukan verb: `/wallets` bukan `/getWallets`
- Gunakan plural: `/wallets`, `/transactions`, `/installments`
- Filter via query params: `/transactions?month=2026-06&walletId=xxx`

## Validasi Input
- Validasi SELALU di backend, jangan andalkan frontend saja
- Cek keberadaan walletId dan categoryId sebelum insert
- Cek tipe wallet sebelum operasi cicilan
- Return 400 dengan pesan spesifik, bukan pesan generik

## Keamanan
- Semua endpoint WAJIB cek userId
- JANGAN return data user lain walau request valid
- Header API key untuk endpoint yang dipanggil n8n/automation:
  `x-api-key: process.env.INTERNAL_API_KEY`

## Decimal Serialization
- Semua field Decimal dari Prisma WAJIB dikonversi sebelum
  dikirim ke response:
  `parseFloat(val.toString())`
- Jangan kirim raw Prisma Decimal object ke JSON response

## Yang Tidak Boleh
- JANGAN return stack trace di production error response
- JANGAN gunakan HTTP 200 untuk error
- JANGAN buat endpoint tanpa error handling