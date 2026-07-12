import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { walletService } from '../services/wallet.service';
import { walletQueryService } from '../services/wallet-query.service';
import { WalletError } from '../services/wallet.errors';
import type {
  CreateWalletInput,
  UpdateWalletInput,
  DeleteWalletInput,
  DecimalInput,
  WalletType,
  AdminFeeType,
} from '../services/wallet.types';
import type { Wallet, WalletTotals, WalletSparklinePoint } from '../services/wallet-query.types';

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

/**
 * Serialize the query service's Decimal net-worth totals into the existing
 * numeric response. The reporting snapshot is fetched from the wallet query
 * service (reads) and appended to every mutation response, exactly as before.
 */
function serializeNetWorth(totals: WalletTotals) {
  return {
    totalAset: parseFloat(totals.totalAset.toString()),
    totalUtang: parseFloat(totals.totalUtang.toString()),
    netWorth: parseFloat(totals.netWorth.toString()),
  };
}

/** Fetch + serialize the caller's net-worth snapshot (the mutation-response reporting field). */
async function netWorthSnapshot(userId: string) {
  return serializeNetWorth(await walletQueryService.getNetWorth({ userId }));
}

/**
 * Serialize one wallet for the list response: Decimal → number (parseFloat, as
 * before) plus the DEBT-only computed fields. `sisa_limit` and `outstanding_debt`
 * are `null` for asset wallets. This is the single response boundary — the query
 * service returns raw Decimals and never converts.
 */
function serializeWallet(w: Wallet) {
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
}

/** Serialize sparkline points: Decimal → number, preserving pre-creation `null` (never 0). */
function serializeSparkline(points: WalletSparklinePoint[]) {
  return points.map((point) => ({
    date: point.date,
    balance: point.balance === null ? null : Number(point.balance.toString()),
  }));
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

    const wallets = await walletQueryService.listWallets({ userId });

    sendSuccess(res, wallets.map(serializeWallet), 'Fetched wallets');
  } catch (err) {
    forwardWalletError(err, res, next);
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
    const userId = (req as any).userId as string;
    const points = await walletQueryService.getWalletSparkline({ userId, walletId: req.params.id });

    sendSuccess(res, serializeSparkline(points), 'Sparkline data');
  } catch (err) {
    forwardWalletError(err, res, next);
  }
};
