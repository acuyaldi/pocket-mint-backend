# Sprint 2C Reporting and Timezone Correctness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Pocket Mint reporting deterministic across server timezones and correct transfer-aware seven-day wallet balance history.

**Architecture:** Add small pure reporting date/effect helpers, then integrate them directly into the existing controllers. Keep Prisma access and HTTP behavior in controllers, use half-open UTC ranges everywhere, and preserve Decimal arithmetic until serialization.

**Tech Stack:** TypeScript, Express 5, Prisma 7 Decimal, PostgreSQL, native `Intl.DateTimeFormat`, Vitest, Supertest.

## Global Constraints

- Do not change financial mutation semantics or introduce service/repository layers.
- Keep all existing endpoint paths, envelopes, and field names.
- Use `Transaction.date` for business reporting and `createdAt` only for chronology tie-breaking.
- Use `REPORTING_TIMEZONE`, default `Asia/Jakarta`, validated as an IANA timezone.
- Use `[startInclusive, endExclusive)` database periods with `gte` and `lt`.
- Use `Prisma.Decimal` for financial calculations until response serialization.
- Do not add a database migration or a date library.
- Rebuild tracked `dist/`; do not push.

---

### Task 1: Reporting Time Domain

**Files:**
- Create: `src/domain/reportingTime.ts`
- Create: `test/reportingTime.test.ts`
- Modify: `src/config/index.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `assertValidTimeZone(zone: string): string`
- Produces: `parseBusinessDate(value: string | undefined, zone: string, now?: Date): Date`
- Produces: `getReportingDayRange(date: CalendarDate, zone: string): ReportingRange`
- Produces: `getReportingMonthRange(month: CalendarMonth, zone: string): ReportingRange`
- Produces: `getPreviousReportingMonthRange(month: CalendarMonth, zone: string): ReportingRange`
- Produces: `getRollingDayRanges(now: Date, days: number, zone: string): ReportingDayRange[]`
- Produces: `formatReportingDate(instant: Date, zone: string): string`
- Produces: `reportingConfig.timezone`

- [ ] **Step 1: Write failing timezone and calendar tests**

Cover Jakarta UTC boundaries, December rollover, leap February, New York spring-forward/fall-back day lengths, invalid zones, and seven oldest-first ranges. Assert exact UTC instants and half-open adjacency.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `rtk npx vitest run test/reportingTime.test.ts`

Expected: FAIL because `src/domain/reportingTime.ts` does not exist.

- [ ] **Step 3: Implement native IANA conversion and range helpers**

Use cached `Intl.DateTimeFormat` instances with `formatToParts`. Resolve a local midnight by iteratively comparing the requested calendar parts to parts formatted in the target zone; reject a zone if constructing its formatter throws. Calendar addition must use `Date.UTC` parts and never OS-local getters/setters.

```ts
export interface CalendarDate { year: number; month: number; day: number }
export interface CalendarMonth { year: number; month: number }
export interface ReportingRange { startInclusive: Date; endExclusive: Date }
export interface ReportingDayRange extends ReportingRange { label: string }
```

- [ ] **Step 4: Verify range tests GREEN**

Run: `rtk npx vitest run test/reportingTime.test.ts`

Expected: PASS.

- [ ] **Step 5: Write failing date-input tests**

Assert `2026-07-11` maps to `2026-07-10T17:00:00.000Z` in Jakarta; offset timestamps preserve their instant; invalid dates such as `2026-02-30`, timestamp strings without offsets, and malformed input throw.

- [ ] **Step 6: Implement strict date-only and offset timestamp parsing**

Date-only input uses the local-midnight resolver. Full timestamps must match an ISO timestamp carrying `Z` or `±HH:mm`, parse to a finite instant, and round-trip as an instant. Omitted input returns a clone of `now`.

- [ ] **Step 7: Add reporting configuration and environment documentation**

```ts
const reportingTimezone = str(process.env.REPORTING_TIMEZONE) ?? 'Asia/Jakarta';
export const reportingConfig = { timezone: assertValidTimeZone(reportingTimezone) } as const;
```

Add `REPORTING_TIMEZONE=Asia/Jakarta` and a concise application-wide limitation comment to `.env.example`.

- [ ] **Step 8: Verify and commit Task 1**

Run: `rtk npx vitest run test/reportingTime.test.ts`

Commit: `fix: add timezone-aware reporting ranges`

### Task 2: Reporting Financial Effects

**Files:**
- Create: `src/domain/reportingEffect.ts`
- Create: `test/reportingEffect.test.ts`
- Modify: `src/utils/financial.ts`
- Modify: `test/transactionBalance.test.ts`

**Interfaces:**
- Consumes: `Prisma.Decimal`
- Produces: `getWalletReportingEffect(transaction, walletId): Prisma.Decimal`
- Produces: `getAggregateCashFlowEffect(transaction): Prisma.Decimal`
- Produces: `classifyWalletForNetWorth(type): 'ASSET' | 'DEBT'`

- [ ] **Step 1: Write failing reporting-effect tests**

Test income `+`, expense `-`, transfer source `-`, destination `+`, aggregate transfer zero, legacy transfer known-source only, installment expense using `grandTotal`, and `0.10 + 0.20` cents without floating-point drift.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `rtk npx vitest run test/reportingEffect.test.ts`

Expected: FAIL because the reporting helper is absent.

- [ ] **Step 3: Implement exhaustive Decimal reporting effects**

```ts
export interface ReportingTransaction {
  type: FinancialTxType;
  amount: Prisma.Decimal;
  walletId: string;
  toWalletId?: string | null;
  isInstallment?: boolean;
  installment?: { grandTotal: Prisma.Decimal } | null;
}
```

For an installment expense, select `grandTotal`; otherwise select `amount`. Return zero when the requested wallet is unrelated. Never infer a missing destination.

- [ ] **Step 4: Verify effect tests GREEN**

Run: `rtk npx vitest run test/reportingEffect.test.ts`

Expected: PASS.

- [ ] **Step 5: Write failing explicit net-worth classification tests**

Assert the three asset types, two debt types, Decimal totals, debt absolute values, and unchanged existing `netWorth = totalAset` behavior.

- [ ] **Step 6: Export and reuse explicit wallet classification**

Replace duplicated inclusion arrays inside `calculateNetWorth` with exhaustive classification. Do not change archived-wallet inclusion or the product's debt treatment.

- [ ] **Step 7: Verify and commit Task 2**

Run: `rtk npx vitest run test/reportingEffect.test.ts test/transactionBalance.test.ts`

Commit: `fix: normalize transaction reporting effects`

### Task 3: Monthly Reporting and Date Input Integration

**Files:**
- Modify: `src/controllers/transaction.controller.ts`
- Create: `test/transactionReporting.test.ts`
- Modify: `test/transactionController.test.ts`
- Modify: `src/models/transaction.model.ts`

**Interfaces:**
- Consumes: `reportingConfig.timezone`, `getReportingMonthRange`, `parseBusinessDate`
- Preserves: transaction list and summary response fields

- [ ] **Step 1: Write failing controller range tests**

Mock Prisma and assert Jakarta month queries use `2026-06-30T17:00:00.000Z <= date < 2026-07-31T17:00:00.000Z`, use `lt` rather than `lte`, and aggregate only `INCOME`/`EXPENSE`.

- [ ] **Step 2: Verify controller tests RED**

Run: `rtk npx vitest run test/transactionReporting.test.ts`

Expected: FAIL because current filters use server-local `lte` ranges.

- [ ] **Step 3: Replace local month arithmetic**

Parse existing `month`/`year` and `YYYY-MM` query shapes strictly, derive the default from the current reporting-local calendar month, and pass `{ gte: startInclusive, lt: endExclusive }` to Prisma. Retain existing fallback compatibility only for an absent month; reject malformed explicit values with 400.

- [ ] **Step 4: Keep summary arithmetic Decimal-safe**

Convert group sums to Decimal, calculate `netSavings` with `.minus`, and serialize the three final values only when building the response.

- [ ] **Step 5: Write failing create/update date parsing tests**

Assert date-only Jakarta storage, offset timestamp preservation, and invalid calendar/timestamp rejection without entering the mutation transaction.

- [ ] **Step 6: Integrate strict business-date parsing**

Use the same parser for create and update. Keep omitted create dates as the current instant and omit update data when date was not supplied. Update model comments to document accepted forms.

- [ ] **Step 7: Verify and commit Task 3**

Run: `rtk npx vitest run test/transactionReporting.test.ts test/transactionController.test.ts`

Commit: `fix: apply reporting timezone to transaction reads`

### Task 4: Seven-Day End-of-Day Wallet Sparkline

**Files:**
- Modify: `src/controllers/account.controller.ts`
- Create: `test/walletSparkline.test.ts`
- Modify: `docs/api-reference.md`
- Modify: `docs/backend-flow.md`

**Interfaces:**
- Consumes: `getRollingDayRanges`, `reportingConfig.timezone`, `getWalletReportingEffect`
- Preserves: `{ success, data: [{ date, balance }], message }`
- Changes: `balance` is `number | null` before wallet creation

- [ ] **Step 1: Write failing seven-bucket controller tests**

Create a fixed-clock harness and assert exactly seven oldest-first labels, one database query using source-or-destination plus `gte`/`lt` and `lte: now`, empty-day carry-forward, and `null` before `wallet.createdAt`.

- [ ] **Step 2: Verify sparkline tests RED**

Run: `rtk npx vitest run test/walletSparkline.test.ts`

Expected: FAIL because the endpoint returns recent transaction-event points.

- [ ] **Step 3: Implement complete transaction selection**

Select wallet `id`, `balance`, and `createdAt`. Query transactions with:

```ts
where: {
  userId,
  OR: [{ walletId: id }, { toWalletId: id }],
  date: { gte: first.startInclusive, lt: min(final.endExclusive, now) },
}
```

Include `installment.grandTotal` and order by `date desc`, `createdAt desc`, `id desc`.

- [ ] **Step 4: Implement backward Decimal reconstruction**

Start at stored current balance. Iterate bucket boundaries newest to oldest. Before recording a bucket, reverse every transaction with `date >= bucket.endExclusive`; for today's bucket, the current balance is already the closing balance at `now`, with future transactions excluded. Use `running = running.minus(effect)` and serialize after reversing/output ordering.

- [ ] **Step 5: Expand failing transfer/installment/boundary tests**

Cover income, expense, installment `grandTotal`, transfer source, transfer destination, legacy source-only behavior, multiple same-day rows, local midnight, just-before boundary, exact boundary, future row exclusion, and Decimal cents.

- [ ] **Step 6: Add Jakarta and DST label tests**

Run the same pure range fixtures for spring-forward and fall-back zones and assert labels/ranges are stable regardless of `process.env.TZ`.

- [ ] **Step 7: Document frontend-visible semantics and limitations**

Replace “up to seven transaction points” with “exactly seven reporting-calendar-day end-of-day balances,” document nullable pre-creation balances, future exclusion, transfer perspective, and legacy/manual-override limitations.

- [ ] **Step 8: Verify and commit Task 4**

Run: `rtk npx vitest run test/walletSparkline.test.ts test/reportingTime.test.ts test/reportingEffect.test.ts`

Commit: `fix: correct dashboard and sparkline calculations`

### Task 5: Regression, Multi-Timezone Verification, and Build Artifacts

**Files:**
- Modify: `dist/**` through the production build
- Modify: reporting docs only if verification exposes a mismatch

**Interfaces:**
- Consumes all prior task outputs
- Produces verified tracked build artifacts and final audit evidence

- [ ] **Step 1: Run TypeScript and production build**

Run: `rtk npx tsc --noEmit`

Run: `rtk npm run build`

Expected: both exit 0; tracked `dist` contains the new reporting helpers/controllers.

- [ ] **Step 2: Run full Vitest suite**

Run: `rtk npm test`

Expected: all pre-existing and Sprint 2C tests pass.

- [ ] **Step 3: Run focused tests under three server timezones**

Use PowerShell-scoped `TZ` values `UTC`, `Asia/Jakarta`, and `America/New_York`; for each run `npx vitest run test/reportingTime.test.ts test/reportingEffect.test.ts test/transactionReporting.test.ts test/walletSparkline.test.ts`.

Expected: identical assertions and all passes under each value.

- [ ] **Step 4: Validate Prisma schema**

Run: `rtk npx prisma validate`

Expected: schema valid; no migration generated.

- [ ] **Step 5: Run static reporting-risk scans**

Run focused `rg` scans for `new Date(`, local getters/setters, `23:59`, `lte`, `Math.round`, `parseFloat`, `Number(`, `TRANSFER`, `toWalletId`, `gte`, and `lt` in reporting paths. Inspect every remaining match and confirm only parsing/serialization or non-reporting uses remain.

- [ ] **Step 6: Inspect generated output and diffs**

Run: `rtk git diff --check`

Run: `rtk git diff --stat`

Run: `rtk git status --short`

Run: `rtk git log --oneline -6`

Inspect each Sprint 2C commit diff and ensure unrelated user files remain untouched.

- [ ] **Step 7: Commit tests/docs/build artifacts if still uncommitted**

Commit: `test: cover reporting timezone and transfer correctness`

Do not push.
