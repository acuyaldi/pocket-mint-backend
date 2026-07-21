import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/lib/prisma', () => ({ default: {} }));

import { createMerchantMappingService } from '../../src/services/merchantMapping.service';
import { MerchantMappingError } from '../../src/services/merchantMapping.errors';

const USER = 'user-1';
const OTHER_USER = 'user-2';

function makeMapping(over: Record<string, unknown> = {}) {
  return {
    id: 'mapping-1',
    userId: USER,
    merchantName: 'Warung Bu Siti',
    normalizedMerchant: 'warung bu siti',
    categoryId: 'cat-1',
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    ...over,
  };
}

function makeCategory(over: Record<string, unknown> = {}) {
  return { id: 'cat-1', userId: USER, name: 'Makanan', type: 'EXPENSE', ...over };
}

function makeDb(over: {
  mappingFindFirst?: unknown[];
  categoryFindFirst?: unknown;
  mappingCreate?: (args: unknown) => unknown;
  mappingUpdate?: (args: unknown) => unknown;
  mappingFindMany?: unknown[];
} = {}) {
  const findFirstQueue = over.mappingFindFirst ?? [null];
  let call = 0;
  return {
    merchantMapping: {
      findFirst: vi.fn(async () => (call < findFirstQueue.length ? findFirstQueue[call++] : findFirstQueue.at(-1))),
      findMany: vi.fn(async () => over.mappingFindMany ?? []),
      create: vi.fn(async (args: unknown) => (over.mappingCreate ? over.mappingCreate(args) : { id: 'new-mapping', ...(args as { data: object }).data })),
      update: vi.fn(async (args: unknown) => (over.mappingUpdate ? over.mappingUpdate(args) : { ...makeMapping(), ...(args as { data: object }).data })),
      delete: vi.fn(async () => makeMapping()),
    },
    category: {
      findFirst: vi.fn(async () => over.categoryFindFirst ?? null),
    },
  };
}

describe('merchant mapping service — create', () => {
  it('normalizes the merchant name and creates a mapping', async () => {
    const db = makeDb({ categoryFindFirst: makeCategory(), mappingFindFirst: [null] });
    const service = createMerchantMappingService(db as any);

    const created = await service.create({ userId: USER, merchantName: '  INDOMARET #123  ', categoryId: 'cat-1' });

    expect(db.merchantMapping.create).toHaveBeenCalledWith({
      data: { userId: USER, merchantName: 'INDOMARET #123', normalizedMerchant: 'indomaret', categoryId: 'cat-1' },
    });
    expect(created.normalizedMerchant).toBe('indomaret');
  });

  it('rejects an empty merchant name', async () => {
    const db = makeDb();
    const service = createMerchantMappingService(db as any);
    await expect(service.create({ userId: USER, merchantName: '   ', categoryId: 'cat-1' })).rejects.toThrow(MerchantMappingError);
  });

  it('rejects a merchant name that normalizes to nothing', async () => {
    const db = makeDb();
    const service = createMerchantMappingService(db as any);
    await expect(service.create({ userId: USER, merchantName: '###', categoryId: 'cat-1' })).rejects.toMatchObject({ code: 'INVALID_MERCHANT_NAME' });
  });

  it('rejects when the category does not exist or is not owned by the user', async () => {
    const db = makeDb({ categoryFindFirst: null });
    const service = createMerchantMappingService(db as any);
    await expect(service.create({ userId: USER, merchantName: 'Indomaret', categoryId: 'cat-x' })).rejects.toMatchObject({ code: 'CATEGORY_NOT_FOUND', statusCode: 404 });
  });

  it('rejects a duplicate normalized merchant for the same user', async () => {
    const db = makeDb({ categoryFindFirst: makeCategory(), mappingFindFirst: [makeMapping()] });
    const service = createMerchantMappingService(db as any);
    await expect(service.create({ userId: USER, merchantName: 'Warung Bu Siti', categoryId: 'cat-1' })).rejects.toMatchObject({ code: 'DUPLICATE_MERCHANT', statusCode: 409 });
    expect(db.merchantMapping.create).not.toHaveBeenCalled();
  });

  it('translates a raw P2002 race into DUPLICATE_MERCHANT', async () => {
    const db = makeDb({
      categoryFindFirst: makeCategory(),
      mappingFindFirst: [null],
      mappingCreate: () => {
        throw Object.assign(new Error('unique violation'), { code: 'P2002' });
      },
    });
    const service = createMerchantMappingService(db as any);
    await expect(service.create({ userId: USER, merchantName: 'Warung Bu Siti', categoryId: 'cat-1' })).rejects.toMatchObject({ code: 'DUPLICATE_MERCHANT' });
  });
});

