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
import { Prisma } from '../generated/prisma/client';
import { WalletError } from './wallet.errors';
import type {
  CreateWalletInput,
  DecimalInput,
  DeleteWalletInput,
  DeleteWalletResult,
  UpdateWalletInput,
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

  /**
   * Update wallet metadata only. Loads the wallet scoped to the caller (404 on a
   * missing/unowned wallet, unchanged). Enforces the Sprint 2B ledger boundary:
   * `balance` is never written here — an unchanged echo is tolerated, any change
   * is refused with BALANCE_UPDATE_NOT_ALLOWED, and a malformed value with
   * INVALID_AMOUNT. Comparison is Decimal-exact (no float subtraction). Only
   * allowlisted fields reach Prisma; omitted fields (`undefined`) are left as-is
   * while explicit `null` is written where the column is nullable.
   */
  async function updateWallet(input: UpdateWalletInput): Promise<Wallet> {
    const { userId, walletId, name, type, balance, creditLimit, interestRate, adminFee, adminFeeType, icon, color, isArchived } = input;

    if (type && !VALID_WALLET_TYPES.includes(type)) {
      throw new WalletError(`type must be one of: ${VALID_WALLET_TYPES.join(', ')}`, 400, 'BAD_REQUEST');
    }

    // Ownership check: refuse to touch a wallet that isn't the caller's.
    const owned = await db.wallet.findFirst({ where: { id: walletId, userId }, select: { id: true, balance: true } });
    if (!owned) {
      throw new WalletError(`Wallet with id ${walletId} not found`, 404, 'NOT_FOUND');
    }

    // Ledger boundary (Sprint 2B): `balance` is ledger state, not editable
    // metadata. A harmless echo of the *current* balance is tolerated; any
    // attempt to change it is refused so the caller records an income/expense/
    // transfer instead. Compared with Decimal (no float subtraction) and checked
    // before any write so a rejection mutates nothing.
    if (balance !== undefined) {
      let requested: Prisma.Decimal;
      try {
        requested = new Prisma.Decimal(balance as Prisma.Decimal.Value);
      } catch {
        throw new WalletError('balance must be a valid number', 400, 'INVALID_AMOUNT');
      }
      if (!requested.equals(owned.balance)) {
        throw new WalletError(
          'Wallet balance cannot be changed here. Record an income, expense, or transfer to adjust it through the ledger.',
          400,
          'BALANCE_UPDATE_NOT_ALLOWED'
        );
      }
      // Equal to the stored balance → a no-op echo; fall through and never write it.
    }

    try {
      return await db.wallet.update({
        where: { id: walletId },
        data: {
          ...(name !== undefined && { name }),
          ...(type !== undefined && { type }),
          // `balance` intentionally omitted — see the ledger-boundary guard above.
          ...(creditLimit !== undefined && { creditLimit: Number(creditLimit) }),
          ...(interestRate !== undefined && { interestRate: Number(interestRate) }),
          ...(adminFee !== undefined && { adminFee: Number(adminFee) }),
          ...(adminFeeType !== undefined && { adminFeeType }),
          ...(icon !== undefined && { icon }),
          ...(color !== undefined && { color }),
          ...(isArchived !== undefined && { isArchived }),
        },
      });
    } catch (err) {
      if (err instanceof WalletError) throw err;
      if ((err as { code?: string }).code === 'P2025') {
        throw new WalletError(`Wallet with id ${walletId} not found`, 404, 'NOT_FOUND');
      }
      throw err;
    }
  }

  /**
   * Delete a wallet the caller owns. Two integrity gates precede the write:
   *   1. A wallet on EITHER side of a transfer (`walletId` or `toWalletId`) is
   *      refused even with `force` — cascading its transfer rows would leave the
   *      counterparty balance credited/debited with no other side (Sprint 2A).
   *   2. A wallet with plain income/expense history is refused unless `force`.
   * Only after both pass is the single `wallet.delete` issued (transactions
   * cascade via the schema). No unrelated wallet is ever mutated.
   */
  async function deleteWallet(input: DeleteWalletInput): Promise<DeleteWalletResult> {
    const { userId, walletId, force } = input;

    // Ownership check: refuse to delete a wallet that isn't the caller's.
    const owned = await db.wallet.findFirst({ where: { id: walletId, userId }, select: { id: true } });
    if (!owned) {
      throw new WalletError(`Wallet with id ${walletId} not found`, 404, 'NOT_FOUND');
    }

    // Gate 1: transfer references on either side block deletion, even with force.
    const transferCount = await db.transaction.count({
      where: { userId, type: 'TRANSFER', OR: [{ walletId }, { toWalletId: walletId }] },
    });
    if (transferCount > 0) {
      throw new WalletError(
        `Wallet is referenced by ${transferCount} transfer(s). Delete those transfers first to keep balances consistent.`,
        409,
        'CONFLICT'
      );
    }

    // Gate 2: plain transaction history blocks deletion unless force is set.
    const txCount = await db.transaction.count({ where: { walletId, userId } });
    if (txCount > 0 && !force) {
      throw new WalletError(`Wallet has ${txCount} transactions. Pass ?force=true to delete anyway.`, 409, 'CONFLICT');
    }

    try {
      await db.wallet.delete({ where: { id: walletId } });
      return { id: walletId };
    } catch (err) {
      if (err instanceof WalletError) throw err;
      if ((err as { code?: string }).code === 'P2025') {
        throw new WalletError(`Wallet with id ${walletId} not found`, 404, 'NOT_FOUND');
      }
      throw err;
    }
  }

  return { createWallet, updateWallet, deleteWallet };
}

/** Production instance bound to the shared Prisma singleton. */
export const walletService = createWalletService(prisma);
