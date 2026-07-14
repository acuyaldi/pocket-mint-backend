---
name: financial-logic
description: Use when working on wallets, transactions, transfers, installments, dashboard aggregates, reporting periods, or balance reconciliation.
---

# Financial Logic — Pocket Mint Backend

## Money

- All persisted and aggregate money is `Prisma.Decimal`, end to end.
- No floating-point arithmetic in business calculations: no `parseFloat`,
  `Number`, or `Math.round` inside services/domain code.
- Currency scale: 2 dp, `ROUND_HALF_UP` — use `toMoney` / `MONEY_SCALE` from
  `src/domain/installment.ts`.
- Decimal → JSON number conversion happens **only** in controller serializers
  at the response boundary (mechanism in `backend-api.skill.md`).

## Wallet Classification (`src/utils/financial.ts`)

- Assets: `CASH`, `BANK`, `E_WALLET`
- Debts: `CREDIT_CARD`, `LOAN_PAYLATER` (outstanding stored as **negative** balance)

Product semantics (do not silently redefine):

- `totalAset` = sum of asset balances
- `totalUtang` = sum of `abs(debt balance)`
- `netWorth` = **asset total only** — debt does NOT subtract from net worth;
  assets shrink when the repayment transaction happens. This is a deliberate
  July 2026 product decision implemented in `calculateNetWorth`. If asked to
  "fix" it to assets − debts, first state that this is intentional and get
  explicit confirmation the user means to reverse the product decision.

## Transaction Effects (`src/domain/transactionBalance.ts`)

Single source of truth: `computeBalanceEffect` / `reverseBalanceEffect` /
`applyBalanceDeltas`. Reuse them — never re-implement the switch.

- INCOME: `+amount` to source wallet
- EXPENSE: `−amount` from source wallet
- TRANSFER: `−amount` source, `+amount` destination (one row, `walletId` +
  `toWalletId`)
- INSTALLMENT expense: wallet is debited the **`grandTotal`** (principal +
  interest + fees) at create time, even though the row stores the monthly
  `amount`. Reversal follows the same persisted effect.

Reporting variants live in `src/domain/reportingEffect.ts`
(`getWalletReportingEffect`, `getAggregateCashFlowEffect`).

## Ledger Integrity

- Wallet balances change **only** through transaction/domain orchestration
  (`applyBalanceDeltas` inside a `$transaction`, atomic increments).
- Direct balance overwrite via wallet update is rejected with
  `BALANCE_UPDATE_NOT_ALLOWED` (an unchanged echo is tolerated).
- Update = reverse the **persisted** old effect, then apply the new effect —
  both derived from stored rows, never from request data alone.
- Delete = reverse the persisted effect.
- Transfers affect both wallets symmetrically; strict mode throws when
  `toWalletId` is missing. A missing legacy transfer destination is **never
  guessed** (reconciliation applies source side only, non-strict).
- `initialBalance` is the reconciliation anchor:
  expected = initialBalance + Σ(effects).

## Reporting

- `Transaction.date` is business time; `createdAt` is audit/tie-breaker only.
- Use `REPORTING_TIMEZONE` (default `Asia/Jakarta`) via `src/domain/reportingTime.ts`.
- Periods are half-open `[gte, lt)` — never `lte` on an end bound.
- Date-only inputs mean reporting-local midnight; full timestamps must carry an
  offset or `Z`.
- Sparkline = seven reporting-calendar days, oldest → newest; points before the
  wallet existed are `null`, never `0`.
- Transfers are excluded from aggregate income/expense
  (`getAggregateCashFlowEffect` returns 0 for TRANSFER).

## Reconciliation

- Default read-only: `reconcileWalletBalances` / `src/scripts/reconcile.ts --audit`.
- Never repair silently — any write/repair requires explicit user approval.

## Common Mistakes

- `Number(amount)` or float subtraction "just for a comparison" — comparisons
  are Decimal methods (`.equals`, `.lessThan`).
- Computing net worth as assets − debts — that changes product semantics.
- Reversing an installment by its monthly `amount` instead of the persisted
  `grandTotal` effect.
- Building a month range with local `new Date(y, m, 1)` instead of the
  reporting-timezone helpers.
