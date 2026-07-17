import { describe, it, expect, afterAll } from 'vitest';
import { createPrismaResources } from '../src/lib/prismaFactory';

/**
 * Adapter-backed integration test against a DISPOSABLE PostgreSQL.
 *
 * Runs ONLY when TEST_DATABASE_URL points at a throwaway database whose schema
 * already matches prisma/schema.prisma (the runner applies migrations first).
 * It is skipped otherwise, so the normal unit suite never needs a database and
 * never opens a real connection. NEVER point this at Supabase — use a local /
 * disposable instance.
 */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

const resources = TEST_DATABASE_URL
  ? createPrismaResources(TEST_DATABASE_URL, { max: 2 })
  : undefined;

afterAll(async () => {
  await resources?.close();
});

describe.skipIf(!TEST_DATABASE_URL)('Prisma pg adapter (disposable PostgreSQL)', () => {
  // Lazily accessed: the describe callback still runs at collection time even
  // when skipped, so we must not dereference `resources` (undefined) here.
  const prisma = () => resources!.prisma;
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let userId: string;

  afterAll(async () => {
    // Cascades remove the wallets/transactions created below.
    if (userId) await prisma().user.delete({ where: { id: userId } }).catch(() => {});
  });

  it('connects and answers SELECT 1', async () => {
    const rows = await prisma().$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`;
    expect(rows[0].ok).toBe(1);
  });

  it('creates and reads a user', async () => {
    const user = await prisma().user.create({
      data: { email: `adapter-${suffix}@example.test`, name: 'Adapter Test' },
    });
    userId = user.id;

    const found = await prisma().user.findUnique({ where: { id: userId } });
    expect(found?.email).toBe(`adapter-${suffix}@example.test`);
  });

  it('creates and reads a wallet', async () => {
    const wallet = await prisma().wallet.create({
      data: { userId, name: 'Cash', type: 'CASH' },
    });
    const found = await prisma().wallet.findUnique({ where: { id: wallet.id } });
    expect(found?.name).toBe('Cash');
    expect(found?.userId).toBe(userId);
  });

  it('persists a TRANSFER transaction with toWalletId', async () => {
    const from = await prisma().wallet.create({
      data: { userId, name: 'From', type: 'BANK' },
    });
    const to = await prisma().wallet.create({
      data: { userId, name: 'To', type: 'E_WALLET' },
    });

    const tx = await prisma().transaction.create({
      data: {
        userId,
        walletId: from.id,
        toWalletId: to.id,
        type: 'TRANSFER',
        amount: '100.00',
        date: new Date(),
      },
    });

    const found = await prisma().transaction.findUnique({ where: { id: tx.id } });
    expect(found?.toWalletId).toBe(to.id);
    expect(Number(found?.amount)).toBe(100);
  });
});
