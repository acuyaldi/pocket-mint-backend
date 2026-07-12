import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { getUserNetWorth } from '../utils/financial';
import { reportingConfig } from '../config';
import { getRollingDayRanges } from '../domain/reportingTime';
import { getWalletReportingEffect } from '../domain/reportingEffect';
import { logger } from '../utils/logger';
import { walletService } from '../services/wallet.service';
import { WalletError } from '../services/wallet.errors';
import type {
  CreateWalletInput,
  UpdateWalletInput,
  DeleteWalletInput,
  DecimalInput,
  WalletType,
  AdminFeeType,
} from '../services/wallet.types';

const DEBT_TYPES = ['CREDIT_CARD', 'LOAN_PAYLATER'];

/**
 * Forward a wallet service error. Typed operational WalletErrors keep the
 * existing response envelope (status + stable code + safe message); anything
 * unexpected goes to the central error handler untouched — never a manual 500.
 */
function forwardWalletError(err: unknown, res: Response, next: NextFunction): void {
  if (err instanceof WalletError) {
    sendError(res, err.message, err.statusCode, err.code);
    return;
  }
  next(err);
}

/**
 * Resolve the authoritative user id (HTTP concern). `requireUser` injects
 * `req.userId`, which always wins; the body/query fallbacks preserve the prior
 * create behavior for callers without the middleware. The mapper never reads a
 * body `userId`, so a client cannot inject another user's id when authenticated.
 */
function resolveUserId(req: Request): string | undefined {
  return (req as any).userId || req.body?.userId || (req.query?.userId as string | undefined);
}

/** Allowlisted create-wallet request body (no `userId` — that is resolved separately). */
interface CreateWalletBody {
  name?: string;
  type?: WalletType;
  balance?: DecimalInput;
  creditLimit?: DecimalInput;
  interestRate?: DecimalInput;
  adminFee?: DecimalInput;
  adminFeeType?: AdminFeeType;
  icon?: string | null;
  color?: string | null;
}

/** Map allowlisted create fields from the request body into the service input. */
function mapCreateWalletRequest(body: CreateWalletBody, userId: string): CreateWalletInput {
  return {
    userId,
    name: body.name as string,
    type: body.type,
    balance: body.balance,
    creditLimit: body.creditLimit,
    interestRate: body.interestRate,
    adminFee: body.adminFee,
    adminFeeType: body.adminFeeType,
    icon: body.icon,
    color: body.color,
  };
}

/** Allowlisted update-wallet request body. `userId`/`walletId` come from auth + route. */
interface UpdateWalletBody {
  name?: string;
  type?: WalletType;
  balance?: DecimalInput;
  creditLimit?: DecimalInput | null;
  interestRate?: DecimalInput;
  adminFee?: DecimalInput;
  adminFeeType?: AdminFeeType;
  icon?: string | null;
  color?: string | null;
  isArchived?: boolean;
}

/** Map allowlisted update fields (plus route id + authenticated user) into service input. */
function mapUpdateWalletRequest(walletId: string, userId: string, body: UpdateWalletBody): UpdateWalletInput {
  return {
    userId,
    walletId,
    name: body.name,
    type: body.type,
    balance: body.balance,
    creditLimit: body.creditLimit,
    interestRate: body.interestRate,
    adminFee: body.adminFee,
    adminFeeType: body.adminFeeType,
    icon: body.icon,
    color: body.color,
    isArchived: body.isArchived,
  };
}

/**
 * Map the delete request into service input. `force` is normalized exactly as
 * before: active only when the query string is literally `'true'`.
 */
function mapDeleteWalletRequest(
  walletId: string,
  userId: string,
  query: { force?: string }
): DeleteWalletInput {
  return { userId, walletId, force: query.force === 'true' };
}

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
    const userId = resolveUserId(req);
    if (!userId) {
      return sendError(res, 'userId is required', 400);
    }

    const wallet = await walletService.createWallet(mapCreateWalletRequest(req.body, userId));

    // net-worth snapshot (reporting) is appended here; the service owns no response shaping.
    sendSuccess(res, { ...wallet, netWorth: await netWorthSnapshot(userId) }, 'Wallet created successfully', 201);
  } catch (err) {
    forwardWalletError(err, res, next);
  }
};

/**
 * PUT /api/v1/wallets/:id
 * Update wallet details.
 */
export const updateWallet = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId as string;
    const wallet = await walletService.updateWallet(mapUpdateWalletRequest(req.params.id, userId, req.body));

    sendSuccess(res, { ...wallet, netWorth: await netWorthSnapshot(wallet.userId) }, 'Wallet updated successfully');
  } catch (err) {
    forwardWalletError(err, res, next);
  }
};

/**
 * DELETE /api/v1/wallets/:id
 * Hard delete with transaction check: refuses when the wallet has transaction
 * history unless ?force=true (frontend confirm modal sends force).
 */
export const deleteWallet = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId as string;
    const result = await walletService.deleteWallet(mapDeleteWalletRequest(req.params.id, userId, req.query));

    // Ownership was verified in the service, so the caller owns the deleted wallet;
    // the reporting snapshot reflects the state after deletion.
    sendSuccess(res, { id: result.id, netWorth: await netWorthSnapshot(userId) }, `Wallet ${result.id} deleted successfully`);
  } catch (err) {
    forwardWalletError(err, res, next);
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
