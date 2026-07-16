import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/prisma', () => ({ default: {} }));

import { createCategoryService, DEFAULT_CATEGORIES } from '../src/services/category.service';

function makeDb() {
  return {
    category: {
      upsert: vi.fn(async ({ create }: any) => ({ id: `${create.type}-${create.name}`, ...create })),
      findMany: vi.fn(async () => []),
    },
  };
}

describe('category service', () => {
  it('upserts every default category by user, name, and type', async () => {
    const db = makeDb();
    const service = createCategoryService(db as any);

    await service.ensureDefaultCategories('user-1');
    await service.ensureDefaultCategories('user-1');

    const expectedCount = DEFAULT_CATEGORIES.EXPENSE.length + DEFAULT_CATEGORIES.INCOME.length;
    expect(db.category.upsert).toHaveBeenCalledTimes(expectedCount * 2);
    expect(db.category.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId_name_type: { userId: 'user-1', name: 'Makanan', type: 'EXPENSE' },
      },
      create: { userId: 'user-1', name: 'Makanan', type: 'EXPENSE' },
      update: {},
    }));
  });

  it('backfills defaults then lists only the authenticated user categories', async () => {
    const db = makeDb();
    db.category.findMany.mockResolvedValue([
      { id: 'cat-1', userId: 'user-1', name: 'Gaji', type: 'INCOME' },
    ] as any);

    const rows = await createCategoryService(db as any).listCategories('user-1');

    expect(rows).toHaveLength(1);
    expect(db.category.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  });
});
