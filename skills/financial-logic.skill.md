# Financial Logic — Pocket Mint
> Read this before touching any wallet, transaction, installment, or calculation logic.

## Wallet Types

### ASSET
- Positive contribution to net worth
- Examples: e-wallet (GoPay, OVO), bank account, cash, investment
- Balance displayed as positive, green

### DEBT
- Types: `CREDIT_CARD`, `LOAN_PAYLATER` (see `isDebtWallet` in `src/types/wallet.ts`)
- Examples: credit card, paylater (Kredivo, Akulaku), loan
- **Outstanding is stored as a NEGATIVE balance** — display `Math.abs(balance)` in red
- Shows: outstanding amount, credit limit, utilization %
- Spendable = `creditLimit - |balance|` (assets: spendable = balance)

## Net Worth Calculation
```
netWorth = Σ(ASSET balances)   // assets only
```
- Debt does NOT subtract from net worth directly — assets shrink when the repayment transaction happens (decided Jul 2026; implemented in backend `calculateNetWorth`, dashboard, and wallets page)
- Recalculate on every transaction, wallet update, or installment payment
- Display with +/- delta vs last month

## Debt Ratio
```
debtRatio = totalDebt / totalCreditLimit * 100
```
- Safe threshold: < 30% → status "Aman" (green)
- Warning: 30–60% → status "Hati-hati" (orange)
- Danger: > 60% → status "Bahaya" (red)

## Installment — Model A
- Only from a DEBT wallet, EXPENSE type; grand total (principal + flat interest) is locked at creation by the backend
- Valid tenors: 3 / 6 / 12 months (backend `VALID_TENORS` — keep frontend `TENORS` in sync)
- Interest: flat % per month; `totalInterest = round(principal * rate/100 * months)`
- Monthly tracking: paid months / total months; progress = (paidMonths / totalMonths) * 100
- Completion: when paidMonths === totalMonths

## Paylater Rates
- Wallet-stored rates win (`wallet.interestRate`, `wallet.adminFee` + `adminFeeType`)
- Fallback: provider presets from backend endpoint via `usePaylaterRates()` (`src/features/installments/hooks/useInstallments.ts`), name-matched to the wallet
- Do NOT hardcode preset constants in components

## Transaction Rules
- Backend types: INCOME / EXPENSE / TRANSFER only
- Transfer = ONE transaction record with `walletId` (source, decremented) + `toWalletId` (destination, incremented)
- Debt repayment = TRANSFER from asset wallet into debt wallet (negative balance increments toward 0). The UI "PAY DEBT" tab maps to this — it is not a separate backend type
- E-wallets cannot pay CC/paylater bills — PAY DEBT sources are BANK/CASH only
- Category is optional metadata, not used in core calculations

## Currency & Precision
- Primary: IDR (Indonesian Rupiah)
- Display format: `Rp 1.000.000` (dots as thousand separator, no decimal for IDR)
- Frontend: always `formatCurrency` from `@/lib/utils` — never write a new formatter
- Backend: all money is `Prisma.Decimal` end-to-end; never `number`/`float`/`parseInt`. Convert with `parseFloat(val.toString())` only at the response boundary

## Business Rule Constraints
- A DEBT wallet cannot owe more than its credit limit: `|balance| <= creditLimit`
- Deleting a wallet requires confirmation if it has transaction history
- Installment cannot be deleted mid-progress — must be marked complete or cancelled
- Net worth is always computed, never stored — derive from live wallet balances
