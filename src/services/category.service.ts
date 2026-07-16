import type { PrismaClient, CategoryType } from '../generated/prisma/client';
import prisma from '../lib/prisma';

export const DEFAULT_CATEGORIES = {
  EXPENSE: ['Makanan', 'Transportasi', 'Belanja', 'Tagihan', 'Kesehatan', 'Hiburan', 'Lainnya'],
  INCOME: ['Gaji', 'Bonus', 'Investasi', 'Hadiah', 'Lainnya'],
} as const;

type CategoryPrismaClient = Pick<PrismaClient, 'category'>;

export function createCategoryService(db: CategoryPrismaClient) {
  async function ensureDefaultCategories(userId: string): Promise<void> {
    const entries = (Object.entries(DEFAULT_CATEGORIES) as [CategoryType, readonly string[]][])
      .flatMap(([type, names]) => names.map((name) => ({ type, name })));

    await Promise.all(entries.map(({ type, name }) => db.category.upsert({
      where: { userId_name_type: { userId, name, type } },
      create: { userId, name, type },
      update: {},
    })));
  }

  async function listCategories(userId: string) {
    await ensureDefaultCategories(userId);
    return db.category.findMany({
      where: { userId },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  return { ensureDefaultCategories, listCategories };
}

export const categoryService = createCategoryService(prisma);
