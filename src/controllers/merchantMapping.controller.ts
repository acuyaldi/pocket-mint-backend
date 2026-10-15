// ============================================================
// Merchant mapping controller (Phase 19)
// ------------------------------------------------------------
// Thin HTTP mapping: allowlists request fields, calls
// merchantMapping.service.ts, and maps the result through the single
// `toMerchantMappingDto` serializer. Mirrors budget.controller.ts's shape.
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { getAuthenticatedUserId } from '../http/authContext';
import { forwardError } from '../http/forwardError';
import { merchantMappingService } from '../services/merchantMapping.service';
import { scalarString } from '../http/queryParsers';
import type { CreateMerchantMappingDto, UpdateMerchantMappingDto } from '../models/merchantMapping.model';
import type { MerchantMappingRecord } from '../services/merchantMapping.types';

/** Canonical MerchantMappingDto mapper — the ONLY place a mapping is serialized for HTTP. */
function toMerchantMappingDto(mapping: MerchantMappingRecord) {
  return {
    id: mapping.id,
    merchantName: mapping.merchantName,
    normalizedMerchant: mapping.normalizedMerchant,
    categoryId: mapping.categoryId,
    createdAt: mapping.createdAt.toISOString(),
    updatedAt: mapping.updatedAt.toISOString(),
  };
}

export class MerchantMappingController {
  // GET /api/v1/merchant-mappings?search=
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);

      const search = scalarString(req.query.search);
      const mappings = await merchantMappingService.list({ userId, search });
      sendSuccess(res, mappings.map(toMerchantMappingDto), 'Retrieved merchant mappings');
    } catch (err) {
      forwardError(err, res, next);
    }
  }

  // POST /api/v1/merchant-mappings
  static async create(req: Request<unknown, unknown, CreateMerchantMappingDto>, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);

      const created = await merchantMappingService.create({
        userId,
        merchantName: req.body.merchantName,
        categoryId: req.body.categoryId,
      });
      sendSuccess(res, toMerchantMappingDto(created), 'Merchant mapping berhasil dibuat', 201);
    } catch (err) {
      forwardError(err, res, next);
    }
  }

  // PATCH /api/v1/merchant-mappings/:id
  static async update(req: Request<{ id: string }, unknown, UpdateMerchantMappingDto>, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);

      const updated = await merchantMappingService.update({
        userId,
        mappingId: req.params.id,
        merchantName: req.body.merchantName,
        categoryId: req.body.categoryId,
      });
      sendSuccess(res, toMerchantMappingDto(updated), 'Merchant mapping berhasil diperbarui');
    } catch (err) {
      forwardError(err, res, next);
    }
  }

  // DELETE /api/v1/merchant-mappings/:id
  static async remove(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);

      await merchantMappingService.remove({ userId, mappingId: req.params.id });
      sendSuccess(res, null, 'Merchant mapping berhasil dihapus');
    } catch (err) {
      forwardError(err, res, next);
    }
  }
}
