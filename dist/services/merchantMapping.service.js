"use strict";
// ============================================================
// Merchant mapping command service (Phase 19)
// ------------------------------------------------------------
// Owns MerchantMapping CRUD business rules: normalization, ownership
// checks, and duplicate prevention. No Express dependency; returns the
// raw persisted MerchantMapping or throws a typed MerchantMappingError.
// Mirrors budget.service.ts's shape.
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.merchantMappingService = void 0;
exports.createMerchantMappingService = createMerchantMappingService;
const prisma_1 = __importDefault(require("../lib/prisma"));
const categorization_1 = require("../domain/categorization");
const merchantMapping_errors_1 = require("./merchantMapping.errors");
/** Trim and validate a merchant name, returning it alongside its normalized form. */
function parseMerchantName(value) {
    const merchantName = value?.trim() ?? '';
    if (merchantName.length === 0) {
        throw new merchantMapping_errors_1.MerchantMappingError('merchantName is required', 400, 'BAD_REQUEST');
    }
    const normalizedMerchant = (0, categorization_1.normalizeMerchant)(merchantName);
    if (normalizedMerchant.length === 0) {
        throw new merchantMapping_errors_1.MerchantMappingError('merchantName must contain at least one letter or digit', 422, 'INVALID_MERCHANT_NAME');
    }
    return { merchantName, normalizedMerchant };
}
function createMerchantMappingService(db) {
    /** Ownership-scoped lookup; a missing or another user's mapping is one indistinguishable 404. */
    async function findOwned(userId, id) {
        const mapping = await db.merchantMapping.findFirst({ where: { id, userId } });
        if (!mapping) {
            throw new merchantMapping_errors_1.MerchantMappingError('Merchant mapping tidak ditemukan', 404, 'NOT_FOUND');
        }
        return mapping;
    }
    async function assertCategoryOwnership(userId, categoryId) {
        const category = await db.category.findFirst({ where: { id: categoryId, userId } });
        if (!category) {
            throw new merchantMapping_errors_1.MerchantMappingError('Kategori tidak ditemukan', 404, 'CATEGORY_NOT_FOUND');
        }
    }
    async function list(input) {
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
    async function create(input) {
        const { userId, categoryId } = input;
        const { merchantName, normalizedMerchant } = parseMerchantName(input.merchantName);
        await assertCategoryOwnership(userId, categoryId);
        const existing = await db.merchantMapping.findFirst({ where: { userId, normalizedMerchant } });
        if (existing) {
            throw new merchantMapping_errors_1.MerchantMappingError('Merchant ini sudah dipetakan ke kategori lain', 409, 'DUPLICATE_MERCHANT');
        }
        try {
            return await db.merchantMapping.create({
                data: { userId, merchantName, normalizedMerchant, categoryId },
            });
        }
        catch (err) {
            if (err instanceof merchantMapping_errors_1.MerchantMappingError)
                throw err;
            if (err.code === 'P2002') {
                throw new merchantMapping_errors_1.MerchantMappingError('Merchant ini sudah dipetakan ke kategori lain', 409, 'DUPLICATE_MERCHANT');
            }
            throw err;
        }
    }
    /** Update the merchant name and/or category of an owned mapping. */
    async function update(input) {
        const { userId, mappingId } = input;
        await findOwned(userId, mappingId);
        const data = {};
        if (input.merchantName !== undefined) {
            const { merchantName, normalizedMerchant } = parseMerchantName(input.merchantName);
            const duplicate = await db.merchantMapping.findFirst({
                where: { userId, normalizedMerchant, NOT: { id: mappingId } },
            });
            if (duplicate) {
                throw new merchantMapping_errors_1.MerchantMappingError('Merchant ini sudah dipetakan ke kategori lain', 409, 'DUPLICATE_MERCHANT');
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
        }
        catch (err) {
            if (err instanceof merchantMapping_errors_1.MerchantMappingError)
                throw err;
            if (err.code === 'P2002') {
                throw new merchantMapping_errors_1.MerchantMappingError('Merchant ini sudah dipetakan ke kategori lain', 409, 'DUPLICATE_MERCHANT');
            }
            throw err;
        }
    }
    async function remove(input) {
        const { userId, mappingId } = input;
        await findOwned(userId, mappingId);
        await db.merchantMapping.delete({ where: { id: mappingId } });
    }
    /**
     * Exact-match lookup used by the categorization pipeline (highest
     * priority, before keyword matching). Never falls back to another
     * user's mappings — scoped strictly by `userId`.
     */
    async function findByNormalizedMerchant(userId, normalizedMerchant) {
        if (normalizedMerchant.length === 0)
            return null;
        return db.merchantMapping.findFirst({ where: { userId, normalizedMerchant } });
    }
    return { list, create, update, remove, findByNormalizedMerchant };
}
/** Production instance bound to the shared Prisma singleton. */
exports.merchantMappingService = createMerchantMappingService(prisma_1.default);
//# sourceMappingURL=merchantMapping.service.js.map