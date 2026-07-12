// ============================================================
// Wallet command service
// ------------------------------------------------------------
// Owns wallet mutation business rules: input validation, wallet-type rules,
// ownership checks, the Sprint 2A initialBalance seeding, the Sprint 2B ledger
// boundary, and the pre-delete transfer/history integrity checks. It has no
// Express dependency and writes no HTTP responses: it returns typed domain
// records (raw Prisma wallet, Decimal fields intact) or throws typed
// WalletErrors. Response shaping and the net-worth snapshot (reporting) stay in
// the controller.
//
// Every mutation is a single write (create / update / delete; cascade is handled
// by the schema), so no `$transaction` boundary is opened here.
//
// Dependency injection mirrors the transaction services: a narrow
// WalletPrismaClient is passed to the factory so tests can inject a fake. The
// default `walletService` binds the shared singleton for production.
// ============================================================

import prisma from '../lib/prisma';
import { WalletError } from './wallet.errors';
import type {
  CreateWalletInput,
  DecimalInput,
  Wallet,
  WalletPrismaClient,
} from './wallet.types';

const VALID_WALLET_TYPES = ['CASH', 'BANK', 'E_WALLET', 'CREDIT_CARD', 'LOAN_PAYLATER'];
const DEBT_TYPES = ['CREDIT_CARD', 'LOAN_PAYLATER'];

/**
 * Coerce the opening balance exactly as the controller did (`Number(balance)`,
 * defaulting to 0), but reject a value that coerces to `NaN` *before* the write.
 * Previously a malformed balance reached Prisma and surfaced as an unexpected
 * 500; now it is a clean, typed 400 — the same INVALID_AMOUNT the update path
 * already returns. Valid inputs (including '' and numeric strings) are unchanged.
 */
function toOpeningBalance(value: DecimalInput | undefined): number {
  if (value === undefined) return 0;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new WalletError('balance must be a valid number', 400, 'INVALID_AMOUNT');
  }
  return n;
}

export function createWalletService(db: WalletPrismaClient) {
  /**
   * Create a wallet owned by the authenticated user. Preserves the original
   * order and rules: validate name → validate type → require creditLimit for
   * debt wallets → seed `balance` and `initialBalance` from the same opening
   * value (Sprint 2A) → write. A missing related user surfaces as the same 400.
   */
  async function createWallet(input: CreateWalletInput): Promise<Wallet> {
    const { userId, name, type, creditLimit, interestRate, adminFee, adminFeeType, icon, color } = input;

    if (!name || typeof name !== 'string') {
      throw new WalletError('name is required and must be a string', 400, 'BAD_REQUEST');
    }
    if (type && !VALID_WALLET_TYPES.includes(type)) {
      throw new WalletError(`type must be one of: ${VALID_WALLET_TYPES.join(', ')}`, 400, 'BAD_REQUEST');
    }
    if (type !== undefined && DEBT_TYPES.includes(type) && (creditLimit === undefined || Number(creditLimit) <= 0)) {
      throw new WalletError(
        'creditLimit is required for DEBT wallets (CREDIT_CARD, LOAN_PAYLATER)',
        400,
        'BAD_REQUEST'
      );
    }

    // Seed balance and initialBalance from the same opening value so the ledger
    // can be reconciled against it (expected = initialBalance + Σ effects).
    const openingBalance = toOpeningBalance(input.balance);

    try {
      return await db.wallet.create({
        data: {
          userId,
          name,
          type: type ?? 'CASH',
          balance: openingBalance,
          initialBalance: openingBalance,
          creditLimit: creditLimit !== undefined ? Number(creditLimit) : 0,
          interestRate: interestRate !== undefined ? Number(interestRate) : 0,
          adminFee: adminFee !== undefined ? Number(adminFee) : 0,
          ...(adminFeeType !== undefined && { adminFeeType }),
          icon: icon ?? null,
          color: color ?? null,
        },
      });
    } catch (err) {
      if (err instanceof WalletError) throw err;
      if ((err as { code?: string }).code === 'P2003') {
        throw new WalletError('Invalid userId (user not found)', 400, 'BAD_REQUEST');
      }
      throw err;
    }
  }

  return { createWallet };
}

/** Production instance bound to the shared Prisma singleton. */
export const walletService = createWalletService(prisma);
