# Continuing Pocket Mint

Notes for whoever picks this up next, including future me. Read this before touching `dev`.

## State at pause (2026-10-21)

| | |
|---|---|
| Backend `dev` | `649ebc35fe44762c75a2b4e9d11b6e00d797ad4f` (PR #124, docs only). Last code/test change: `ad7735ff7385b764fcbcda6b9d2cf76c4f5d4dd7` (PR #123) |
| Frontend `dev` | `9a6f2cb7e22c71cbfe3060ff37c39c46dc8662b7` (FE #97) |
| Dev gate | **Passed.** `npm run test:integration` 15/15 consecutive runs, 26 files / 314 tests each. Unit 1,705/1,705, frontend 834/834, both typecheck and build. Details: [release runbook §H](release/release-runbook.md#h-dev-gate-ditutup--2026-10-21-kriteria-dilonggarkan) |
| Capture marker | `CAPTURE_PHASE_MARKER = 'phase-38'` ([src/assistant/capture-events.ts](../src/assistant/capture-events.ts)). Events from 2026-10-21 onward are the dogfood sample. Older events are the `phase-35.1` baseline |
| Dogfood | Started 2026-10-21 (runbook §H.1) |

(Merging the README/CONTINUE docs PR will move `dev` forward. That is docs only and does not change the gate result.)

## Done

- Assistant (Web + Telegram) through Phase 38.2: natural-language capture, clarification, explicit confirm, edit-at-confirm, transfers, wallet aliases, recovery after refresh, archived-conversation guards.
- Concurrency hardening: Prisma error translation sweep (37.2–37.4), global conversation-first lock order with a stress test (38.2), bounded confirm transaction with retryable 503 (#119).
- Persisted, privacy-safe capture events and the read-only `captureReport` CLI (Phase 35.1 / 39.0).
- Release 0.7.0 rehearsal: migration dry-run, rollback test, smoke-test script ([release-runbook.md](release/release-runbook.md)).

## Not done

- **No production deployment.** The VPS target is undecided. Every `<TBD>` in [runbook §D](release/release-runbook.md#d-deployment-target-vps-tbd) is still open.
- **Telegram has not run live.** It is tested only by integration tests. No production bot or webhook is registered.
- **Release 0.7.0 is not cut.** No `dev → main` merge, no tag, and the changelog entry is only a draft (runbook §11).
- **Open release blocker B-1:** no per-user assistant allowlist (runbook §3). The options are listed there, and the product owner has to pick one.

## Known risks

See runbook §9 and §H.4. In short: 15 s confirm lock (painful if the app and the DB are in different regions), residual account enumeration from #113, open gaps from Phase 38.1, in-memory rate limiter (one instance only), retention only runs on new traffic, one unreproduced flaky test (`recovery-state-http` timeout).

## How to continue, in order

1. **Sync and migrate the dev database.**
   ```bash
   git pull                       # in both repos, branch dev
   npm ci
   npx prisma migrate status      # see what is pending
   npx prisma migrate deploy      # DATABASE_URL must be a direct/session connection, not the :6543 pooler
   ```
2. **Confirm the baseline.** Run `npx tsc --noEmit`, `npm test` and `npm run test:integration` at least once (the gate used 15). The frontend needs `npm test`, `npm run lint` and `npm run build`. Anything red that is not in the known flaky list (runbook §H.4) blocks the next steps.
3. **Deploy to a VPS (optional, when needed).** Fill runbook §D and decide:
   - Env file on the host (names below; never commit it). Use a separate Gemini key and Telegram bot from dev.
   - A process manager (e.g. systemd or Docker) running **exactly one instance**, plus a restart command (needed for the env kill switches).
   - A reverse proxy with TLS on a public domain (Telegram webhooks require HTTPS).
   - Run `prisma migrate deploy` manually **before** starting the new build, with `PGOPTIONS="-c lock_timeout=5s"`. Never run it on startup.
   - Register the Telegram webhook with `scripts/telegram-set-webhook.mjs` (`--delete` is the fast kill switch).
   - **Put the server in the same region as the database.** Measure RTT (target < 10 ms). Cross-region makes confirm take several seconds (runbook §D.3 P5, §D.6).
   - Then follow the staged enablement (§6) and the smoke test (§7).
4. **Dogfood for 2 weeks** (until about 2026-11-04), then run the capture report:
   ```bash
   npx ts-node src/scripts/captureReport.ts --from=2026-10-21
   # or after build: node dist/scripts/captureReport.js --from=2026-10-21
   ```
   Compare the `phase-38` group against the `phase-35.1` baseline. Rates below 30 samples print `INSUFFICIENT DATA`. Keep short dogfood notes on what was slow or annoying to capture.
5. **Phase 40A (batch capture), only if the dogfood notes justify it.** Do not start it because it seems like the next logical step. Start it only if the notes show real friction from entering several transactions one by one.

## Dev environment variables (template for the VPS)

Names only. Meanings and defaults are in [.env.example](../.env.example) and [src/config](../src/config).

**Backend**

```text
NODE_ENV
PORT
TRUST_PROXY
DATABASE_URL
DIRECT_URL
DB_POOL_MAX
DB_IDLE_TIMEOUT_MS
DB_CONNECTION_TIMEOUT_MS
SUPABASE_JWT_SECRET        # or SUPABASE_URL, exactly one
SUPABASE_URL
SUPABASE_JWT_AUD
SUPABASE_JWT_ISSUER
CORS_ALLOWED_ORIGINS
REPORTING_TIMEZONE
RATE_LIMIT_ENABLED
RATE_LIMIT_WINDOW_MS
RATE_LIMIT_MAX
RATE_LIMIT_MUTATION_MAX
ASSISTANT_PROVIDER
ASSISTANT_MODEL
GEMINI_API_KEY
ASSISTANT_PROVIDER_TIMEOUT_MS
TELEGRAM_ENABLED
TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET
TELEGRAM_BOT_USERNAME
CHANNEL_WORKERS_ENABLED
CHANNEL_INBOUND_POLL_MS
CHANNEL_OUTBOUND_POLL_MS
CHANNEL_BATCH_SIZE
CHANNEL_LEASE_MS
CHANNEL_MAX_ATTEMPTS_INBOUND
CHANNEL_MAX_ATTEMPTS_OUTBOUND
CHANNEL_RETENTION_DAYS
```

(`DIRECT_URL` is listed in `.env.example`, but [prisma.config.ts](../prisma.config.ts) only reads `DATABASE_URL`. `TEST_DATABASE_URL` is for tests only and does not belong on a server.)

**Frontend:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_HCAPTCHA_SITE_KEY`.
