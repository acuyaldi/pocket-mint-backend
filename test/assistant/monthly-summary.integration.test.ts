// ============================================================
// Tests: monthly-spending-summary handler (integration)
// ------------------------------------------------------------
// Requires TEST_DATABASE_URL — uses real Postgres to verify
// ownership isolation, Jakarta month boundaries, Decimal
// serialization, and the handler's contract with existing
// domain services.
//
// IMPORTANT: The handler uses the default Prisma singleton
// (bound to DATABASE_URL). When running against a disposable
// PostgreSQL, DATABASE_URL must point to the SAME database as
// TEST_DATABASE_URL. The integration-test runner script sets
// both; in CI the job-level env provides both. Running vitest
// directly without DATABASE_URL set will cause the handler to
// query the wrong database.
// ============================================================
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { createPrismaResources } from '../../src/lib/prismaFactory';
import { assertTestDatabaseUrl } from '../../src/lib/assertTestDatabaseUrl';
import { handleMonthlySpendingSummary } from '../../src/assistant/handlers/monthly-spending-summary.handler';
import type { ExecutionContext } from '../../src/assistant';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

if (TEST_DATABASE_URL) assertTestDatabaseUrl(TEST_DATABASE_URL);

const resources = TEST_DATABASE_URL
  ? createPrismaResources(TEST_DATABASE_URL, { max: 5 })
  : undefined;

afterAll(async () => {
  await resources?.close();
});

