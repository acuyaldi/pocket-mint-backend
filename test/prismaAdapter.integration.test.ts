import { describe, it, expect, afterAll, afterEach } from 'vitest';
import { createPrismaResources } from '../src/lib/prismaFactory';
import { assertTestDatabaseUrl } from '../src/lib/assertTestDatabaseUrl';
import { createTransactionService } from '../src/services/transaction.service';
import { createWalletService } from '../src/services/wallet.service';
import { createInstallmentPaymentService } from '../src/services/installment-payment.service';
import { createDashboardQueryService } from '../src/services/dashboard-query.service';
import { createTransactionQueryService } from '../src/services/transaction-query.service';

/**
 * Adapter-backed integration suite against a DISPOSABLE PostgreSQL.
 *
 * Runs ONLY when TEST_DATABASE_URL points at a throwaway database that has
 * already had `prisma migrate deploy` applied (see docs/database-testing.md).
 * It is skipped otherwise, so the normal unit suite never needs a database and
 * never opens a real connection.
 *
 * NEVER point this at Supabase or any shared database — `assertTestDatabaseUrl`
 * fails the whole file at collection time (not just a skip) if the URL looks
 * production-like, so a misconfigured env can't silently run — or silently
 * skip — against the wrong database.
 */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

if (TEST_DATABASE_URL) assertTestDatabaseUrl(TEST_DATABASE_URL);

const resources = TEST_DATABASE_URL
  ? createPrismaResources(TEST_DATABASE_URL, { max: 5 })
  : undefined;

afterAll(async () => {
  await resources?.close();
});

