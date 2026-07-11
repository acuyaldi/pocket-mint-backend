import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { getUserNetWorth } from '../utils/financial';
import { reportingConfig } from '../config';
import { getRollingDayRanges } from '../domain/reportingTime';
import { getWalletReportingEffect } from '../domain/reportingEffect';
import { logger } from '../utils/logger';

const VALID_WALLET_TYPES = ['CASH', 'BANK', 'E_WALLET', 'CREDIT_CARD', 'LOAN_PAYLATER'];
const DEBT_TYPES = ['CREDIT_CARD', 'LOAN_PAYLATER'];

/** Serialized net worth snapshot, recomputed after every wallet mutation. */
async function netWorthSnapshot(userId: string) {
  const { totalAset, totalUtang, netWorth } = await getUserNetWorth(userId);
  return {
    totalAset: parseFloat(totalAset.toString()),
    totalUtang: parseFloat(totalUtang.toString()),
    netWorth: parseFloat(netWorth.toString()),
  };
}

/**
 * GET /api/v1/wallets
 * Returns list of wallets for the authenticated user,
 * with computed fields: sisa_limit & outstanding_debt for DEBT wallets.
 */
export const getAllWallets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // userId disuntik oleh requireUser — jangan hardcode, create/list harus user yang sama
    const userId = (req as any).userId as string;
    if (!userId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const wallets = await prisma.wallet.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    const serialized = wallets.map((w) => {
      const balance = parseFloat(w.balance.toString());
      const creditLimit = parseFloat(w.creditLimit.toString());
      const isDebt = DEBT_TYPES.includes(w.type);

      return {
        ...w,
        balance,
        creditLimit,
        initialBalance: parseFloat(w.initialBalance.toString()),
        interestRate: parseFloat(w.interestRate.toString()),
        adminFee: parseFloat(w.adminFee.toString()),
        // Computed fields for DEBT wallets
        sisa_limit: isDebt ? creditLimit + balance : null,
        outstanding_debt: isDebt ? Math.abs(balance) : null,
      };
    });

    sendSuccess(res, serialized, 'Fetched wallets');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/wallets
 * Create a new wallet for the user.
 */
export const createWallet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId || req.body.userId || (req.query.userId as string | undefined);
    if (!userId) {
      return sendError(res, 'userId is required', 400);
    }

    const { name, type, balance, creditLimit, interestRate, adminFee, adminFeeType, icon, color } = req.body;

    if (!name || typeof name !== 'string') {
      return sendError(res, 'name is required and must be a string', 400);
    }
    if (type && !VALID_WALLET_TYPES.includes(type)) {
      return sendError(res, `type must be one of: ${VALID_WALLET_TYPES.join(', ')}`, 400);
    }
    if (DEBT_TYPES.includes(type) && (creditLimit === undefined || Number(creditLimit) <= 0)) {
      return sendError(res, 'creditLimit is required for DEBT wallets (CREDIT_CARD, LOAN_PAYLATER)', 400);
    }

    const openingBalance = balance !== undefined ? Number(balance) : 0;

    const wallet = await prisma.wallet.create({
      data: {
        userId,
        name,
        type: type ?? 'CASH',
        balance: openingBalance,
        // Capture the opening balance so the ledger can be reconciled against it
        // (expected = initialBalance + Σ transaction effects). Previously always 0.
        initialBalance: openingBalance,
        creditLimit: creditLimit !== undefined ? Number(creditLimit) : 0,
        interestRate: interestRate !== undefined ? Number(interestRate) : 0,
        adminFee: adminFee !== undefined ? Number(adminFee) : 0,
        ...(adminFeeType !== undefined && { adminFeeType }),
        icon: icon ?? null,
        color: color ?? null,
      },
    });

    sendSuccess(res, { ...wallet, netWorth: await netWorthSnapshot(userId) }, 'Wallet created successfully', 201);
  } catch (err) {
    if ((err as { code?: string }).code === 'P2003') {
      return sendError(res, 'Invalid userId (user not found)', 400);
    }
    next(err);
  }
};

/**
 * PUT /api/v1/wallets/:id
 * Update wallet details.
 */
export const updateWallet = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId as string;
    const { name, type, balance, creditLimit, interestRate, adminFee, adminFeeType, icon, color, isArchived } = req.body;

    if (type && !VALID_WALLET_TYPES.includes(type)) {
      return sendError(res, `type must be one of: ${VALID_WALLET_TYPES.join(', ')}`, 400);
    }

    // Ownership check: refuse to touch a wallet that isn't the caller's.
    const owned = await prisma.wallet.findFirst({ where: { id, userId }, select: { id: true, balance: true } });
    if (!owned) {
      return sendError(res, `Wallet with id ${id} not found`, 404);
    }

    // Ledger boundary (Sprint 2B): `balance` is ledger state, not editable
    // metadata. This generic endpoint must never overwrite it — that would
    // desync the running total from the transaction ledger with no audit trail.
    // A harmless echo of the *current* balance is tolerated (frontends round-trip
    // the whole wallet object); any attempt to change it is refused so the caller
    // records an income/expense/transfer instead. Compared with Decimal (no float
    // subtraction) and checked before any write so a rejection mutates nothing.
    if (balance !== undefined) {
      let requested: Prisma.Decimal;
      try {
        requested = new Prisma.Decimal(balance as Prisma.Decimal.Value);
      } catch {
        return sendError(res, 'balance must be a valid number', 400, 'INVALID_AMOUNT');
      }
      if (!requested.equals(owned.balance)) {
        return sendError(
          res,
          'Wallet balance cannot be changed here. Record an income, expense, or transfer to adjust it through the ledger.',
          400,
          'BALANCE_UPDATE_NOT_ALLOWED'
        );
      }
      // Equal to the stored balance → a no-op echo; fall through and never write it.
    }

    const wallet = await prisma.wallet.update({
      where: { id },
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

    sendSuccess(res, { ...wallet, netWorth: await netWorthSnapshot(wallet.userId) }, 'Wallet updated successfully');
  } catch (err) {
    if ((err as { code?: string }).code === 'P2025') {
      return sendError(res, `Wallet with id ${req.params.id} not found`, 404);
    }
    next(err);
  }
};

