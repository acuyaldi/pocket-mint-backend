// ============================================================
// Categorization service tests
// ============================================================

import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/prisma', () => ({ default: {} }));

import { createCategorizationService } from '../../src/services/categorization.service';

function makeDb(categories: Array<{ id: string; name: string; type: string }> = []) {
  return {
    category: {
      findMany: vi.fn(async ({ where }: any) =>
        categories.filter((c) => c.type === where.type),
      ),
    },
  };
}

describe('categorization service', () => {
  const expenseCategories = [
    { id: 'cat-belanja', name: 'Belanja', type: 'EXPENSE' },
    { id: 'cat-makanan', name: 'Makanan', type: 'EXPENSE' },
    { id: 'cat-transportasi', name: 'Transportasi', type: 'EXPENSE' },
    { id: 'cat-tagihan', name: 'Tagihan', type: 'EXPENSE' },
    { id: 'cat-kesehatan', name: 'Kesehatan', type: 'EXPENSE' },
    { id: 'cat-hiburan', name: 'Hiburan', type: 'EXPENSE' },
    { id: 'cat-lainnya', name: 'Lainnya', type: 'EXPENSE' },
  ];

  const incomeCategories = [
    { id: 'cat-gaji', name: 'Gaji', type: 'INCOME' },
    { id: 'cat-bonus', name: 'Bonus', type: 'INCOME' },
    { id: 'cat-investasi', name: 'Investasi', type: 'INCOME' },
    { id: 'cat-hadiah', name: 'Hadiah', type: 'INCOME' },
  ];

  const allCategories = [...expenseCategories, ...incomeCategories];

  it('returns ranked suggestions for a matching description', async () => {
    const db = makeDb(allCategories);
    const service = createCategorizationService(db as any);
    const suggestions = await service.getSuggestions('user-1', 'INDOMARET #123', 'EXPENSE');

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].categoryName).toBe('Belanja');
    expect(suggestions[0].confidence).toBe('HIGH');
    expect(db.category.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', type: 'EXPENSE' },
      select: { id: true, name: true },
    });
  });

  it('returns empty array for empty description', async () => {
    const db = makeDb(allCategories);
    const service = createCategorizationService(db as any);
    const suggestions = await service.getSuggestions('user-1', '', 'EXPENSE');
    expect(suggestions).toEqual([]);
  });

  it('returns empty array for whitespace description', async () => {
    const db = makeDb(allCategories);
    const service = createCategorizationService(db as any);
    const suggestions = await service.getSuggestions('user-1', '   ', 'EXPENSE');
    expect(suggestions).toEqual([]);
  });

  it('returns empty when user has no categories', async () => {
    const db = makeDb([]);
    const service = createCategorizationService(db as any);
    const suggestions = await service.getSuggestions('user-1', 'indomaret', 'EXPENSE');
    expect(suggestions).toEqual([]);
  });

  it('queries only categories of the requested type', async () => {
    const db = makeDb(allCategories);
    const service = createCategorizationService(db as any);
    await service.getSuggestions('user-1', 'gaji', 'INCOME');
    expect(db.category.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', type: 'INCOME' },
      select: { id: true, name: true },
    });
  });

  it('cross-user isolation: queries only the authenticated user', async () => {
    const db = makeDb(allCategories);
    const service = createCategorizationService(db as any);
    await service.getSuggestions('user-1', 'indomaret', 'EXPENSE');
    expect(db.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1', type: 'EXPENSE' } }),
    );
  });

  it('suggests Transportasi for bensin keyword', async () => {
    const db = makeDb(allCategories);
    const service = createCategorizationService(db as any);
    const suggestions = await service.getSuggestions('user-1', 'SPBU Pertamina', 'EXPENSE');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].categoryName).toBe('Transportasi');
  });

  it('suggests Gaji for salary description', async () => {
    const db = makeDb(allCategories);
    const service = createCategorizationService(db as any);
    const suggestions = await service.getSuggestions('user-1', 'Gaji November', 'INCOME');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].categoryName).toBe('Gaji');
  });

  it('returns empty when no keywords match', async () => {
    const db = makeDb(allCategories);
    const service = createCategorizationService(db as any);
    const suggestions = await service.getSuggestions('user-1', 'xyz abc unknown', 'EXPENSE');
    expect(suggestions).toEqual([]);
  });
});