describe('merchant mapping service — update', () => {
  it('updates the merchant name and recomputes the normalized form', async () => {
    const db = makeDb({ mappingFindFirst: [makeMapping(), null] });
    const service = createMerchantMappingService(db as any);

    await service.update({ userId: USER, mappingId: 'mapping-1', merchantName: 'Warung Baru' });

    expect(db.merchantMapping.update).toHaveBeenCalledWith({
      where: { id: 'mapping-1' },
      data: { merchantName: 'Warung Baru', normalizedMerchant: 'warung baru' },
    });
  });

  it('rejects renaming into a normalized merchant already used by another mapping', async () => {
    const db = makeDb({ mappingFindFirst: [makeMapping(), makeMapping({ id: 'mapping-2' })] });
    const service = createMerchantMappingService(db as any);
    await expect(service.update({ userId: USER, mappingId: 'mapping-1', merchantName: 'Warung Bu Siti' })).rejects.toMatchObject({ code: 'DUPLICATE_MERCHANT' });
  });

  it('updates the category after validating ownership', async () => {
    const db = makeDb({ mappingFindFirst: [makeMapping()], categoryFindFirst: makeCategory({ id: 'cat-2' }) });
    const service = createMerchantMappingService(db as any);
    await service.update({ userId: USER, mappingId: 'mapping-1', categoryId: 'cat-2' });
    expect(db.merchantMapping.update).toHaveBeenCalledWith({ where: { id: 'mapping-1' }, data: { categoryId: 'cat-2' } });
  });

  it('rejects updating a mapping owned by another user (404, indistinguishable from missing)', async () => {
    const db = makeDb({ mappingFindFirst: [null] });
    const service = createMerchantMappingService(db as any);
    await expect(service.update({ userId: OTHER_USER, mappingId: 'mapping-1', merchantName: 'X' })).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });
});

describe('merchant mapping service — delete', () => {
  it('deletes an owned mapping', async () => {
    const db = makeDb({ mappingFindFirst: [makeMapping()] });
    const service = createMerchantMappingService(db as any);
    await service.remove({ userId: USER, mappingId: 'mapping-1' });
    expect(db.merchantMapping.delete).toHaveBeenCalledWith({ where: { id: 'mapping-1' } });
  });

  it('rejects deleting a mapping owned by another user', async () => {
    const db = makeDb({ mappingFindFirst: [null] });
    const service = createMerchantMappingService(db as any);
    await expect(service.remove({ userId: OTHER_USER, mappingId: 'mapping-1' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(db.merchantMapping.delete).not.toHaveBeenCalled();
  });
});

describe('merchant mapping service — list', () => {
  it('lists mappings scoped to the user', async () => {
    const db = makeDb({ mappingFindMany: [makeMapping()] });
    const service = createMerchantMappingService(db as any);
    await service.list({ userId: USER });
    expect(db.merchantMapping.findMany).toHaveBeenCalledWith({
      where: { userId: USER },
      orderBy: { merchantName: 'asc' },
    });
  });

  it('applies a case-insensitive search filter', async () => {
    const db = makeDb({ mappingFindMany: [] });
    const service = createMerchantMappingService(db as any);
    await service.list({ userId: USER, search: 'warung' });
    expect(db.merchantMapping.findMany).toHaveBeenCalledWith({
      where: { userId: USER, merchantName: { contains: 'warung', mode: 'insensitive' } },
      orderBy: { merchantName: 'asc' },
    });
  });
});

describe('merchant mapping service — findByNormalizedMerchant (pipeline lookup)', () => {
  it('scopes strictly to the given user and never falls back to another user', async () => {
    const db = makeDb({ mappingFindFirst: [null] });
    const service = createMerchantMappingService(db as any);
    const result = await service.findByNormalizedMerchant(OTHER_USER, 'indomaret');
    expect(db.merchantMapping.findFirst).toHaveBeenCalledWith({ where: { userId: OTHER_USER, normalizedMerchant: 'indomaret' } });
    expect(result).toBeNull();
  });

  it('returns null without a query for an empty normalized merchant', async () => {
    const db = makeDb();
    const service = createMerchantMappingService(db as any);
    const result = await service.findByNormalizedMerchant(USER, '');
    expect(result).toBeNull();
    expect(db.merchantMapping.findFirst).not.toHaveBeenCalled();
  });
});