describe.skipIf(!TEST_DATABASE_URL)('Prisma integration (disposable PostgreSQL)', () => {
  // Lazily accessed: the describe callback still runs at collection time even
  // when skipped, so we must not dereference `resources` (undefined) here.
  const db = () => resources!.prisma;
  const transactionService = () => createTransactionService(db());
  const walletService = () => createWalletService(db());
  const installmentPaymentService = () => createInstallmentPaymentService(db());
  const dashboardQueryService = () => createDashboardQueryService(db());
  const transactionQueryService = () => createTransactionQueryService(db());

  let createdUserIds: string[] = [];

  /**
   * Every test gets its own user, deleted (cascading to its wallets,
   * transactions, categories, and installments) in `afterEach`. This keeps
   * tests order-independent and leak-free without a shared fixture or a
   * global reset step.
   */
  async function createUser(label: string): Promise<string> {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const user = await db().user.create({
      data: { email: `${label}-${suffix}@example.test`, name: label },
    });
    createdUserIds.push(user.id);
    return user.id;
  }

  afterEach(async () => {
    if (createdUserIds.length === 0) return;
    await db().user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds = [];
  });

  it('connects and answers SELECT 1', async () => {
    const rows = await db().$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`;
    expect(rows[0].ok).toBe(1);
  });

  describe('user isolation', () => {
    it('scopes wallet and transaction reads to the owning user only', async () => {
      const userA = await createUser('iso-a');
      const userB = await createUser('iso-b');

      const walletA = await walletService().createWallet({ userId: userA, name: 'A Cash', type: 'CASH', balance: 100000 });
      const walletB = await walletService().createWallet({ userId: userB, name: 'B Cash', type: 'CASH', balance: 200000 });

      const categoryA = await db().category.create({ data: { userId: userA, name: 'Gaji', type: 'INCOME' } });
      const categoryB = await db().category.create({ data: { userId: userB, name: 'Gaji', type: 'INCOME' } });

      await transactionService().createTransaction({
        userId: userA, type: 'INCOME', amount: 50000, walletId: walletA.id, categoryId: categoryA.id, date: '2026-01-10',
      });
      await transactionService().createTransaction({
        userId: userB, type: 'INCOME', amount: 75000, walletId: walletB.id, categoryId: categoryB.id, date: '2026-01-10',
      });

      const txA = await transactionQueryService().listTransactions({ userId: userA, allTime: true });
      const txB = await transactionQueryService().listTransactions({ userId: userB, allTime: true });

      expect(txA).toHaveLength(1);
      expect(txA[0].userId).toBe(userA);
      expect(txB).toHaveLength(1);
      expect(txB[0].userId).toBe(userB);

      // Cross-user lookup yields nothing rather than another user's row.
      const crossOwner = await db().wallet.findFirst({ where: { id: walletB.id, userId: userA } });
      expect(crossOwner).toBeNull();
    });
  });

  describe('wallet CRUD', () => {
    it('creates, updates, and deletes a wallet', async () => {
      const userId = await createUser('wallet-crud');

      const created = await walletService().createWallet({ userId, name: 'Dompet', type: 'CASH', balance: 10000 });
      expect(created.balance.toString()).toBe('10000');

      const updated = await walletService().updateWallet({ userId, walletId: created.id, name: 'Dompet Utama' });
      expect(updated.name).toBe('Dompet Utama');

      const deleted = await walletService().deleteWallet({ userId, walletId: created.id });
      expect(deleted.id).toBe(created.id);

      const found = await db().wallet.findUnique({ where: { id: created.id } });
      expect(found).toBeNull();
    });
  });

  describe('income and expense', () => {
    it('applies +amount for income and -amount for expense to the same wallet', async () => {
      const userId = await createUser('income-expense');
      const wallet = await walletService().createWallet({ userId, name: 'Bank', type: 'BANK', balance: 100000 });
      const incomeCategory = await db().category.create({ data: { userId, name: 'Gaji', type: 'INCOME' } });
      const expenseCategory = await db().category.create({ data: { userId, name: 'Makan', type: 'EXPENSE' } });

      await transactionService().createTransaction({
        userId, type: 'INCOME', amount: 50000, walletId: wallet.id, categoryId: incomeCategory.id, date: '2026-01-05',
      });
      let refreshed = await db().wallet.findUniqueOrThrow({ where: { id: wallet.id } });
      expect(refreshed.balance.toString()).toBe('150000');

      await transactionService().createTransaction({
        userId, type: 'EXPENSE', amount: 30000, walletId: wallet.id, categoryId: expenseCategory.id, date: '2026-01-06',
      });
      refreshed = await db().wallet.findUniqueOrThrow({ where: { id: wallet.id } });
      expect(refreshed.balance.toString()).toBe('120000');
    });
  });

  describe('transfer atomicity', () => {
    it('moves the amount between wallets in a single atomic write', async () => {
      const userId = await createUser('transfer');
      const from = await walletService().createWallet({ userId, name: 'From', type: 'BANK', balance: 100000 });
      const to = await walletService().createWallet({ userId, name: 'To', type: 'E_WALLET', balance: 0 });

      await transactionService().createTransaction({
        userId, type: 'TRANSFER', amount: 40000, walletId: from.id, toWalletId: to.id, date: '2026-01-07',
      });

      const fromAfter = await db().wallet.findUniqueOrThrow({ where: { id: from.id } });
      const toAfter = await db().wallet.findUniqueOrThrow({ where: { id: to.id } });
      expect(fromAfter.balance.toString()).toBe('60000');
      expect(toAfter.balance.toString()).toBe('40000');
    });

    it('rejects an insufficient-funds transfer and leaves both wallets unchanged', async () => {
      const userId = await createUser('transfer-insufficient');
      const from = await walletService().createWallet({ userId, name: 'From', type: 'BANK', balance: 10000 });
      const to = await walletService().createWallet({ userId, name: 'To', type: 'E_WALLET', balance: 0 });

      await expect(
        transactionService().createTransaction({
          userId, type: 'TRANSFER', amount: 999999, walletId: from.id, toWalletId: to.id, date: '2026-01-07',
        }),
      ).rejects.toMatchObject({ code: 'INSUFFICIENT_FUNDS' });

      const fromAfter = await db().wallet.findUniqueOrThrow({ where: { id: from.id } });
      const toAfter = await db().wallet.findUniqueOrThrow({ where: { id: to.id } });
      expect(fromAfter.balance.toString()).toBe('10000');
      expect(toAfter.balance.toString()).toBe('0');
    });
  });

  describe('debt transaction (credit expense)', () => {
    it('debits the wallet by grandTotal and creates a linked FULL installment', async () => {
      const userId = await createUser('debt-full');
      const card = await walletService().createWallet({ userId, name: 'Kartu Kredit', type: 'CREDIT_CARD', balance: 0, creditLimit: 1000000 });
      const category = await db().category.create({ data: { userId, name: 'Belanja', type: 'EXPENSE' } });

      const tx = await transactionService().createTransaction({
        userId, type: 'EXPENSE', amount: 200000, walletId: card.id, categoryId: category.id,
        date: '2026-01-08', billingMode: 'FULL', firstDueDate: '2026-02-10',
      });

      expect(tx.isInstallment).toBe(true);
      const installment = await db().installment.findUniqueOrThrow({ where: { id: tx.installmentId! } });
      expect(installment.kind).toBe('FULL');
      expect(installment.grandTotal.toString()).toBe('200000');

      const walletAfter = await db().wallet.findUniqueOrThrow({ where: { id: card.id } });
      expect(walletAfter.balance.toString()).toBe('-200000');
    });
  });

  describe('installment creation and final payment', () => {
    it('creates a multi-term installment, then settles it after the final payment', async () => {
      const userId = await createUser('installment');
      const card = await walletService().createWallet({ userId, name: 'PayLater', type: 'PAYLATER', balance: 0, creditLimit: 1000000 });
      const bank = await walletService().createWallet({ userId, name: 'Bank', type: 'BANK', balance: 500000 });
      const category = await db().category.create({ data: { userId, name: 'Elektronik', type: 'EXPENSE' } });

      const tx = await transactionService().createTransaction({
        userId, type: 'EXPENSE', amount: 100000, walletId: card.id, categoryId: category.id,
        date: '2026-01-08', billingMode: 'INSTALLMENT', installmentMonths: 2, interestRate: 2.6,
        firstDueDate: '2026-02-10',
      });

      const installmentId = tx.installmentId!;
      // principal 100000, rate 2.6%, 2 months: totalInterest = round(100000*0.026*2) = 5200.
      let installment = await db().installment.findUniqueOrThrow({ where: { id: installmentId } });
      expect(installment.installmentMonths).toBe(2);
      expect(installment.grandTotal.toString()).toBe('105200');
      expect(installment.status).toBe('ACTIVE');

      let cardAfter = await db().wallet.findUniqueOrThrow({ where: { id: card.id } });
      expect(cardAfter.balance.toString()).toBe('-105200');

      // Term 1 (regular).
      await installmentPaymentService().payInstallment({ userId, installmentId, sourceWalletId: bank.id, date: '2026-02-10' });
      installment = await db().installment.findUniqueOrThrow({ where: { id: installmentId } });
      expect(installment.paidTerms).toBe(1);
      expect(installment.status).toBe('ACTIVE');

      // Term 2 (final — absorbs the rounding remainder, settles the installment).
      await installmentPaymentService().payInstallment({ userId, installmentId, sourceWalletId: bank.id, date: '2026-03-10' });
      installment = await db().installment.findUniqueOrThrow({ where: { id: installmentId } });
      expect(installment.paidTerms).toBe(2);
      expect(installment.status).toBe('SETTLED');

      // Debt fully repaid through the two TRANSFER payments: card balance back to zero.
      cardAfter = await db().wallet.findUniqueOrThrow({ where: { id: card.id } });
      expect(cardAfter.balance.toString()).toBe('0');

      // A settled installment rejects further payment.
      await expect(
        installmentPaymentService().payInstallment({ userId, installmentId, sourceWalletId: bank.id, date: '2026-04-10' }),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
    });
  });

  describe('rollback on failure', () => {
    it('leaves no partial write when a $transaction throws mid-way', async () => {
      const userId = await createUser('rollback');
      const wallet = await walletService().createWallet({ userId, name: 'Rollback', type: 'CASH', balance: 5000 });

      await expect(
        db().$transaction(async (tx) => {
          await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: 100 } } });
          throw new Error('forced rollback');
        }),
      ).rejects.toThrow('forced rollback');

      const after = await db().wallet.findUniqueOrThrow({ where: { id: wallet.id } });
      expect(after.balance.toString()).toBe('5000');
    });
  });

  describe('dashboard summary', () => {
    it('computes totalAset, totalUtang, and netWorth per PD-001', async () => {
      const userId = await createUser('dashboard');
      await walletService().createWallet({ userId, name: 'Cash', type: 'CASH', balance: 500000 });
      const cc = await walletService().createWallet({ userId, name: 'CC', type: 'CREDIT_CARD', balance: 0, creditLimit: 1000000 });
      const category = await db().category.create({ data: { userId, name: 'Belanja', type: 'EXPENSE' } });
      await transactionService().createTransaction({
        userId, type: 'EXPENSE', amount: 200000, walletId: cc.id, categoryId: category.id,
        date: '2026-01-08', billingMode: 'FULL', firstDueDate: '2026-02-10',
      });

      const summary = await dashboardQueryService().getSummary({ userId });
      expect(summary.totalAset.toString()).toBe('500000');
      expect(summary.totalUtang.toString()).toBe('200000');
      expect(summary.netWorth.toString()).toBe('300000');
    });
  });

  describe('historical transaction query', () => {
    it('lists all-time transactions across months, newest first', async () => {
      const userId = await createUser('history');
      const wallet = await walletService().createWallet({ userId, name: 'Cash', type: 'CASH', balance: 0 });
      const category = await db().category.create({ data: { userId, name: 'Gaji', type: 'INCOME' } });

      await transactionService().createTransaction({
        userId, type: 'INCOME', amount: 10000, walletId: wallet.id, categoryId: category.id, date: '2025-11-01',
      });
      await transactionService().createTransaction({
        userId, type: 'INCOME', amount: 20000, walletId: wallet.id, categoryId: category.id, date: '2026-01-01',
      });

      const all = await transactionQueryService().listTransactions({ userId, allTime: true });
      expect(all).toHaveLength(2);
      expect(all[0].date.getTime()).toBeGreaterThan(all[1].date.getTime());
    });
  });
});
