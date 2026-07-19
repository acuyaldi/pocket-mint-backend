import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/prisma', () => ({ default: {} }));

import { createRecurringTransactionService } from '../src/services/recurringTransaction.service';
import { RecurringTransactionError } from '../src/services/recurringTransaction.errors';

function makeDb() {
  return {
    recurringTransactionTemplate: {
      findMany: vi.fn(async () => []),
      findFirst: vi.fn(async () => null),
      create: vi.fn(async ({ data }: any) => ({ id: 'rec-1', ...data })),
      update: vi.fn(async ({ data }: any) => ({ id: 'rec-1', ...data })),
      delete: vi.fn(async () => ({ id: 'rec-1' })),
    },
    wallet: {
      findFirst: vi.fn(async () => ({ id: 'wallet-1' })),
    },
    category: {
      findFirst: vi.fn(async () => ({ id: 'cat-1' })),
    },
  };
}

const baseInput = {
  userId: 'user-1',
  name: 'Netflix',
  walletId: 'wallet-1',
  type: 'EXPENSE' as const,
  amountMode: 'FIXED' as const,
  amount: 54000,
  frequency: 'MONTHLY' as const,
  startDate: '2026-08-01',
};

describe('recurring transaction service', () => {
  it('lists templates scoped to the user', async () => {
    const db = makeDb();
    await createRecurringTransactionService(db as any).listRecurringTransactions('user-1');
    expect(db.recurringTransactionTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } })
    );
  });

  it('creates a template after validating and checking wallet ownership', async () => {
    const db = makeDb();
    const created = await createRecurringTransactionService(db as any).createRecurringTransaction(baseInput);

    expect(db.wallet.findFirst).toHaveBeenCalledWith({ where: { id: 'wallet-1', userId: 'user-1' }, select: { id: true } });
    expect(created).toMatchObject({ name: 'Netflix', type: 'EXPENSE', amount: 54000 });
  });

  it('checks category ownership when categoryId is provided', async () => {
    const db = makeDb();
    await createRecurringTransactionService(db as any).createRecurringTransaction({ ...baseInput, categoryId: 'cat-1' });
    expect(db.category.findFirst).toHaveBeenCalledWith({ where: { id: 'cat-1', userId: 'user-1' }, select: { id: true } });
  });

  it('rejects a missing name', async () => {
    const db = makeDb();
    await expect(
      createRecurringTransactionService(db as any).createRecurringTransaction({ ...baseInput, name: '  ' })
    ).rejects.toThrow(RecurringTransactionError);
  });

  it('rejects TRANSFER as a type', async () => {
    const db = makeDb();
    await expect(
      createRecurringTransactionService(db as any).createRecurringTransaction({ ...baseInput, type: 'TRANSFER' as any })
    ).rejects.toThrow(RecurringTransactionError);
  });

  it('rejects a non-positive amount', async () => {
    const db = makeDb();
    await expect(
      createRecurringTransactionService(db as any).createRecurringTransaction({ ...baseInput, amount: 0 })
    ).rejects.toThrow(RecurringTransactionError);
  });

  it('rejects an invalid amountMode', async () => {
    const db = makeDb();
    await expect(
      createRecurringTransactionService(db as any).createRecurringTransaction({ ...baseInput, amountMode: 'VARIABLE' as any })
    ).rejects.toThrow(RecurringTransactionError);
  });

  it('rejects a FIXED template with no amount', async () => {
    const db = makeDb();
    await expect(
      createRecurringTransactionService(db as any).createRecurringTransaction({ ...baseInput, amount: undefined })
    ).rejects.toThrow(RecurringTransactionError);
  });

  it('creates a FLEXIBLE template with a null amount, ignoring any amount sent', async () => {
    const db = makeDb();
    const created = await createRecurringTransactionService(db as any).createRecurringTransaction({
      ...baseInput,
      amountMode: 'FLEXIBLE',
      amount: 54000,
    });
    expect(created).toMatchObject({ amountMode: 'FLEXIBLE', amount: null });
  });

  it('rejects an invalid frequency', async () => {
    const db = makeDb();
    await expect(
      createRecurringTransactionService(db as any).createRecurringTransaction({ ...baseInput, frequency: 'HOURLY' as any })
    ).rejects.toThrow(RecurringTransactionError);
  });

  it('rejects an endDate before startDate', async () => {
    const db = makeDb();
    await expect(
      createRecurringTransactionService(db as any).createRecurringTransaction({
        ...baseInput,
        startDate: '2026-08-10',
        endDate: '2026-08-01',
      })
    ).rejects.toThrow(RecurringTransactionError);
  });

  it('rejects a wallet not owned by the user', async () => {
    const db = makeDb();
    db.wallet.findFirst.mockResolvedValue(null as any);
    await expect(
      createRecurringTransactionService(db as any).createRecurringTransaction(baseInput)
    ).rejects.toThrow(RecurringTransactionError);
  });

  it('updates only the fields provided after an ownership check', async () => {
    const db = makeDb();
    db.recurringTransactionTemplate.findFirst.mockResolvedValue({
      id: 'rec-1',
      userId: 'user-1',
      amountMode: 'FIXED',
      amount: 54000,
      startDate: new Date('2026-08-01'),
      endDate: null,
    } as any);

    const updated = await createRecurringTransactionService(db as any).updateRecurringTransaction({
      userId: 'user-1',
      id: 'rec-1',
      isActive: false,
    });

    expect(db.recurringTransactionTemplate.findFirst).toHaveBeenCalledWith({ where: { id: 'rec-1', userId: 'user-1' } });
    expect(updated).toMatchObject({ isActive: false });
  });

  it('FIXED to FLEXIBLE update persists a null amount even if an amount is sent', async () => {
    const db = makeDb();
    db.recurringTransactionTemplate.findFirst.mockResolvedValue({
      id: 'rec-1',
      userId: 'user-1',
      amountMode: 'FIXED',
      amount: 54000,
      startDate: new Date('2026-08-01'),
      endDate: null,
    } as any);

    const updated = await createRecurringTransactionService(db as any).updateRecurringTransaction({
      userId: 'user-1',
      id: 'rec-1',
      amountMode: 'FLEXIBLE',
      amount: 99000,
    });

    expect(updated).toMatchObject({ amountMode: 'FLEXIBLE', amount: null });
  });

  it('FLEXIBLE to FIXED update requires a positive amount', async () => {
    const db = makeDb();
    db.recurringTransactionTemplate.findFirst.mockResolvedValue({
      id: 'rec-1',
      userId: 'user-1',
      amountMode: 'FLEXIBLE',
      amount: null,
      startDate: new Date('2026-08-01'),
      endDate: null,
    } as any);

    await expect(
      createRecurringTransactionService(db as any).updateRecurringTransaction({
        userId: 'user-1',
        id: 'rec-1',
        amountMode: 'FIXED',
      })
    ).rejects.toThrow(RecurringTransactionError);

    const updated = await createRecurringTransactionService(db as any).updateRecurringTransaction({
      userId: 'user-1',
      id: 'rec-1',
      amountMode: 'FIXED',
      amount: 75000,
    });
    expect(updated).toMatchObject({ amountMode: 'FIXED', amount: 75000 });
  });

  it('rejects updating a template that does not belong to the user', async () => {
    const db = makeDb();
    await expect(
      createRecurringTransactionService(db as any).updateRecurringTransaction({ userId: 'user-1', id: 'rec-404', isActive: false })
    ).rejects.toThrow(RecurringTransactionError);
  });

  it('deletes a template after an ownership check', async () => {
    const db = makeDb();
    db.recurringTransactionTemplate.findFirst.mockResolvedValue({ id: 'rec-1' } as any);

    const result = await createRecurringTransactionService(db as any).deleteRecurringTransaction({
      userId: 'user-1',
      id: 'rec-1',
    });

    expect(result).toEqual({ id: 'rec-1' });
    expect(db.recurringTransactionTemplate.delete).toHaveBeenCalledWith({ where: { id: 'rec-1' } });
  });

  it('rejects deleting a template that does not belong to the user', async () => {
    const db = makeDb();
    await expect(
      createRecurringTransactionService(db as any).deleteRecurringTransaction({ userId: 'user-1', id: 'rec-404' })
    ).rejects.toThrow(RecurringTransactionError);
  });
});