describe.skipIf(!TEST_DATABASE_URL)(
  'monthly-spending-summary handler (disposable PostgreSQL)',
  () => {
    const db = () => resources!.prisma;

    let createdUserIds: string[] = [];

    async function createUser(label: string): Promise<string> {
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const user = await db().user.create({
        data: { email: `${label}-${suffix}@example.test`, name: label },
      });
      createdUserIds.push(user.id);
      return user.id;
    }

    // Cleanup: delete in reverse-dependency order so FK constraints don't fail.
    afterEach(async () => {
      if (createdUserIds.length === 0) return;
      await db().transaction.deleteMany({ where: { userId: { in: createdUserIds } } });
      await db().budget.deleteMany({ where: { userId: { in: createdUserIds } } });
      await db().category.deleteMany({ where: { userId: { in: createdUserIds } } });
      await db().wallet.deleteMany({ where: { userId: { in: createdUserIds } } });
      await db().user.deleteMany({ where: { id: { in: createdUserIds } } });
      createdUserIds = [];
    });

    async function createWallet(userId: string, name = 'Cash') {
      return db().wallet.create({
        data: { userId, name, type: 'CASH', balance: 0 },
      });
    }

    async function createCategory(
      userId: string,
      name: string,
      type: 'INCOME' | 'EXPENSE',
    ) {
      return db().category.create({ data: { userId, name, type } });
    }

    async function createTx(over: {
      userId: string;
      walletId: string;
      categoryId?: string | null;
      type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
      amount: string;
      date: Date;
    }) {
      return db().transaction.create({
        data: {
          userId: over.userId,
          walletId: over.walletId,
          categoryId: over.categoryId ?? null,
          type: over.type,
          amount: over.amount,
          date: over.date,
        },
      });
    }

    function ctx(userId: string): ExecutionContext {
      return {
        userId,
        correlationId: 'test-corr',
        timestamp: new Date(),
      };
    }

    it('returns correct monthly summary with income, expenses, and categories', async () => {
      const userId = await createUser('monthly-user');
      const wallet = await createWallet(userId);
      const foodCat = await createCategory(userId, 'Makanan', 'EXPENSE');
      const transportCat = await createCategory(userId, 'Transportasi', 'EXPENSE');
      const salaryCat = await createCategory(userId, 'Gaji', 'INCOME');

      // Create transactions in July 2026 (Jakarta time)
      const july1 = new Date('2026-07-05T10:00:00+07:00');
      const july10 = new Date('2026-07-15T12:00:00+07:00');
      const july20 = new Date('2026-07-25T15:00:00+07:00');

      await createTx({
        userId, walletId: wallet.id, categoryId: foodCat.id,
        type: 'EXPENSE', amount: '50000', date: july1,
      });
      await createTx({
        userId, walletId: wallet.id, categoryId: transportCat.id,
        type: 'EXPENSE', amount: '30000', date: july10,
      });
      await createTx({
        userId, walletId: wallet.id, categoryId: salaryCat.id,
        type: 'INCOME', amount: '200000', date: july20,
      });

      const result = await handleMonthlySpendingSummary(
        { month: '2026-07' },
        ctx(userId),
      );

      expect(result.month).toBe('2026-07');
      expect(result.totalIncome).toBe(200000);
      expect(result.totalExpense).toBe(80000);
      expect(result.netSavings).toBe(120000);
      expect(result.transactionCount).toBe(3);
      expect(result.topCategories).toHaveLength(2);
      // Top category should be Makanan (50000 > 30000)
      expect(result.topCategories[0].name).toBe('Makanan');
      expect(result.topCategories[0].amount).toBe(50000);
    });

    it('handles a month with no transactions', async () => {
      const userId = await createUser('empty-month-user');

      const result = await handleMonthlySpendingSummary(
        { month: '2026-07' },
        ctx(userId),
      );

      expect(result.month).toBe('2026-07');
      expect(result.totalIncome).toBe(0);
      expect(result.totalExpense).toBe(0);
      expect(result.netSavings).toBe(0);
      expect(result.transactionCount).toBe(0);
      expect(result.topCategories).toHaveLength(0);
    });

    it('enforces ownership isolation — only returns the authenticated user\'s data', async () => {
      const userA = await createUser('owner-a');
      const userB = await createUser('owner-b');
      const walletA = await createWallet(userA);
      const walletB = await createWallet(userB);
      const catA = await createCategory(userA, 'Makan A', 'EXPENSE');
      const catB = await createCategory(userB, 'Makan B', 'EXPENSE');

      const july5 = new Date('2026-07-05T10:00:00+07:00');

      await createTx({
        userId: userA, walletId: walletA.id, categoryId: catA.id,
        type: 'EXPENSE', amount: '100000', date: july5,
      });
      await createTx({
        userId: userB, walletId: walletB.id, categoryId: catB.id,
        type: 'EXPENSE', amount: '999999', date: july5,
      });

      const resultA = await handleMonthlySpendingSummary(
        { month: '2026-07' },
        ctx(userA),
      );

      // User A only sees their own data
      expect(resultA.totalExpense).toBe(100000);
      expect(resultA.transactionCount).toBe(1);
      expect(resultA.topCategories[0].name).toBe('Makan A');
    });

    it('uses correct Jakarta month boundaries', async () => {
      const userId = await createUser('tz-user');
      const wallet = await createWallet(userId);
      const cat = await createCategory(userId, 'Food', 'EXPENSE');

      // June 30 23:00 UTC = July 1 06:00 WIB — should be in July
      const edgeDate = new Date('2026-06-30T23:00:00Z');

      await createTx({
        userId, walletId: wallet.id, categoryId: cat.id,
        type: 'EXPENSE', amount: '50000', date: edgeDate,
      });

      const result = await handleMonthlySpendingSummary(
        { month: '2026-07' },
        ctx(userId),
      );

      // June 30 23:00 UTC is July 1 in Jakarta — should be included
      expect(result.totalExpense).toBe(50000);
      expect(result.transactionCount).toBe(1);
    });

    it('serializes money as number via Number(decimal.toString())', async () => {
      const userId = await createUser('serialize-user');
      const wallet = await createWallet(userId);
      const cat = await createCategory(userId, 'Food', 'EXPENSE');
      const incCat = await createCategory(userId, 'Salary', 'INCOME');

      const date = new Date('2026-07-10T10:00:00+07:00');

      // Use exact rupiah amounts — should serialize cleanly
      await createTx({
        userId, walletId: wallet.id, categoryId: cat.id,
        type: 'EXPENSE', amount: '1234567', date,
      });
      await createTx({
        userId, walletId: wallet.id, categoryId: incCat.id,
        type: 'INCOME', amount: '9876543', date,
      });

      const result = await handleMonthlySpendingSummary(
        { month: '2026-07' },
        ctx(userId),
      );

      // Verify exact integer serialization
      expect(result.totalExpense).toBe(1234567);
      expect(result.totalIncome).toBe(9876543);
      expect(Number.isInteger(result.totalExpense)).toBe(true);
      expect(Number.isInteger(result.totalIncome)).toBe(true);
    });

    it('handler never accepts userId through input — uses ExecutionContext', async () => {
      // The handler signature takes input + ctx — userId is only in ctx
      const userId = await createUser('ctx-user');

      const result = await handleMonthlySpendingSummary(
        { month: '2026-07' },
        ctx(userId),
      );

      // Just verifying the handler works with ctx.userId and doesn't read
      // userId from the input object
      expect(result.month).toBe('2026-07');
    });
  },
);
