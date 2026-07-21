// ============================================================
// Merchant mapping command service (Phase 19)
// ------------------------------------------------------------
// Owns MerchantMapping CRUD business rules: normalization, ownership
// checks, and duplicate prevention. No Express dependency; returns the
// raw persisted MerchantMapping or throws a typed MerchantMappingError.
// Mirrors budget.service.ts's shape.
// ============================================================

import prisma from '../lib/prisma';
import { normalizeMerchant } from '../domain/categorization';
import { MerchantMappingError } from './merchantMapping.errors';
import type {
  CreateMerchantMappingInput,
  DeleteMerchantMappingInput,
  ListMerchantMappingsInput,
  MerchantMappingPrismaClient,
  MerchantMappingRecord,
  UpdateMerchantMappingInput,
} from './merchantMapping.types';

/** Trim and validate a merchant name, returning it alongside its normalized form. */
function parseMerchantName(value: string | undefined | null): { merchantName: string; normalizedMerchant: string } {
  const merchantName = value?.trim() ?? '';
  if (merchantName.length === 0) {
    throw new MerchantMappingError('merchantName is required', 400, 'BAD_REQUEST');
  }

  const normalizedMerchant = normalizeMerchant(merchantName);
  if (normalizedMerchant.length === 0) {
    throw new MerchantMappingError('merchantName must contain at least one letter or digit', 422, 'INVALID_MERCHANT_NAME');
  }

  return { merchantName, normalizedMerchant };
}

export function createMerchantMappingService(db: MerchantMappingPrismaClient) {
  /** Ownership-scoped lookup; a missing or another user's mapping is one indistinguishable 404. */
  async function findOwned(userId: string, id: string): Promise<MerchantMappingRecord> {
    const mapping = await db.merchantMapping.findFirst({ where: { id, userId } });
    if (!mapping) {
      throw new MerchantMappingError('Merchant mapping tidak ditemukan', 404, 'NOT_FOUND');
    }
    return mapping;
  }

  async function assertCategoryOwnership(userId: string, categoryId: string): Promise<void> {
    const category = await db.category.findFirst({ where: { id: categoryId, userId } });
    if (!category) {
      throw new MerchantMappingError('Kategori tidak ditemukan', 404, 'CATEGORY_NOT_FOUND');
    }
  }

  async function list(input: ListMerchantMappingsInput): Promise<MerchantMappingRecord[]> {
    const search = input.search?.trim();
    return db.merchantMapping.findMany({
      where: {
        userId: input.userId,
        ...(search ? { merchantName: { contains: search, mode: 'insensitive' } } : {}),
      },
      orderBy: { merchantName: 'asc' },
    });
  }

  /**
   * Create a mapping for a user-owned category. Rejects when a mapping for
   * the same normalized merchant already exists for this user — the
   * pre-check is a friendly fast path; the `@@unique([userId,
   * normalizedMerchant])` constraint is the real guarantee, so a concurrent
   * create is still translated from the raw P2002 into the same typed error.
   */
  async function create(input: CreateMerchantMappingInput): Promise<MerchantMappingRecord> {
    const { userId, categoryId } = input;
    const { merchantName, normalizedMerchant } = parseMerchantName(input.merchantName);

    await assertCategoryOwnership(userId, categoryId);

    const existing = await db.merchantMapping.findFirst({ where: { userId, normalizedMerchant } });
    if (existing) {
      throw new MerchantMappingError('Merchant ini sudah dipetakan ke kategori lain', 409, 'DUPLICATE_MERCHANT');
    }

    try {
      return await db.merchantMapping.create({
        data: { userId, merchantName, normalizedMerchant, categoryId },
      });
    } catch (err) {
      if (err instanceof MerchantMappingError) throw err;
      if ((err as { code?: string }).code === 'P2002') {
        throw new MerchantMappingError('Merchant ini sudah dipetakan ke kategori lain', 409, 'DUPLICATE_MERCHANT');
      }
      throw err;
    }
  }

  /** Update the merchant name and/or category of an owned mapping. */
  async function update(input: UpdateMerchantMappingInput): Promise<MerchantMappingRecord> {
    const { userId, mappingId } = input;
    await findOwned(userId, mappingId);

    const data: { merchantName?: string; normalizedMerchant?: string; categoryId?: string } = {};

    if (input.merchantName !== undefined) {
      const { merchantName, normalizedMerchant } = parseMerchantName(input.merchantName);
      const duplicate = await db.merchantMapping.findFirst({
        where: { userId, normalizedMerchant, NOT: { id: mappingId } },
      });
      if (duplicate) {
        throw new MerchantMappingError('Merchant ini sudah dipetakan ke kategori lain', 409, 'DUPLICATE_MERCHANT');
      }
      data.merchantName = merchantName;
      data.normalizedMerchant = normalizedMerchant;
    }

    if (input.categoryId !== undefined) {
      await assertCategoryOwnership(userId, input.categoryId);
      data.categoryId = input.categoryId;
    }

    try {
      return await db.merchantMapping.update({ where: { id: mappingId }, data });
    } catch (err) {
      if (err instanceof MerchantMappingError) throw err;
      if ((err as { code?: string }).code === 'P2002') {
        throw new MerchantMappingError('Merchant ini sudah dipetakan ke kategori lain', 409, 'DUPLICATE_MERCHANT');
      }
      throw err;
    }
  }

  async function remove(input: DeleteMerchantMappingInput): Promise<void> {
    const { userId, mappingId } = input;
    await findOwned(userId, mappingId);
    await db.merchantMapping.delete({ where: { id: mappingId } });
  }

  /**
   * Exact-match lookup used by the categorization pipeline (highest
   * priority, before keyword matching). Never falls back to another
   * user's mappings — scoped strictly by `userId`.
   */
  async function findByNormalizedMerchant(userId: string, normalizedMerchant: string): Promise<MerchantMappingRecord | null> {
    if (normalizedMerchant.length === 0) return null;
    return db.merchantMapping.findFirst({ where: { userId, normalizedMerchant } });
  }

  return { list, create, update, remove, findByNormalizedMerchant };
}

/** Production instance bound to the shared Prisma singleton. */
export const merchantMappingService = createMerchantMappingService(prisma);