/**
 * DELETE /api/v1/wallets/:id
 * Hard delete with transaction check: refuses when the wallet has transaction
 * history unless ?force=true (frontend confirm modal sends force).
 */
export const deleteWallet = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId as string;

    // Ownership check: refuse to delete a wallet that isn't the caller's.
    const owned = await prisma.wallet.findFirst({ where: { id, userId }, select: { id: true } });
    if (!owned) {
      return sendError(res, `Wallet with id ${id} not found`, 404);
    }

    // Ledger integrity: a wallet on EITHER side of a transfer cannot be deleted,
    // even with force. Cascade-deleting its transfer rows would leave the OTHER
    // wallet's balance credited/debited with no counterparty (drift). The caller
    // must delete those transfers first (which reverses both sides cleanly).
    const transferCount = await prisma.transaction.count({
      where: { userId, type: 'TRANSFER', OR: [{ walletId: id }, { toWalletId: id }] },
    });
    if (transferCount > 0) {
      return sendError(
        res,
        `Wallet is referenced by ${transferCount} transfer(s). Delete those transfers first to keep balances consistent.`,
        409,
        'CONFLICT'
      );
    }

    const txCount = await prisma.transaction.count({ where: { walletId: id, userId } });
    if (txCount > 0 && req.query.force !== 'true') {
      return sendError(res, `Wallet has ${txCount} transactions. Pass ?force=true to delete anyway.`, 409);
    }

    const deleted = await prisma.wallet.delete({ where: { id } });

    sendSuccess(res, { id, netWorth: await netWorthSnapshot(deleted.userId) }, `Wallet ${id} deleted successfully`);
  } catch (err) {
    if ((err as { code?: string }).code === 'P2025') {
      return sendError(res, `Wallet with id ${req.params.id} not found`, 404);
    }
    next(err);
  }
};

/**
 * GET /api/v1/wallets/:id/sparkline
 * Returns up to 7 historical balance data points for a wallet.
 * Used to render mini sparkline charts on dashboard wallet cards.
 */
export const getWalletSparkline = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId as string;

    // Verify wallet exists AND belongs to the caller
    const wallet = await prisma.wallet.findFirst({
      where: { id, userId },
      select: { id: true, balance: true, createdAt: true },
    });
    if (!wallet) {
      return sendError(res, 'Wallet not found', 404);
    }

    const now = new Date();
    const buckets = getRollingDayRanges(now, 7, reportingConfig.timezone);

    // Every realized transaction that can affect one of the seven day closes.
    const recentTx = await prisma.transaction.findMany({
      where: {
        userId,
        OR: [{ walletId: id }, { toWalletId: id }],
        date: { gte: buckets[0].startInclusive, lt: buckets[6].endExclusive },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true, type: true, amount: true, walletId: true, toWalletId: true,
        isInstallment: true, date: true, createdAt: true,
        installment: { select: { grandTotal: true } },
      },
    });

    if (recentTx.some((tx) => tx.type === 'TRANSFER' && tx.toWalletId === null)) {
      logger.warn('wallet sparkline includes legacy transfer with unknown destination', { walletId: id });
    }

    let runningBalance = new Prisma.Decimal(wallet.balance);
    let transactionIndex = 0;
    const newestFirst: { date: string; balance: number | null }[] = [];
    for (let bucketIndex = buckets.length - 1; bucketIndex >= 0; bucketIndex--) {
      const bucket = buckets[bucketIndex];
      const closingBoundary = bucketIndex === buckets.length - 1 ? now : bucket.endExclusive;
      while (
        transactionIndex < recentTx.length &&
        (bucketIndex === buckets.length - 1
          ? recentTx[transactionIndex].date.getTime() > closingBoundary.getTime()
          : recentTx[transactionIndex].date.getTime() >= closingBoundary.getTime())
      ) {
        runningBalance = runningBalance.minus(
          getWalletReportingEffect(recentTx[transactionIndex], id)
        );
        transactionIndex++;
      }
      newestFirst.push({
        date: bucket.label,
        balance: bucket.endExclusive.getTime() <= wallet.createdAt.getTime()
          ? null
          : Number(runningBalance.toString()),
      });
    }
    const points = newestFirst.reverse();

    sendSuccess(res, points, 'Sparkline data');
  } catch (err) {
    next(err);
  }
};
