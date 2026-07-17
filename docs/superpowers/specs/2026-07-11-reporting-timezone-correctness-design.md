# Sprint 2C Reporting and Timezone Correctness Design

## Scope

Sprint 2C corrects reporting reads without changing mutation semantics, routes,
response envelopes, or database schema. `Transaction.date` remains the business
timestamp. `createdAt` remains audit chronology and a deterministic tie-breaker.

## Timezone Policy

`REPORTING_TIMEZONE` supplies one application-wide IANA timezone and defaults to
the documented product timezone, `Asia/Jakarta`. Startup validation rejects an
invalid zone in every environment. A focused native `Intl.DateTimeFormat`
utility converts reporting-local calendar boundaries to UTC instants without
depending on the server timezone or adding a date library.

All database periods are half-open `[startInclusive, endExclusive)` ranges using
`gte` and `lt`. The same utility generates local `YYYY-MM-DD` labels, day ranges,
month ranges, previous-month ranges, and rolling day buckets. Calendar arithmetic
operates on UTC-backed date parts used only as calendar values, then resolves each
local wall-clock boundary in the configured IANA zone. This supports DST gaps,
folds, leap years, and year rollover.

Date-only transaction input (`YYYY-MM-DD`) means local midnight in the reporting
timezone and is validated as a real calendar date. Full ISO timestamps must carry
an explicit `Z` or numeric offset and retain their represented instant. Invalid or
ambiguous inputs are rejected. Omitted dates use the current instant.

## Reporting Effects

Aggregate income and expense include only their matching transaction type;
transfers have zero aggregate cash-flow effect. Per-wallet effects are income
`+amount`, expense `-amount`, transfer source `-amount`, and transfer destination
`+amount`. A legacy transfer with no destination applies only to its known source.
Installment wallet history uses `installment.grandTotal`, matching the persisted
wallet debit, while monthly expense reporting continues to use the persisted
transaction amount because that field is the existing monthly P&L line.

All calculations use `Prisma.Decimal` until response serialization.

## Sparkline

`GET /api/v1/wallets/:id/sparkline` changes intentionally from up to seven recent
transaction events to exactly seven reporting-calendar-day end-of-day balances,
from today minus six days through today. It queries all transactions in one UTC
range from the first day boundary through the lesser of the next-day boundary and
the current instant, including rows where the wallet is source or destination.
Future transactions are not realized.

Reconstruction begins at the canonical current stored wallet balance and walks
relevant transactions backward in strict `date`, `createdAt`, `id` order. For each
day boundary it reverses transactions newer than that boundary. Empty days carry
the preceding closing balance. Transfers are reversed from the requested wallet's
perspective. Installments reverse `grandTotal`.

Each point retains `{ date, balance }`, oldest first. `balance` is nullable only
for dates before `Wallet.createdAt`, because the wallet did not exist and a value
would fabricate history. From the creation day onward balances remain numeric.
Legacy destination gaps are logged internally without guessing or breaking the
response.

## Dashboard and Net Worth

Wallet classification stays explicit: `CASH`, `BANK`, and `E_WALLET` are assets;
`CREDIT_CARD` and `LOAN_PAYLATER` are debts. The established product rule remains:
`netWorth` equals the asset-wallet balance sum, while `totalUtang` separately sums
absolute debt balances. Archived wallets remain included. Current values continue
to come directly from stored wallet balances and therefore remain unaffected by
internal asset-to-asset transfers.

## Monthly Reporting

Transaction listing and summary use the configured reporting month converted to
UTC with `gte`/`lt`. Defaults are derived from the current reporting-local date,
not OS-local time. Summary aggregation excludes transfers and computes net savings
with Decimal arithmetic. Existing month query formats and response fields remain.

## Error Handling and Compatibility

Invalid timezone configuration fails startup clearly. Invalid transaction dates
return the existing 400 error shape. Endpoint paths and successful envelopes stay
unchanged. Numeric serialization remains JavaScript numbers at the response
boundary, including exact two-decimal database values within the schema's safe
range. The sparkline's exactly-seven shape and pre-creation `null` values are the
documented frontend-visible corrections.

## Tests and Verification

Unit tests cover IANA validation, Jakarta and DST day/month boundaries, date-only
parsing, half-open ranges, reporting effects, Decimal cents, comparisons, and
wallet classification. Controller tests cover aggregate transfer exclusion and
the complete sparkline reconstruction matrix. The full suite, TypeScript build,
Prisma validation, focused tests under `TZ=UTC`, `Asia/Jakarta`, and
`America/New_York`, static risky-pattern scans, generated `dist`, diffs, and Git
status are verified before completion.

## Historical Limitations

Destination history for legacy transfers with `toWalletId = null` is unknowable;
only the source effect is reported. Manual historical balance overrides can make
backward reconstruction differ from the actual past. Current balance reporting
remains canonical. No data is repaired or mutated and no migration is required.
