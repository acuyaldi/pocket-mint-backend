# Pocket Mint — Release Runbook `dev` → `main` (rehearsal)

Tanggal rehearsal: 2026-10-19 · Disusun dari rehearsal read-only. Tidak ada koneksi ke DB production, tidak ada deploy, merge, atau tag.
Basis: backend `origin/dev` @ `8611235` (PR #116), frontend `origin/dev` @ `d7edc1b` (PR #93).

---

## 1. Executive summary

- **Jenis release: (a) increment**, bukan first-ever. Assistant + Telegram (Phase 21–35) sudah di `main` sejak PR #108/#90 (2026-10-15, rilis **0.6.0 "beta"**). Klaim audit "136 commit / 14 migration" sudah usang.
- Selisih sekarang: backend 45 commit (Phase 36B, 37, 37.1–37.4, 35.1, fix keamanan #113), frontend 4 commit (36B, 37). **3 migration pending**, semuanya additive, masing-masing 2–4 ms di dry-run (300k transaksi, 20k draft).
- Satu-satunya drift: default `assistant_idempotency_records.updated_at` (sudah ada sejak Phase 27) → **aman**, tidak perlu migration korektif.
- Verifikasi: backend tsc ✅ · 152 file / 1981 test (termasuk 24 file integration di DB hasil migrasi main→dev) ✅ · `prisma validate` ✅ · build + tree bersih ✅. Frontend tsc ✅ · 786 test ✅ · lint ✅ (1 warning lama) · build ✅.
- Rollback kode aman terhadap schema baru (diuji empiris dengan Prisma client versi `main`): baris TRANSFER draft terbaca, confirm oleh kode lama **gagal-tertutup** (FAILED, tanpa mutasi saldo).
- **1 BLOCKER**: tidak ada mekanisme "Assistant hanya untuk akun owner". Flag yang ada hanya global (env). Lihat §3.
- Rekomendasi versi: **0.7.0**.

### Yang TIDAK bisa diverifikasi dari repo (wajib dicek operator sebelum mulai)
1. Apakah migration 0.6.0 (26 migration) memang sudah diterapkan ke production → `prisma migrate status` (read-only, §5 langkah P2).
2. Nilai env production sekarang: `ASSISTANT_PROVIDER`, `TELEGRAM_ENABLED`, apakah webhook Telegram sudah terdaftar. Ini menentukan apakah Assistant sudah ON untuk semua user saat ini.
3. Ukuran riil tabel production (`wallets`, `users`, `assistant_financial_drafts`) dan ada/tidaknya transaksi panjang saat migrasi.
4. Konfigurasi Vercel (frontend) dan nama service Railway — tidak ada `railway.json`/`vercel.json` di repo; semuanya di dashboard.

---

## 2. R0 — Kondisi main vs dev

| | Backend | Frontend |
|---|---|---|
| Rilis terakhir ke `main` | PR #108, 2026-10-15 | PR #90, 2026-10-15 (changelog 0.6.0) |
| Commit `main..dev` | 45 | 4 |
| PR yang wajib merged | #112, #113, #114, #115 (37.4), #116 — **semua MERGED** ke `dev` | #92, #93 MERGED |
| Migration pending | 3 (§4) | — |
| Git tag | tidak ada di kedua repo | — |

Deploy: Railway Git integration (production = `main`), auto-deploy saat merge. `prisma migrate deploy` **tidak** jalan saat startup/build (dijaga CI) → migrasi production manual, harus **sebelum** merge.
Catatan: `prisma.config.ts` memakai `DATABASE_URL` untuk migrate (bukan `DIRECT_URL`). Bila `DATABASE_URL` production adalah pooler transaksi `:6543`, jalankan migrate dengan `DATABASE_URL=<direct/session :5432>` di-override.

---

## 3. BLOCKER / IMPROVEMENT / OPTIONAL

### BLOCKER

**B-1 — Tidak ada flag per-user untuk tahap "owner-only".**
Mekanisme yang ada:
| Kontrol | Efek | Granularitas | Waktu matikan |
|---|---|---|---|
| `ASSISTANT_PROVIDER=disabled` | `/assistant/messages` → 503 `ASSISTANT_PROVIDER_UNAVAILABLE`; FE menampilkan "coba lagi nanti". Riwayat, confirm/cancel draft yang ada tetap jalan. Inbound Telegram juga tidak bisa memanggil provider. | global | ubah env Railway + restart (~1–3 mnt) |
| `TELEGRAM_ENABLED=false` | webhook → 401, worker inbound/outbound tidak start, endpoint link inert | global | ubah env + restart |
| `scripts/telegram-set-webhook.mjs --delete` | Telegram berhenti mengirim update | global | detik, tanpa restart |
| Linking Telegram | hanya user yang `/link` yang bisa memakai Telegram | per-user (tapi siapa saja bisa link) | — |

Menu "Asisten" di frontend selalu tampil (`components/layout/navigation-items.ts:30`), tanpa flag.

Opsi minimal (pilih satu):
1. **Rekomendasi — allowlist env (ukuran S):** `ASSISTANT_ALLOWED_USER_IDS` (kosong = semua). Dicek di `assistantRouter` (403 bila tidak ada di list) dan di inbound worker setelah resolusi koneksi. ~20 baris + 2 test, PR terpisah ke `dev`. Tahap "semua user" = kosongkan env.
2. **Tanpa kode:** terima bahwa tahap owner-only tidak ada. Verifikasi owner dilakukan di staging (`dev`), lalu di production aktifkan global di jam sepi, owner langsung menjalankan smoke test (§6), siap mematikan dengan `ASSISTANT_PROVIDER=disabled`. Exposure ≈ 20 menit.
3. **Bila production saat ini sudah ON untuk semua user (0.6.0 beta):** tahap owner-only tidak bermakna; jalankan tahap 1 → smoke test → biarkan ON. B-1 turun ke IMPROVEMENT.

→ Keputusan pemilik produk. Opsi 3 kemungkinan besar berlaku, tapi bergantung pada butir "tidak bisa diverifikasi" #2.

### IMPROVEMENT
- **I-1** 8 env worker channel (`CHANNEL_*`) masih belum ada di `.env.example` (audit I7). Default aman.
- **I-2** Integration test berasumsi tabel kosong (`conversation-service.integration.test.ts:265` menghitung baris global). Di DB ber-seed / bekas run sebelumnya, 3–6 test gagal; di DB segar (bersih maupun ber-seed) semuanya lulus. Bukan bug produk, tapi menghalangi rehearsal terhadap salinan production.
- **I-3** Migration production tidak memasang `lock_timeout`. Bila ada transaksi panjang di `wallets`/`users`, `ADD FOREIGN KEY` di migration #2 menunggu dan **menahan antrian write** di dua tabel itu. Mitigasi: jalankan di jam sepi; opsional `SET lock_timeout='5s'` via `PGOPTIONS="-c lock_timeout=5s"` saat `migrate deploy`.
- **I-4** Tidak ada endpoint/dashboard metrik; monitoring hari-1 bergantung pada log Railway + CLI (§8).
- **I-5** Frontend dev belum memakai `error.detail` (37.3) — UI belum membedakan FAILED/EXPIRED secara spesifik. Fungsional, hanya pesan generik.

### OPTIONAL
- **O-1** Migration korektif drift `ALTER TABLE "assistant_idempotency_records" ALTER COLUMN "updated_at" DROP DEFAULT;` — metadata-only, tanpa risiko, hanya kosmetik agar `migrate diff` kosong. Bisa ikut release berikutnya.
- **O-2** `package.json` backend masih `0.1.0`; versi produk hanya hidup di `pocket-mint-frontend/src/lib/changelog.ts`.
- **O-3** Buat git tag `v0.7.0` di kedua repo setelah release (belum pernah ada tag).

---

## 4. Migration dry-run

Setup: embedded PostgreSQL 18 (disposable). Schema `main` (26 migration) dideploy, di-seed data sintetis — 2.000 user, 6.000 wallet, 20.000 kategori, 300.000 transaksi, 8.000 budget, 2.000 goal, 20.000 conversation/turn/tool execution/draft (25% PENDING_CONFIRMATION) — lalu `prisma migrate deploy` dari `dev`. Tidak ada dump production yang tersedia di repo/docs.

| # | Migration | DDL | Lock pada tabel existing | Durasi | Additive? | Backfill |
|---|---|---|---|---|---|---|
| 1 | `20261015160518_assistant_transfer_draft_fields` | `ADD COLUMN to_wallet_id TEXT` (nullable, tanpa default) + `ALTER COLUMN category_id DROP NOT NULL` | ACCESS EXCLUSIVE `assistant_financial_drafts`, metadata-only (tidak rewrite/scan) | 2 ms | Ya (melonggarkan constraint) | Tidak |
| 2 | `20261016042202_add_wallet_alias` | `CREATE TABLE wallet_aliases`, 2 index (tabel baru, non-concurrent tapi kosong), 2 FK → `wallets`, `users` | SHARE ROW EXCLUSIVE singkat di `wallets` & `users` (blok write, bukan read). Validasi FK instan (tabel kosong) | 4 ms | Ya | Tidak |
| 3 | `20261019090000_add_assistant_capture_events` | 3 `CREATE TYPE` enum baru, `CREATE TABLE`, 3 index, tanpa FK; memakai enum lama `AssistantChannel` (tidak diubah) | Tidak ada | 4 ms | Ya | Tidak |

Tidak ada `ALTER TYPE` pada enum existing, tidak ada rewrite tabel, tidak ada `CREATE INDEX` pada tabel besar. Risiko satu-satunya adalah antrian lock di #2 (I-3).

**Drift (`prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma`)** setelah migrasi:
```sql
ALTER TABLE "assistant_idempotency_records" ALTER COLUMN "updated_at" DROP DEFAULT;
```
Asal: `20260913000000_add_assistant_request_idempotency` menambah kolom `NOT NULL DEFAULT CURRENT_TIMESTAMP` untuk mengisi baris lama; schema memakai `@updatedAt` (diisi Prisma client). **Aman saat deploy** — default DB tidak pernah dipakai Prisma dan tidak mengubah perilaku. Tidak ada drift lain.

---

## 5. Konfigurasi

### Env backend (Railway) terkait Assistant/Telegram — semua dibaca di `src/config/*`

| Var | Wajib bila | Secret | Default | Nilai aman |
|---|---|---|---|---|
| `ASSISTANT_PROVIDER` | — | tidak | unset = disabled | `disabled` saat deploy, `gemini` saat enable |
| `ASSISTANT_MODEL` | provider=gemini (fatal di boot bila kosong) | tidak | — | model Gemini yang dipakai di staging |
| `GEMINI_API_KEY` | provider=gemini (fatal bila kosong) | **ya** | — | key production terpisah dari staging |
| `ASSISTANT_PROVIDER_TIMEOUT_MS` | — | tidak | 15000 (1–120000, nilai lain fatal) | 15000 |
| `TELEGRAM_ENABLED` | — | tidak | false | `false` saat deploy |
| `TELEGRAM_BOT_TOKEN` | enabled (fatal bila kosong) | **ya** | — | bot production terpisah dari staging |
| `TELEGRAM_WEBHOOK_SECRET` | enabled (fatal bila kosong) | **ya** | — | random ≥32 char |
| `TELEGRAM_BOT_USERNAME` | — | tidak | — | hanya untuk teks instruksi link |
| `CHANNEL_WORKERS_ENABLED` | — | tidak | true (dipaksa false di `NODE_ENV=test`) | true |
| `CHANNEL_INBOUND_POLL_MS` / `CHANNEL_OUTBOUND_POLL_MS` | — | tidak | 2000 | default |
| `CHANNEL_BATCH_SIZE` / `CHANNEL_LEASE_MS` | — | tidak | 10 / 30000 | default |
| `CHANNEL_MAX_ATTEMPTS_INBOUND` / `_OUTBOUND` | — | tidak | 5 / 5 | default |
| `CHANNEL_RETENTION_DAYS` | — | tidak | 7 | default |

**Tidak ada env baru di release ini** dibanding 0.6.0 (Phase 36B/37/37.x/35.1 tidak menambah var). Retensi capture event 180 hari adalah konstanta kode, bukan env.
Frontend (Vercel): hanya `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` — tidak ada flag Assistant.

Perbandingan dengan konfigurasi di repo:
- `.env.example` backend: Assistant & Telegram terdokumentasi; `CHANNEL_*` tidak (I-1).
- CI (`.github/workflows/ci.yml`): tidak menyetel var Assistant/Telegram (benar — default disabled).
- Railway/Vercel/Supabase: tidak ada file konfigurasi di repo → **tidak bisa diverifikasi**; cek di dashboard.

### Pre-flight (operator, read-only)
- **P1** Railway production: catat nilai saat ini `ASSISTANT_PROVIDER`, `TELEGRAM_ENABLED`, keberadaan `GEMINI_API_KEY`/`TELEGRAM_*` (tanpa menampilkan nilainya). Catat ID deployment aktif (target rollback).
- **P2** `DATABASE_URL=<prod direct> npx prisma migrate status` → harus menyebut tepat 3 migration pending di §4. Bila lebih → **STOP**, 0.6.0 tidak pernah dimigrasi; release menjadi tipe (b).
- **P3** `getWebhookInfo` bot production (`curl https://api.telegram.org/bot<token>/getWebhookInfo`) → catat URL & `pending_update_count`.
- **P4** Backup: `npm run db:backup` dengan URL production (read-only `pg_dump`) atau pastikan PITR Supabase aktif. Lihat `pocket-mint-backend/docs/backup-restore-runbook.md`.
- **P5** **Region Railway = region Supabase.** Railway: service backend → Settings → Region. Supabase: Project Settings → General (region), dan host pooler di `DATABASE_URL` (`aws-0-<region>.pooler.supabase.com`, cek host saja, jangan tampilkan URL lengkap). Keduanya harus satu region (mis. sama-sama `ap-southeast-*` yang sama). **Bila beda → STOP.** `confirm()` draft menjalankan ±16 round-trip dalam satu transaksi interaktif (budget 15 dtk, lock draft + baris conversation ditahan selama itu). Lintas region (≈250–350 ms/RTT, seperti dev lokal Jakarta → Sydney) membuat confirm 4–6 dtk dan clarification select (budget default Prisma 5 dtk) mendekati timeout.

---

## 6. Rencana enablement bertahap

Urutan deploy: **migrasi DB → backend → frontend** (backend menambah API secara additive; FE dev butuh endpoint alias & field transfer).

| Tahap | Aksi | Mekanisme | Lanjut bila | Matikan cepat |
|---|---|---|---|---|
| 0. Freeze | Set `ASSISTANT_PROVIDER=disabled`, `TELEGRAM_ENABLED=false` di production (bila belum). Restart. | env | `/health` 200 | — |
| 1. Migrasi | Jam sepi: `DATABASE_URL=<prod direct> PGOPTIONS="-c lock_timeout=5s" npx prisma migrate deploy` dari checkout `dev` yang akan dirilis. Lalu `migrate status` + `migrate diff` (harus hanya drift §4). | manual | 3 migration applied | §7 tahap 1 |
| 2. Deploy, Assistant OFF | Merge release PR backend `dev→main` (Railway auto-deploy), lalu frontend. | merge | §6.1 smoke "aplikasi lama" lulus | Railway/Vercel rollback ke deployment P1 |
| 3. Web owner-only | **Butuh B-1 opsi 1.** Set `ASSISTANT_ALLOWED_USER_IDS=<owner id>`, `ASSISTANT_PROVIDER=gemini`. Tanpa B-1: lompat ke tahap 5 dengan opsi 2. | env | smoke Web §7.2 lulus, **termasuk 6a (latensi confirm)** | `ASSISTANT_PROVIDER=disabled` |
| 4. Telegram | `TELEGRAM_ENABLED=true` + restart, lalu registrasi webhook: `TELEGRAM_BOT_TOKEN=… TELEGRAM_WEBHOOK_SECRET=… node scripts/telegram-set-webhook.mjs https://<prod-domain>/api/v1/telegram/webhook`. Owner `/link`. | env + script | smoke Telegram §6.3 lulus | `telegram-set-webhook.mjs --delete` (detik), lalu `TELEGRAM_ENABLED=false` |
| 5. Semua user | Kosongkan allowlist (atau, tanpa B-1: inilah tahap pertama provider ON). | env | monitoring §8 normal 24 jam | `ASSISTANT_PROVIDER=disabled` dan/atau `--delete` webhook |

Catatan kill switch Telegram: dengan `TELEGRAM_ENABLED=false` saja, Telegram terus me-retry update ke webhook yang membalas 401 (sampai ~24 jam). `--delete` menghentikannya; job inbound/outbound yang masih PENDING tetap di DB dan diproses lagi saat diaktifkan kembali.

---

## 7. Smoke test manual (~20 menit)

Pakai akun owner. Query SQL di bawah **read-only**; jalankan dengan role read-only bila ada. Script dari build backend: `node dist/scripts/<nama>.js` dengan env production (mis. via `railway run`, nama service tidak ada di repo).

### 7.1 Aplikasi lama (tahap 2, Assistant OFF) — 3 mnt
1. `GET /health` → 200 `{status:'ok'}`.
2. Login web, buka Dashboard, Dompet, Transaksi, Anggaran, Target Tabungan → data tampil, tanpa error console.
3. Tambah transaksi pengeluaran manual Rp1.000 lalu hapus → saldo dompet kembali.
4. Buka `/assistant`, kirim "beli kopi 20rb" → pesan "coba lagi nanti" (503 `ASSISTANT_PROVIDER_UNAVAILABLE`), tanpa draft.

### 7.2 Web (tahap 3) — 10 mnt
5. **Capture langsung:** "beli kopi 25k pakai <dompet unik>" → kartu draft: EXPENSE, Rp25.000, dompet & kategori benar, tanggal hari ini (WIB).
6. **Edit draft:** ubah nominal ke 26.000 dan kategori → preview berubah; **Confirm** → toast sukses, transaksi muncul di daftar, saldo turun 26.000. Klik confirm cepat dua kali → tetap satu transaksi.
6a. **Latensi confirm di production (gate sebelum enablement semua user):** di log Railway, ambil event `assistant.draft.confirmed` dari langkah 6 → `durationMs` harus **< 2000** (satu region: ±16 round-trip × beberapa ms). Ulangi confirm 3× (draft baru tiap kali). Bila ada yang ≥ 5000 atau muncul 503 `ASSISTANT_TRANSACTION_TIMEOUT` → **STOP**, cek P5 (region) dan beban pooler; jangan lanjut ke tahap 4/5. Tanpa B-1 (provider langsung ON untuk semua): lakukan langkah ini segera setelah tahap 5 dan matikan provider bila gagal.
7. **Cancel:** capture lagi → **Cancel** → draft hilang, tidak ada transaksi.
8. **Clarification:** buat 2 dompet dengan nama mirip, mis. "BCA Utama"/"BCA Tabungan"; kirim "makan 30rb pakai bca" → kartu pilihan dompet.
9. **Refresh saat clarification:** reload halaman → kartu clarification yang sama dipulihkan; pilih dompet → draft muncul → Confirm.
10. **Transfer:** "transfer 50rb dari BCA Utama ke GoPay" → draft TRANSFER dengan dompet asal & tujuan; Confirm → saldo asal −50.000, tujuan +50.000, satu baris transaksi TRANSFER.
11. **Alias create:** halaman Dompet → tambah alias "dompet harian" ke Cash → tersimpan. Alias yang sama dengan nama dompet lain → ditolak (409).
12. Kirim "jajan 10rb pakai dompet harian" → draft memakai Cash tanpa clarification. Cancel.
13. **Alias delete:** hapus alias → hilang; ulangi pesan 12 → tidak lagi ter-resolve ke Cash (clarification/penolakan).
14. Riwayat percakapan: arsipkan → pulihkan → hapus satu percakapan → tidak ada error.

Verifikasi (setelah langkah 14):
```sql
select event_type, source, count(*) from assistant_capture_events
where occurred_at > now() - interval '30 minutes' group by 1,2 order by 1;
```
Harapan: semua `source = 'WEB'`; ada `DRAFT_CREATED`, `DRAFT_EDITED`, `DRAFT_CONFIRMED` (≥3), `DRAFT_CANCELLED` (≥2), `CLARIFICATION_REQUESTED` & `CLARIFICATION_RESOLVED` (≥1).
`node dist/scripts/captureReport.js --from=<hari ini>` → grup `WEB · <phase marker>` dengan angka yang cocok (rate kemungkinan `INSUFFICIENT DATA`, wajar).

### 7.3 Telegram (tahap 4) — 7 mnt
15. **Webhook:** `getWebhookInfo` → URL production, `last_error_message` kosong, `pending_update_count` 0.
16. **Link:** Profil → Hubungkan Telegram → kirim `/link <kode>` ke bot → bot konfirmasi; Profil menampilkan status terhubung.
17. **Pesan masuk:** "beli bensin 40rb pakai Cash" → bot membalas ringkasan draft dengan tombol Konfirmasi/Batal (dalam ~5 dtk).
18. **Confirm:** tekan Konfirmasi → bot membalas sukses, tombol hilang; transaksi muncul di web.
19. **Cancel:** pesan baru → tekan Batal → tidak ada transaksi.
20. **Tombol basi:** tekan lagi tombol dari langkah 18 → ditolak dengan aman, tidak ada transaksi kedua.
21. **Transfer via Telegram:** "transfer 20rb dari BCA Utama ke GoPay" → bot mengarahkan ke web app (handoff), tidak ada konfirmasi di Telegram.
22. **Delivery status:** di web, buka riwayat → percakapan Telegram berbadge Telegram, balasan berstatus terkirim (SENT).

Verifikasi:
```sql
select event_type, source, count(*) from assistant_capture_events
where occurred_at > now() - interval '15 minutes' and source = 'TELEGRAM' group by 1;
select status, count(*) from channel_inbound_jobs where created_at > now() - interval '15 minutes' group by 1;
select status, count(*) from channel_outbound_deliveries where created_at > now() - interval '15 minutes' group by 1;
```
Harapan: event `TELEGRAM` untuk `DRAFT_CREATED`, `DRAFT_CONFIRMED`, `DRAFT_CANCELLED`; inbound semua `SUCCEEDED`; outbound semua `SENT`.
`node dist/scripts/opsVisibility.js` → exit code **0** (tidak ada job ambigu/terminal, turn RUNNING basi, atau draft FAILED). Exit 2 = ada temuan, periksa sebelum lanjut.

---

## 8. Rollback plan

Prinsip: **rollback kode, biarkan migration additive, flag OFF.** Jangan pernah `prisma migrate reset`/drop di production.

| Gagal di | Tindakan |
|---|---|
| Tahap 1 (migrasi) | Migration Prisma di Postgres tidak dibungkus satu transaksi per file. Bila #2/#3 gagal di tengah: `prisma migrate status` → bersihkan objek parsial (`DROP TABLE IF EXISTS wallet_aliases;` atau `DROP TABLE IF EXISTS assistant_capture_events; DROP TYPE IF EXISTS "AssistantCaptureEventType","AssistantCaptureField","AssistantCaptureOrigin";`) → `prisma migrate resolve --rolled-back <nama>` → ulangi. Kode lama tetap jalan normal selama ini (tabel baru tidak dibaca kode lama). Bila timeout lock: ulangi di jam lebih sepi. |
| Tahap 2 (deploy) | Railway: redeploy deployment yang dicatat di P1. Vercel: instant rollback ke deployment sebelumnya. Lalu buka PR revert merge di `main` agar git sesuai. Schema tetap. |
| Tahap 3/5 (Web) | `ASSISTANT_PROVIDER=disabled` + restart. Bila bug ada di kode non-Assistant → rollback kode seperti tahap 2. |
| Tahap 4 (Telegram) | `telegram-set-webhook.mjs --delete`, lalu `TELEGRAM_ENABLED=false`. Job tertunda tetap di DB; remediasi per-baris dengan `opsRemediate.js` (dry-run dulu). |

### Migration yang TIDAK sepenuhnya aman dibiarkan bila kode lama jalan
- **#1 `assistant_transfer_draft_fields` — perhatian.** Kode `main` tidak tahu TRANSFER draft. Diuji empiris: Prisma client `main` membaca baris `category_id NULL` tanpa crash, dan `confirm()` lama memanggil `createTransaction({type:'TRANSFER'})` tanpa `toWalletId` → `TransactionError 400` → draft **FAILED**, tidak ada mutasi saldo. Dampak: TRANSFER draft yang masih PENDING saat rollback akan gagal bila dikonfirmasi, dan FE lama bisa menampilkannya sebagai draft tanpa kategori. Jendela maksimum 15 menit (TTL draft). Mitigasi: set `ASSISTANT_PROVIDER=disabled` sebelum rollback dan tunggu 15 menit, atau batalkan eksplisit (tulis ke production, keputusan operator):
  `update assistant_financial_drafts set status='CANCELLED', cancelled_at=now() where status='PENDING_CONFIRMATION' and transaction_type='TRANSFER';`
- **#2 `add_wallet_alias` — aman, satu efek samping.** Kode lama mengabaikan tabel; hapus wallet tetap cascade. Tapi rename wallet di kode lama tidak cek tabrakan dengan alias. Setelah roll-forward, tabrakan nama=alias membuat resolver mendapat dua kandidat exact → clarification (bukan salah pilih). Tidak berbahaya.
- **#3 `add_assistant_capture_events` — aman.** Tanpa FK, kode lama tidak menulis/membaca.

---

## 9. Known risks (masukkan ke release checklist)

1. **Account enumeration residual (PR #113).** Respons konflik `/users/sync` kini generik `409 SYNC_CONFLICT`, tapi *keberadaan* 409 vs 200 tetap membedakan "email sudah dipakai akun lain" untuk identitas Supabase tanpa klaim email (body `email` dikendalikan pemanggil). Butuh JWT valid dan rate-limited. Diterima untuk release ini.
2. **Site B1:** 0 tersisa — #112 meninggalkan 10 site dengan sengaja, #115 (37.4) menutup semuanya. `createTransaction` P2025 kini → 409 `WALLET_CONCURRENTLY_MODIFIED`, draft tetap PENDING (bukan FAILED).
3. **Bias event capture (Phase 35.1):**
   - Undercount: emit terjadi setelah aksi dan error persist hanya di-log (`assistant.capture.persist_failed`); crash di antara aksi dan emit menghilangkan event.
   - Hapus percakapan meng-cascade draft; `correlation_key` (sha256 id) tidak lagi bisa di-join, jadi draft yang ditinggalkan lalu percakapannya dihapus tidak pernah tercatat sebagai abandoned.
   - Clarification teks bebas dari LLM dan pertanyaan bulan analitik → `fields = UNSPECIFIED`; metrik per-field undercount untuk kasus itu.
4. **Retensi opportunistik tanpa cron:** capture event >180 hari dihapus maksimal sekali per interval, *hanya saat ada event baru*; job/delivery channel memakai pola sama (`CHANNEL_RETENTION_DAYS`). Bila trafik berhenti, data lama tidak terhapus. Expiry draft/clarification juga lazy (37.3 hanya menyaring di read-path).
5. Rate limiter in-memory per instance — aman selama 1 replica Railway.

---

## 10. Monitoring hari-1

| Apa | Sumber | Frekuensi | Ambang tindakan |
|---|---|---|---|
| Error rate endpoint Assistant | Log Railway: `assistant.message.failed` vs `assistant.message.received`; HTTP 5xx di `/api/v1/assistant/*` (morgan) | tiap jam selama 8 jam pertama, lalu 2× sehari | >5% failed atau 5xx berulang → `ASSISTANT_PROVIDER=disabled`, investigasi |
| Provider timeout/503 | Log `ASSISTANT_PROVIDER_UNAVAILABLE`, `safe_error_code` di `assistant_turns` | tiap jam | lonjakan → cek kuota/key Gemini |
| Job Telegram gagal | `node dist/scripts/opsVisibility.js` (exit 2 = ada temuan); log `channel.inbound.failed`, `channel.assistant.failed`, `channel.webhook.rejected` | tiap 2 jam | terminal job/delivery → `opsRemediate.js` (dry-run → `--apply`) |
| 503 `ASSISTANT_TRANSACTION_TIMEOUT` (transaksi DB Assistant kedaluwarsa, P2028) | **Confirm:** log Railway `assistant.draft.confirmed` dengan `outcome: failed` + `errorCategory: database`, dan HTTP 503 di `POST /api/v1/assistant/drafts/*/confirm` (morgan). Transaksinya di-rollback, jadi **tidak ada jejak di DB**; hanya log. **Clarification select/guided:** `select count(*) from assistant_turns where safe_error_code='ASSISTANT_TRANSACTION_TIMEOUT' and finished_at > now()-interval '1 day';` | tiap jam selama 8 jam pertama, lalu 2× sehari | Satu kejadian sesekali = aman (draft/clarification tetap PENDING, retry dengan Idempotency-Key sama commit sekali atau replay). **≥3 dalam 1 jam** atau `durationMs` confirm rutin > 5000 → cek P5 (region), koneksi pooler (`maxWait` 5 dtk), dan lock wait di Supabase; bila berlanjut → `ASSISTANT_PROVIDER=disabled`. |
| Draft FAILED | `opsVisibility.js` (sejak 37.3) atau `select count(*) from assistant_financial_drafts where status='FAILED' and failed_at > now()-interval '1 day';` | 2× sehari | lonjakan → cek alasan (saldo tidak cukup = normal) |
| Turn RUNNING basi | `opsVisibility.js` | 2× sehari | `opsRemediate.js reconcile-turn --turn <id>` |
| `persist_failed` capture event | Log Railway filter `assistant.capture.persist_failed` | 2× sehari | >0 berulang → cek DB/tabel; tidak memblok user |
| Kualitas capture | `captureReport.js --from=<tanggal rilis>` | akhir hari-1 | tidak ada ambang (baseline Phase 39) |
| Webhook Telegram | `getWebhookInfo` (`last_error_message`, `pending_update_count`) | 3× sehari | error / backlog naik → cek secret & domain |

---

## 11. Versi & changelog draft

**Rekomendasi: `0.7.0`.** Produk masih 0.x; release ini menambah fitur yang kompatibel ke belakang (transfer via Asisten, alias dompet) → naik minor sesuai aturan di `pocket-mint-frontend/docs/releases/README.md` §2. Tidak ada perubahan API yang memutus kompatibilitas (field baru additive, `error.detail` opsional). Status tetap **beta**.

Draft (teknis, per phase — versi user-facing untuk `changelog.ts` cukup ringkasan Added/Fixed/Security):

- **Phase 36B — Transfer via Asisten.** Catat transfer antar dompet dengan bahasa natural; preview dua dompet, konfirmasi eksplisit; Telegram mengarahkan transfer ke web app. Migration `assistant_transfer_draft_fields`.
- **Phase 37 — Alias dompet.** Tambah/hapus alias per dompet (tanpa edit), resolusi exact-match, proteksi tabrakan nama/alias dengan advisory lock. Migration `add_wallet_alias`.
- **Phase 37.1 — Fix race hapus alias** (P2025 → 404).
- **Phase 37.2 — Sweep konkurensi.** Helper bersama P2025/P2002; race di lifecycle percakapan, budget, goal, transaksi rutin, merchant mapping, cicilan, pengingat, user sync → 404/409 bersih, bukan 500.
- **Phase 37.3 — Semantik stuck-state.** FAILED terminal eksplisit; `error.detail` pada konflik draft; draft/clarification yang lewat TTL tidak lagi tampil sebagai aktif; FAILED & abandoned tampil di ops visibility.
- **Phase 37.4 — Sisa B1.** Race finalize turn/audit provider dengan hapus percakapan menjadi no-op + log; `createTransaction` P2025 → 409 `WALLET_CONCURRENTLY_MODIFIED`, draft tetap PENDING.
- **Phase 35.1 — Capture event persisten.** Tabel `assistant_capture_events` (tanpa isi pesan/nominal/nama), paritas Web/Telegram, retensi 180 hari, CLI `captureReport`.
- **Security (#113).** Respons konflik user sync tidak lagi membocorkan field yang bertabrakan.

Known issue (lanjutan dari 0.6.0): koreksi draf belum bertahan saat reload ketika draf sedang dikonfirmasi.

---

## Lampiran — bukti rehearsal

- DB disposable: embedded PostgreSQL, port lokal, dihapus setelah rehearsal. `.env` lokal (Supabase pooler) **tidak** dipakai; semua perintah Prisma dijalankan dengan `DATABASE_URL` disposable eksplisit.
- Run test: DB bersih main→dev: 152/152 file, 1981/1981 test. DB ber-seed segar: `telegram-callback` 11/11, `durableProcessing` 12/12, `capture-events` 8/8. DB ber-seed yang sudah dipakai run sebelumnya: 3–6 gagal karena asumsi tabel kosong (I-2).
- Uji rollback: Prisma client hasil generate dari schema `main` membaca draft `TRANSFER` dengan `category_id NULL` → OK (`categoryId: null`, `toWalletId` diabaikan).
