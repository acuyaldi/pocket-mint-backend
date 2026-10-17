// ============================================================
// Wallet alias controller (Phase 37)
// ------------------------------------------------------------
// Thin HTTP mapping: allowlists request fields, calls
// walletAlias.service.ts, and maps the result through the single
// `toWalletAliasDto` serializer. Mirrors merchantMapping.controller.ts's shape.
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { getAuthenticatedUserId } from '../http/authContext';
import { forwardError } from '../http/forwardError';
import { walletAliasService } from '../services/walletAlias.service';
import type { WalletAlias } from '../services/walletAlias.types';

/** Canonical WalletAliasDto mapper — the ONLY place an alias is serialized for HTTP. */
function toWalletAliasDto(alias: WalletAlias) {
  return {
    id: alias.id,
    walletId: alias.walletId,
    aliasDisplay: alias.aliasDisplay,
    createdAt: alias.createdAt.toISOString(),
  };
}

interface CreateWalletAliasBody {
  aliasDisplay?: string;
}

export class WalletAliasController {
  // POST /api/v1/wallets/:walletId/aliases
  static async create(
    req: Request<{ walletId: string }, unknown, CreateWalletAliasBody>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);

      const created = await walletAliasService.create({
        userId,
        walletId: req.params.walletId,
        aliasDisplay: req.body.aliasDisplay as string,
      });
      sendSuccess(res, toWalletAliasDto(created), 'Wallet alias created successfully', 201);
    } catch (err) {
      forwardError(err, res, next);
    }
  }

  // DELETE /api/v1/wallets/:walletId/aliases/:aliasId
  static async remove(
    req: Request<{ walletId: string; aliasId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);

      await walletAliasService.remove({
        userId,
        walletId: req.params.walletId,
        aliasId: req.params.aliasId,
      });
      sendSuccess(res, null, 'Wallet alias deleted successfully');
    } catch (err) {
      forwardError(err, res, next);
    }
  }
}
