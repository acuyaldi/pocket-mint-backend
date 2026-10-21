# Pocket Mint — Release Runbook `dev` → `main` (rehearsal)

Tanggal rehearsal: 2026-10-19 · Disusun dari rehearsal read-only. Tidak ada koneksi ke DB production, tidak ada deploy, merge, atau tag.
Basis: backend `origin/dev` @ `8611235` (PR #116), frontend `origin/dev` @ `d7edc1b` (PR #93).
**Update 2026-10-20 (dev stability gate):** basis backend `origin/dev` @ `75b3cc6` (PR #119), frontend `origin/dev` @ `65af7c5` (PR #95). PR #117–#119 dan FE #94–#95 sudah merged ke `dev`. Target deploy production **bukan lagi Railway**: semua langkah yang bergantung pada platform dipindah ke §D "Deployment target: VPS (TBD)" dengan placeholder. Hasil gate: §G.
**Update 2026-10-21 (gate dev ditutup, kriteria dilonggarkan):** **LULUS** — backend `ad7735f` (PR #123), frontend `9a6f2cb` (FE #97). Dogfood dimulai: §H.

---

## 1. Executive summary

- **Jenis release: (a) increment**, bukan first-ever. Assistant + Telegram (Phase 21–35) sudah di `main` sejak PR #108/#90 (2026-10-15, rilis **0.6.0 "beta"**). Klaim audit "136 commit / 14 migration" sudah usang.
- Selisih sekarang (2026-10-20): backend 63 commit (Phase 36B, 37, 37.1–37.4, 35.1, 38, 38.1, fix keamanan #113, fix timeout confirm #119), frontend 7 commit (36B, 37, 38, 38.1). **3 migration pending** (tidak bertambah sejak 2026-10-19), semuanya additive, masing-masing 2–4 ms di dry-run (300k transaksi, 20k draft).
- Satu-satunya drift: default `assistant_idempotency_records.updated_at` (sudah ada sejak Phase 27) → **aman**, tidak perlu migration korektif.
- Verifikasi: backend tsc ✅ · 152 file / 1981 test (termasuk 24 file integration di DB hasil migrasi main→dev) ✅ · `prisma validate` ✅ · build + tree bersih ✅. Frontend tsc ✅ · 786 test ✅ · lint ✅ (1 warning lama) · build ✅.
- Rollback kode aman terhadap schema baru (diuji empiris dengan Prisma client versi `main`): baris TRANSFER draft terbaca, confirm oleh kode lama **gagal-tertutup** (FAILED, tanpa mutasi saldo).
- **1 BLOCKER**: tidak ada mekanisme "Assistant hanya untuk akun owner". Flag yang ada hanya global (env). Lihat §3.
- Rekomendasi versi: **0.7.0**.

### Yang TIDAK bisa diverifikasi dari repo (wajib dicek operator sebelum mulai)
1. Apakah migration 0.6.0 (26 migration) memang sudah diterapkan ke production → `prisma migrate status` (read-only, §D.3 langkah P2).
2. Nilai env production sekarang: `ASSISTANT_PROVIDER`, `TELEGRAM_ENABLED`, apakah webhook Telegram sudah terdaftar. Ini menentukan apakah Assistant sudah ON untuk semua user saat ini.
3. Ukuran riil tabel production (`wallets`, `users`, `assistant_financial_drafts`) dan ada/tidaknya transaksi panjang saat migrasi.
4. Konfigurasi Vercel (frontend) dan target deploy backend (VPS, belum ditentukan — §D) — tidak ada `vercel.json` atau konfigurasi VPS di repo.

---

## 2. R0 — Kondisi main vs dev

| | Backend | Frontend |
|---|---|---|
| Rilis terakhir ke `main` | PR #108, 2026-10-15 | PR #90, 2026-10-15 (changelog 0.6.0) |
| Commit `main..dev` | 45 | 4 |
| PR yang wajib merged | #112, #113, #114, #115 (37.4), #116 — **semua MERGED** ke `dev` | #92, #93 MERGED |
| Migration pending | 3 (§4) | — |
| Git tag | tidak ada di kedua repo | — |

Deploy: mekanisme deploy backend production **TBD (VPS, §D.1)**. `prisma migrate deploy` **tidak** jalan saat startup/build (dijaga CI) → migrasi production manual, harus **sebelum** backend baru jalan.
Catatan: `prisma.config.ts` memakai `DATABASE_URL` untuk migrate (bukan `DIRECT_URL`). Bila `DATABASE_URL` production adalah pooler transaksi `:6543`, jalankan migrate dengan `DATABASE_URL=<direct/session :5432>` di-override.

---

## 3. BLOCKER / IMPROVEMENT / OPTIONAL

### BLOCKER

**B-1 — Tidak ada flag per-user untuk tahap "owner-only".**
Mekanisme yang ada:
| Kontrol | Efek | Granularitas | Waktu matikan |
|---|---|---|---|
| `ASSISTANT_PROVIDER=disabled` | `/assistant/messages` → 503 `ASSISTANT_PROVIDER_UNAVAILABLE`; FE menampilkan "coba lagi nanti". Riwayat, confirm/cancel draft yang ada tetap jalan. Inbound Telegram juga tidak bisa memanggil provider. | global | ubah env + restart service backend (mekanisme §D.2) |
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
- **I-4** Tidak ada endpoint/dashboard metrik; monitoring hari-1 bergantung pada log backend (sumber log §D.5) + CLI (§10).
- **I-5** ~~Frontend dev belum memakai `error.detail` (37.3)~~ — **selesai** di FE #94/#95 (`readAssistantTerminalCondition` memetakan `detail` ke expired/failed/cancelled/notActionable).
- **I-6** FE belum punya copy untuk 503 `ASSISTANT_TRANSACTION_TIMEOUT`: `readAssistantErrorMessage` jatuh ke pesan backend (Inggris, menyebut "Idempotency-Key"). Key confirm sudah benar (per draft, dipakai ulang saat retry; dihapus hanya saat sukses). Patch kecil diusulkan di §G.4.
- **I-7** Urutan lock terbalik: clarification select (lock baris clarification → conversation) vs `deleteOwnedConversation` (conversation → cascade clarification/turn). Naik menjadi **BLOCKER G.2-B** (§G.2).

### OPTIONAL
- **O-1** Migration korektif drift `ALTER TABLE "assistant_idempotency_records" ALTER COLUMN "updated_at" DROP DEFAULT;` — metadata-only, tanpa risiko, hanya kosmetik agar `migrate diff` kosong. Bisa ikut release berikutnya.
- **O-2** `package.json` backend masih `0.1.0`; versi produk hanya hidup di `pocket-mint-frontend/src/lib/changelog.ts`.
- **O-3** Buat git tag `v0.7.0` di kedua repo setelah release (belum pernah ada tag).
- **O-4** `clarification.createGuidedFields` tidak punya pemanggil di `src/` maupun `test/` → **dead code**. Akibatnya jalur guided submit (`consumeGuidedFields`, body `fields` di endpoint select) hanya bisa dicapai oleh baris `transaction_fields` lama; tidak ada yang membuatnya sekarang. Hapus atau sambungkan di phase berikutnya.

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

### Env backend terkait Assistant/Telegram — semua dibaca di `src/config/*`

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

**Tidak ada env baru di release ini** dibanding 0.6.0 (Phase 36B/37/37.x/35.1 tidak menambah var). Dicek ulang 2026-10-20 terhadap runbook sebelumnya (`8611235..75b3cc6` backend, `d7edc1b..65af7c5` frontend): Phase 38/38.1/#119 juga tidak menambah env atau flag. Budget transaksi confirm (`{ maxWait: 5000, timeout: 15000 }`) adalah konstanta kode `CONFIRM_TRANSACTION_OPTIONS`, bukan env. Retensi capture event 180 hari adalah konstanta kode, bukan env.
Frontend (Vercel): hanya `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` — tidak ada flag Assistant.

Perbandingan dengan konfigurasi di repo:
- `.env.example` backend: Assistant & Telegram terdokumentasi; `CHANNEL_*` tidak (I-1).
- CI (`.github/workflows/ci.yml`): tidak menyetel var Assistant/Telegram (benar — default disabled).
- VPS/Vercel/Supabase: tidak ada file konfigurasi di repo → **tidak bisa diverifikasi**; cek di host/dashboard.

### Pre-flight (operator, read-only)
Langkah P1–P5 bergantung pada platform deploy → dipindah ke **§D.3**. Isinya (env saat ini, `migrate status`, webhook, backup, region host = region Supabase) tetap wajib.

---

## 6. Rencana enablement bertahap

Urutan deploy: **migrasi DB → backend → frontend** (backend menambah API secara additive; FE dev butuh endpoint alias & field transfer).

| Tahap | Aksi | Mekanisme | Lanjut bila | Matikan cepat |
|---|---|---|---|---|
| 0. Freeze | Set `ASSISTANT_PROVIDER=disabled`, `TELEGRAM_ENABLED=false` di production (bila belum). Restart. | env | `/health` 200 | — |
| 1. Migrasi | Jam sepi: `DATABASE_URL=<prod direct> PGOPTIONS="-c lock_timeout=5s" npx prisma migrate deploy` dari checkout `dev` yang akan dirilis. Lalu `migrate status` + `migrate diff` (harus hanya drift §4). | manual | 3 migration applied | §7 tahap 1 |
| 2. Deploy, Assistant OFF | Merge release PR backend `dev→main`, deploy backend sesuai §D.1, lalu frontend. | merge + deploy | §7.1 smoke "aplikasi lama" lulus | rollback backend §D.4 / Vercel ke deployment sebelumnya |
| 3. Web owner-only | **Butuh B-1 opsi 1.** Set `ASSISTANT_ALLOWED_USER_IDS=<owner id>`, `ASSISTANT_PROVIDER=gemini`. Tanpa B-1: lompat ke tahap 5 dengan opsi 2. | env | smoke Web §7.2 lulus, **termasuk §D.6 (latensi confirm)** | `ASSISTANT_PROVIDER=disabled` |
| 4. Telegram | `TELEGRAM_ENABLED=true` + restart, lalu registrasi webhook: `TELEGRAM_BOT_TOKEN=… TELEGRAM_WEBHOOK_SECRET=… node scripts/telegram-set-webhook.mjs https://<prod-domain>/api/v1/telegram/webhook`. Owner `/link`. | env + script | smoke Telegram §6.3 lulus | `telegram-set-webhook.mjs --delete` (detik), lalu `TELEGRAM_ENABLED=false` |
| 5. Semua user | Kosongkan allowlist (atau, tanpa B-1: inilah tahap pertama provider ON). | env | monitoring §8 normal 24 jam | `ASSISTANT_PROVIDER=disabled` dan/atau `--delete` webhook |

Catatan kill switch Telegram: dengan `TELEGRAM_ENABLED=false` saja, Telegram terus me-retry update ke webhook yang membalas 401 (sampai ~24 jam). `--delete` menghentikannya; job inbound/outbound yang masih PENDING tetap di DB dan diproses lagi saat diaktifkan kembali.

---

## 7. Smoke test manual (~20 menit)

Pakai akun owner. Query SQL di bawah **read-only**; jalankan dengan role read-only bila ada. Script dari build backend: `node dist/scripts/<nama>.js` dengan env production, dijalankan di host backend (cara akses §D.2).

### 7.1 Aplikasi lama (tahap 2, Assistant OFF) — 3 mnt
1. `GET /health` → 200 `{status:'ok'}`.
2. Login web, buka Dashboard, Dompet, Transaksi, Anggaran, Target Tabungan → data tampil, tanpa error console.
3. Tambah transaksi pengeluaran manual Rp1.000 lalu hapus → saldo dompet kembali.
4. Buka `/assistant`, kirim "beli kopi 20rb" → pesan "coba lagi nanti" (503 `ASSISTANT_PROVIDER_UNAVAILABLE`), tanpa draft.

### 7.2 Web (tahap 3) — 10 mnt
5. **Capture langsung:** "beli kopi 25k pakai <dompet unik>" → kartu draft: EXPENSE, Rp25.000, dompet & kategori benar, tanggal hari ini (WIB).
6. **Edit draft:** ubah nominal ke 26.000 dan kategori → preview berubah; **Confirm** → toast sukses, transaksi muncul di daftar, saldo turun 26.000. Klik confirm cepat dua kali → tetap satu transaksi.
6a. *(Dipindah ke §D.6 — gate latensi confirm bergantung pada sumber log dan region host.)*
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
`node dist/scripts/captureReport.js --from=<hari ini>` → grup `WEB · phase-38` (marker `CAPTURE_PHASE_MARKER` sejak #117; event lama tetap di `phase-35.1`) dengan angka yang cocok (rate kemungkinan `INSUFFICIENT DATA`, wajar).

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
| Tahap 2 (deploy) | Backend: rollback ke rilis yang dicatat di D.3-P1 (mekanisme §D.4). Vercel: instant rollback ke deployment sebelumnya. Lalu buka PR revert merge di `main` agar git sesuai. Schema tetap. |
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
5. Rate limiter in-memory per instance — aman selama backend jalan sebagai 1 instance (VPS: pastikan tidak ada 2 proses di belakang load balancer, §D.1).
6. **Gap 38.1 (dari #118, belum ditutup).** (a) Clarification **select** di conversation ARCHIVED tidak dijaga: tetap bisa menyiapkan draft, yang lalu ditolak confirm sampai di-restore. (b) Tidak ada capture event untuk clarification expired/stale (butuh migration); "abandoned past TTL" juga menyerap stale/invalid. (c) Telegram: callback token habis saat ditekan; setelah restore, confirm harus dari Web (tombol lama menjawab "already handled"). (d) FE: resend butuh pesan asli di halaman riwayat yang sedang dimuat.
7. **Lock confirm sampai 15 detik.** `confirm()` memegang advisory lock draft + `FOR NO KEY UPDATE` baris conversation selama seluruh transaksi (budget `timeout` 15 dtk, `maxWait` 5 dtk). Archive/restore/delete percakapan yang sama, dan confirm/cancel draft yang sama, menunggu selama itu. Satu region: ±16 round-trip × beberapa ms. Lintas region: detik. Timeout → 503 `ASSISTANT_TRANSACTION_TIMEOUT`, di-rollback, aman di-retry dengan Idempotency-Key sama.
8. **Residual #113** — lihat butir 1 (enumerasi via 409 vs 200 di `/users/sync`), tetap diterima.
9. **Urutan lock terbalik select-clarification vs delete percakapan** (I-7): deadlock + 500 di stress test; BLOCKER G.2-B.

---

## 10. Monitoring hari-1

| Apa | Sumber | Frekuensi | Ambang tindakan |
|---|---|---|---|
| Error rate endpoint Assistant | Log backend (§D.5): `assistant.message.failed` vs `assistant.message.received`; HTTP 5xx di `/api/v1/assistant/*` (morgan) | tiap jam selama 8 jam pertama, lalu 2× sehari | >5% failed atau 5xx berulang → `ASSISTANT_PROVIDER=disabled`, investigasi |
| Provider timeout/503 | Log `ASSISTANT_PROVIDER_UNAVAILABLE`, `safe_error_code` di `assistant_turns` | tiap jam | lonjakan → cek kuota/key Gemini |
| Job Telegram gagal | `node dist/scripts/opsVisibility.js` (exit 2 = ada temuan); log `channel.inbound.failed`, `channel.assistant.failed`, `channel.webhook.rejected` | tiap 2 jam | terminal job/delivery → `opsRemediate.js` (dry-run → `--apply`) |
| 503 `ASSISTANT_TRANSACTION_TIMEOUT` (transaksi DB Assistant kedaluwarsa, P2028) | **Confirm:** log backend `assistant.draft.confirmed` dengan `outcome: failed` + `errorCategory: database`, dan HTTP 503 di `POST /api/v1/assistant/drafts/*/confirm` (morgan). Transaksinya di-rollback, jadi **tidak ada jejak di DB**; hanya log. **Clarification select/guided:** `select count(*) from assistant_turns where safe_error_code='ASSISTANT_TRANSACTION_TIMEOUT' and finished_at > now()-interval '1 day';` | tiap jam selama 8 jam pertama, lalu 2× sehari | Satu kejadian sesekali = aman (draft/clarification tetap PENDING, retry dengan Idempotency-Key sama commit sekali atau replay). **≥3 dalam 1 jam** atau `durationMs` confirm rutin > 5000 → cek D.3-P5 (region), koneksi pooler (`maxWait` 5 dtk), dan lock wait di Supabase; bila berlanjut → `ASSISTANT_PROVIDER=disabled`. |
| Draft FAILED | `opsVisibility.js` (sejak 37.3) atau `select count(*) from assistant_financial_drafts where status='FAILED' and failed_at > now()-interval '1 day';` | 2× sehari | lonjakan → cek alasan (saldo tidak cukup = normal) |
| Turn RUNNING basi | `opsVisibility.js` | 2× sehari | `opsRemediate.js reconcile-turn --turn <id>` |
| `persist_failed` capture event | Log backend filter `assistant.capture.persist_failed` | 2× sehari | >0 berulang → cek DB/tabel; tidak memblok user |
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
- **Phase 38 — Klarifikasi sumber/tujuan transfer (#117, FE #94).** Pertanyaan klarifikasi dompet TRANSFER menyebut jelas "dari dompet mana" vs "ke dompet mana"; FE menampilkan state recovery terminal (expired/failed/cancelled/tidak bisa ditindaklanjuti) berbasis `code`/`detail`. Capture marker `phase-35.1` → `phase-38` (tanpa event baru). Tanpa migration.
- **Phase 38.1 — Recovery lengkap + guard arsip (#118, FE #95).** Recovery-state mengembalikan draft/clarification terminal terakhir sehingga refresh menampilkan expired/failed/cancelled; confirm/cancel draft di percakapan ARCHIVED ditolak (409 `ASSISTANT_CONVERSATION_NOT_CONTINUABLE`, draft tetap PENDING sampai restore). Tanpa migration. Sisa gap: known risk #6.
- **Fix — Timeout transaksi confirm (#119).** Confirm 22 → 16 round-trip, budget eksplisit 15 dtk, Prisma P2028 → 503 `ASSISTANT_TRANSACTION_TIMEOUT` yang bisa di-retry (confirm, pencatatan FAILED, clarification select/guided). Draft tidak pernah FAILED karena timeout. Tanpa migration, tanpa env baru.
- **Security (#113).** Respons konflik user sync tidak lagi membocorkan field yang bertabrakan.

Known issue (lanjutan dari 0.6.0): koreksi draf belum bertahan saat reload ketika draf sedang dikonfirmasi.

---

## D. Deployment target: VPS (TBD)

Target production backend dipindah dari Railway ke VPS; detailnya belum diputuskan. Semua yang bergantung pada platform dikumpulkan di sini. **Isi setiap `<TBD>` sebelum release.** Isi lama (Railway) disimpan sebagai referensi bila platform berubah lagi.

### D.1 Mekanisme deploy
- Cara backend `main` sampai ke VPS: `<TBD: mis. git pull + npm ci + npm run build + restart unit systemd / image Docker>`.
- Process manager / jumlah instance: `<TBD>` — harus **1 instance** selama rate limiter in-memory (known risk #5).
- Domain + TLS untuk webhook Telegram (`https://<prod-domain>/api/v1/telegram/webhook`): `<TBD>`.
- `prisma migrate deploy` tetap manual dan **sebelum** backend baru jalan; jangan dimasukkan ke startup.
- *Referensi lama:* Railway Git integration, production = `main`, auto-deploy saat merge.

### D.2 Env & restart
- Lokasi file env production di VPS dan cara mengubahnya: `<TBD>` (jangan commit, jangan tampilkan nilai).
- Cara restart service (dipakai kill switch `ASSISTANT_PROVIDER=disabled` / `TELEGRAM_ENABLED=false`): `<TBD>`; estimasi waktu: `<TBD>`.
- Cara menjalankan `node dist/scripts/<nama>.js` dengan env production: `<TBD>` (*lama:* `railway run`).

### D.3 Pre-flight (operator, read-only)
- **P1** Catat nilai saat ini `ASSISTANT_PROVIDER`, `TELEGRAM_ENABLED`, keberadaan `GEMINI_API_KEY`/`TELEGRAM_*` (tanpa nilai). Catat versi/commit yang sedang jalan di VPS sebagai target rollback: `<TBD: cara melihatnya>`.
- **P2** `DATABASE_URL=<prod direct> npx prisma migrate status` → tepat 3 migration pending (§4). Bila lebih → **STOP**, 0.6.0 tidak pernah dimigrasi; release menjadi tipe (b).
- **P3** `getWebhookInfo` bot production → catat URL & `pending_update_count`.
- **P4** Backup: `npm run db:backup` dengan URL production (read-only `pg_dump`) atau pastikan PITR Supabase aktif. Lihat `docs/backup-restore-runbook.md`.
- **P5** **Region VPS = region Supabase.** Region VPS: `<TBD>`. Supabase: Project Settings → General, dan host pooler di `DATABASE_URL` (`aws-0-<region>.pooler.supabase.com`, cek host saja). Ukur RTT dari VPS ke host pooler (`<TBD: mis. psql \timing dengan SELECT 1>`); target < 10 ms. **Bila lintas region → STOP.** `confirm()` menjalankan ±16 round-trip dalam satu transaksi (budget 15 dtk, lock draft + conversation ditahan selama itu); lintas region (≈250–350 ms/RTT) membuat confirm 4–6 dtk dan clarification select (budget default Prisma 5 dtk) mendekati timeout.

### D.4 Rollback kode backend
- `<TBD: mis. checkout commit P1 + build + restart, atau image tag sebelumnya>`. Lalu PR revert merge di `main` agar git sesuai. Schema tetap (§8).
- *Referensi lama:* Railway redeploy deployment yang dicatat di P1.

### D.5 Sumber log
- Log JSON aplikasi (`logEvent`) + morgan: `<TBD: mis. journalctl -u <unit> / docker logs / file>`. Semua referensi "log backend" di §7–§10 menunjuk ke sini.

### D.6 Smoke latensi confirm (dulu §7.2 langkah 6a) — gate sebelum enablement semua user
Setelah langkah 6 §7.2: di log backend (D.5) ambil event `assistant.draft.confirmed` → `durationMs` harus **< 2000**. Ulangi confirm 3× (draft baru tiap kali). Bila ada yang ≥ 5000 atau muncul 503 `ASSISTANT_TRANSACTION_TIMEOUT` → **STOP**, cek P5 (region) dan beban pooler; jangan lanjut ke tahap 4/5. Tanpa B-1 (provider langsung ON untuk semua): lakukan segera setelah tahap 5 dan matikan provider bila gagal.

---

## G. Dev stability gate — 2026-10-20

**Status: BELUM LULUS** — 1 BLOCKER baru (G.2-B) dan integration 14/15 (G.1). Jalur uang (confirm/edit vs delete/archive/restore) lulus di kedua kondisi latensi.
Basis: backend `75b3cc6`, frontend `65af7c5`. DB: embedded PostgreSQL 18 disposable, DB baru per run. Tidak ada koneksi ke DB lain.

### G.1 Integration 15× berturut-turut (`npm run test:integration`, 25 file / 307 test)

| Run | Hasil | Durasi | Gagal |
|---|---|---|---|
| 1 | ❌ 306/307 | 57 dtk | `clarification-http` "rejects an invalid token…": 404, diharapkan 400. Tidak ada log controller → request tidak sampai ke app (kelas flake supertest/socket yang sama dengan fix #118) |
| 2–15 | ✅ 307/307 | 45–47 dtk | — |

Total 1/15 gagal (target 0). Flake infrastruktur test, bukan produk; tapi fix keep-alive #118 belum menutup kelas ini (di stress test juga muncul 1× `socket hang up`).

### G.2 Audit urutan lock

Peta lock (urutan akuisisi):

| Jalur | Urutan |
|---|---|
| Draft confirm (Web + tombol Telegram; edit = confirm dengan override) | advisory(draftId) → `FOR NO KEY UPDATE` conversation → wallet (UPDATE saldo) → draft (UPDATE) → update conversation |
| Draft cancel (Web + Telegram) | advisory(draftId) → `FOR NO KEY UPDATE` conversation → draft → conversation |
| Lazy expiry (confirm/cancel) | di dalam jalur di atas, setelah lock conversation |
| Archive / restore | UPDATE conversation (row lock) saja |
| `deleteOwnedConversation` | conversation (DELETE) → cascade: turn, message, tool execution, draft, idempotency, clarification |
| Clarification select / guided | **clarification (UPDATE claim) → FK KEY SHARE conversation (insert draft/turn) → UPDATE conversation (finalize)** |
| Turn finalize (tanpa tx caller) | tool execution → turn → conversation |
| Worker Telegram | `FOR UPDATE SKIP LOCKED` di job/delivery; confirm/cancel lewat jalur draft di atas |

Pasangan berlawanan: **clarification select vs delete conversation** (clarification→conversation vs conversation→clarification) dan, secara teoretis, turn finalize vs delete. Semua jalur draft konsisten conversation → draft.

Stress test 100 iterasi per pasangan, 10 paralel, latensi `pg_sleep` sisi server per statement (pola #119). Deadlock dari `pg_stat_database.deadlocks`.

| Pasangan | Latensi | 500 | 503 | Deadlock | Transaksi ganda | Tx dari conversation archived | Saldo |
|---|---|---|---|---|---|---|---|
| confirm vs delete | 0 ms | 0 | 1 (retry key sama → commit 1×) | 0 | 0 | — | ok |
| confirm vs archive | 0 ms | 0 | 0 | 0 | 0 | 0 | ok |
| confirm vs restore | 0 ms | 0 | 0 | 0 | 0 | 0 | ok |
| edit vs confirm | 0 ms | 0 | 0 | 0 | 0 | — | ok |
| confirm vs delete | 200 ms | 0 | 0 | 0 | 0 | — | ok |
| confirm vs archive | 200 ms | 0 | 0 | 0 | 0 | 0 | ok |
| confirm vs restore | 200 ms | 0 | 0 | 0 | 0 | 0 | ok |
| edit vs confirm | 200 ms | 0 | 0 | 0 | 0 | — | ok |
| *select vs delete (tambahan)* | 0 ms | **28** | 0 | **6** | 0 | — | ok |
| *select vs delete (tambahan)* | 200 ms | **37** | 0 | 0 | 0 | — | ok |

"Tx dari conversation archived" diukur dari `xmin`: confirm menyentuh baris conversation di transaksi yang sama, jadi `conversation.xmin = transaction.xmin` + status ARCHIVED = confirm menang setelah archive.

**G.2-B (BLOCKER baru) — select clarification vs delete conversation → 500.** Tidak ada efek finansial, tapi melanggar kriteria gate (tanpa 500, tanpa deadlock). Penyebab:
1. Deadlock 40P01 dari urutan lock terbalik → select 500 `ASSISTANT_CLARIFICATION_FAILED` atau **delete** 500 `INTERNAL_ERROR`.
2. `beginTurn` (`conversation.service.ts:116`) dan `beginToolExecution` (`:155`): insert setelah conversation terhapus → FK P2003 tidak diterjemahkan → 500 `INTERNAL_ERROR`. Berlaku juga untuk `/messages` dan `/execute`.
3. `clarification.select`: claim `count 0` → `findUniqueOrThrow` P2025 → 500.
Usulan fix kecil (PR terpisah): lock `FOR NO KEY UPDATE` conversation di awal transaksi select/guided (sekaligus menutup gap 38.1(a) — tolak select di conversation ARCHIVED); terjemahkan P2003 di `beginTurn`/`beginToolExecution` dan P2025 di claim select ke 404 `ASSISTANT_CONVERSATION_NOT_FOUND`/`ASSISTANT_CLARIFICATION_NOT_FOUND`.

Catatan: 1 503 `ASSISTANT_TRANSACTION_TIMEOUT` di confirm vs delete @0 ms (kemungkinan `maxWait` pool dingin; tidak ada log penyebab). Retry dengan key sama commit satu kali — perilaku sesuai #119.

### G.3 Test race 37.2 yang dilonggarkan (#118)
`conversation-service.integration.test.ts` archive/restore vs delete: asersi "tidak pernah 500" masih ada (setiap rejection wajib 404 bertipe; error mentah membuat test gagal), dan efek akhir dicek (baris conversation hilang). Jalur ini tidak punya efek finansial, jadi "tidak ada efek ganda" = state akhir tunggal. Nama test ("one succeeds, the other 404s") sudah tidak akurat — kosmetik.

### G.4 Frontend Idempotency-Key & copy retry
- Key confirm dibuat per `draftId` (`useAssistantDraft.ts`), dipakai ulang di setiap retry, dihapus hanya saat sukses. 503 adalah error "definite" → key tetap, kartu draft tetap aktif, user bisa tekan Konfirmasi lagi. ✅
- Refresh halaman → key baru; aman karena draft tetap PENDING setelah rollback dan advisory lock + cek status mencegah commit ganda. ✅
- **Gap (I-6):** tidak ada copy untuk `ASSISTANT_TRANSACTION_TIMEOUT` → user melihat pesan backend berbahasa Inggris yang menyebut "Idempotency-Key". Patch usulan: tambah `ASSISTANT_TRANSACTION_TIMEOUT: "transactionTimeout"` di `ASSISTANT_ERROR_MESSAGE_KEYS` (`src/features/assistant/utils/errors.ts`) + `messages/id.json`: "Belum tersimpan karena koneksi lambat. Tidak ada yang berubah — silakan coba lagi." (`en.json` padanannya) + 1 unit test.

### G.5 `createGuidedFields`
Tidak dipanggil di `src/` maupun `test/` → dead code (O-4).

### G.6 Env/flag
Tidak ada env atau flag baru dibanding runbook sebelumnya (§5).

---

## H. Dev gate ditutup — 2026-10-21 (kriteria dilonggarkan)

**Status: LULUS.** Menggantikan status §G. Tanpa production, tanpa merge ke `main`, tanpa tag/deploy.

### H.1 Dogfood start

| | |
|---|---|
| Tanggal | 2026-10-21 |
| Backend `dev` | `ad7735ff7385b764fcbcda6b9d2cf76c4f5d4dd7` (merge PR #123) |
| Frontend `dev` | `9a6f2cb7e22c71cbfe3060ff37c39c46dc8662b7` (merge FE #97) |
| Marker event | `CAPTURE_PHASE_MARKER = 'phase-38'` (`src/assistant/capture-events.ts`) — capture event mulai tanggal ini dibandingkan terhadap baseline `phase-35.1` |

### H.2 Kriteria gate yang dipakai

Integration 15× berturut-turut (`npm run test:integration`, runner resmi, PostgreSQL embedded sekali pakai baru tiap run, tanpa instrumentasi, tanpa retry/timeout tambahan). Mesin di AC, seluruh loop di bawah `caffeinate -dimsu`; `pmset -g log` diperiksa — run yang terpotong sleep tidak dihitung. Lulus bila:
1. stress lock-order (a)–(d) (`conversation-lock-order.integration.test.ts`) hijau di semua run;
2. tidak ada kegagalan di test jalur uang (confirm, transfer, idempotency, alias, archive/delete);
3. setiap kegagalan lain termasuk flake terdokumentasi di §H.4 (socket hang up pada stress (a), timeout `recovery-state-http`).

Selain itu: belum lulus.

### H.3 Hasil

| Run | Hasil | Durasi |
|---|---|---|
| 1 | ✅ 314/314 | 114 dtk |
| 2 | ✅ 314/314 | 107 dtk |
| 3 | ✅ 314/314 | 107 dtk |
| 4 | ✅ 314/314 | 106 dtk |
| 5 | ✅ 314/314 | 108 dtk |
| 6 | ✅ 314/314 | 105 dtk |
| 7 | ✅ 314/314 | 106 dtk |
| 8 | ✅ 314/314 | 106 dtk |
| 9 | ✅ 314/314 | 108 dtk |
| 10 | ✅ 314/314 | 106 dtk |
| 11 | ✅ 314/314 | 105 dtk |
| 12 | ✅ 314/314 | 110 dtk |
| 13 | ✅ 314/314 | 106 dtk |
| 14 | ✅ 314/314 | 108 dtk |
| 15 | ✅ 314/314 | 108 dtk |

26 file / 314 test per run, 0 skipped, 0 gagal (15/15). Loop 11:37:41–12:04:31 WIB; tidak ada Sleep/Wake di `pmset -g log` pada jendela itu, assertion `PreventSystemSleep` caffeinate aktif sepanjang loop.

Pemeriksaan lain pada SHA yang sama: backend `tsc --noEmit` ✅, `prisma validate` ✅, unit 1705/1705 ✅; frontend `tsc` ✅, lint ✅ (0 error, 1 warning: `DraftActionBar` tidak dipakai di `AssistantConversation.tsx`), test 834/834 ✅, build ✅.

### H.4 Known flaky tests

| Flake | Frekuensi | Status |
|---|---|---|
| `socket hang up` di stress lock-order (a) | 2/31 run sebelum #123; **0/15** sesudah #123 | ditutup oleh #122 + #123 |
| Timeout `recovery-state-http` ("returns 200 with an empty projection…", `Test timed out in 5000ms`) | 1 kejadian; **0/15** di gate ini | belum direproduksi |

**Socket hang up — ciri-ciri:** muncul di fase seed stress (a) (100 `POST /execute` berurutan) atau sebagai 404/401 nyasar; request tidak pernah sampai ke controller (tidak ada log request/controller untuk request itu). Penyebab: `supertest(app)` memanggil `listen(0)` tanpa host → bind `::` (dual-stack), yang tidak bentrok dengan listener asing `127.0.0.1:<port>` di rentang ephemeral (`lsof` saat investigasi: helper editor di `127.0.0.1:49xxx`), sementara supertest men-dial `127.0.0.1:<port>` → listener asing yang menjawab. **Bukan bug produk:** request gagal sebelum masuk ke aplikasi; tidak ada 5xx dari app; setelah semua test integration dipindah ke `test/helpers/loopbackServer` (bind `127.0.0.1`, OS menolak port yang terpakai — #122, sisa stress (a)/(b) di #123), 0/15 kejadian.

**Timeout recovery-state-http — ciri-ciri:** satu test `GET /conversations/:id/recovery-state` melewati timeout default vitest 5 dtk; test lain di file yang sama dan run yang sama lulus. Endpoint read-only (proyeksi clarification/draft aktif), tidak menulis data dan tidak menyentuh saldo. **Tidak ada indikasi bug produk:** hanya 1 kejadian, test yang sama lulus di semua run lain termasuk 15/15 di gate ini, dan tidak ada jalur tulis yang bisa meninggalkan state salah. Akar masalah tidak dibuktikan (kandidat: stall I/O mesin/Postgres embedded). Bila muncul lagi saat dogfood: catat run, cek `pmset -g log` dan log Postgres di sekitar timestamp sebelum menaikkan timeout.

---

## Lampiran — bukti rehearsal

- DB disposable: embedded PostgreSQL, port lokal, dihapus setelah rehearsal. `.env` lokal (Supabase pooler) **tidak** dipakai; semua perintah Prisma dijalankan dengan `DATABASE_URL` disposable eksplisit.
- Run test: DB bersih main→dev: 152/152 file, 1981/1981 test. DB ber-seed segar: `telegram-callback` 11/11, `durableProcessing` 12/12, `capture-events` 8/8. DB ber-seed yang sudah dipakai run sebelumnya: 3–6 gagal karena asumsi tabel kosong (I-2).
- Uji rollback: Prisma client hasil generate dari schema `main` membaca draft `TRANSFER` dengan `category_id NULL` → OK (`categoryId: null`, `toWalletId` diabaikan).
