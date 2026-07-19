import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';

vi.mock('../src/lib/prisma', () => ({ default: {} }));

const { evaluateReminders } = vi.hoisted(() => ({ evaluateReminders: vi.fn(async () => []) }));
vi.mock('../src/services/recurringReminderEngine.service', () => ({
  recurringReminderEngineService: { evaluateReminders },
}));

import { createNotificationService } from '../src/services/notification.service';
import { NotificationError } from '../src/services/notification.errors';

const D = (n: number | string) => new Prisma.Decimal(n);

const baseReminder = (overrides: Record<string, unknown> = {}) => ({
  id: 'evt-1',
  userId: 'user-1',
  templateId: 'rec-1',
  completedAt: null,
  generatedTransactionId: null,
  template: {
    id: 'rec-1',
    name: 'Netflix',
    type: 'EXPENSE',
    amountMode: 'FIXED',
    amount: D(150000),
    walletId: 'wallet-1',
    categoryId: 'cat-1',
  },
  ...overrides,
});

/**
 * Fake Prisma for confirmReminder. `$transaction` buffers the wallet write and
 * only commits it if the callback resolves — a mid-transaction throw (e.g. the
 * duplicate-confirm guard) leaves the buffer empty, proving atomic rollback.
 */
function makeConfirmDb(reminder: ReturnType<typeof baseReminder> | null, opts: { updateManyCount?: number } = {}) {
  const committed: { id: string; delta: number }[] = [];
  const transactionCreates: Record<string, unknown>[] = [];

  const makeTx = (buffer: { id: string; delta: number }[]) => ({
    transaction: {
      create: vi.fn(async ({ data }: any) => {
        transactionCreates.push(data);
        return { id: 'tx-new', ...data, wallet: { id: data.walletId, name: 'Dompet', type: 'CASH' }, category: null };
      }),
    },
    wallet: {
      update: vi.fn(async ({ where, data }: any) => {
        const inc = data.balance.increment;
        const dec = data.balance.decrement;
        const delta = inc !== undefined ? Number(inc.toString()) : -Number(dec.toString());
        buffer.push({ id: where.id, delta });
      }),
    },
    recurringReminderEvent: {
      updateMany: vi.fn(async () => ({ count: opts.updateManyCount ?? 1 })),
      findUniqueOrThrow: vi.fn(async () => ({ ...reminder, completedAt: new Date(), generatedTransactionId: 'tx-new' })),
    },
  });

  const db = {
    recurringReminderEvent: {
      findFirst: vi.fn(async () => reminder),
    },
    wallet: {
      findFirst: vi.fn(async ({ where }: any) => (where.id === 'wallet-1' ? { id: 'wallet-1', userId: 'user-1' } : null)),
    },
    category: {
      findFirst: vi.fn(async ({ where }: any) => (where.id === 'cat-1' ? { id: 'cat-1', userId: 'user-1' } : null)),
    },
    $transaction: vi.fn(async (cb: (tx: any) => Promise<unknown>) => {
      const buffer: { id: string; delta: number }[] = [];
      const result = await cb(makeTx(buffer));
      committed.push(...buffer);
      return result;
    }),
  };

  return { db, committed, transactionCreates };
}

function makeDb() {
  return {
    recurringReminderEvent: {
      findMany: vi.fn(async () => []),
      findFirst: vi.fn(async () => null),
      findUniqueOrThrow: vi.fn(async ({ where }: any) => ({
        id: where.id,
        userId: 'user-1',
        readAt: new Date('2026-07-01'),
        template: { id: 'rec-1', name: 'Netflix' },
      })),
      update: vi.fn(async ({ where, data }: any) => ({
        id: where.id,
        userId: 'user-1',
        readAt: data.readAt,
        template: { id: 'rec-1', name: 'Netflix' },
      })),
      updateMany: vi.fn(async () => ({ count: 3 })),
    },
  };
}

describe('notification service', () => {
  it('lists notifications scoped to the user, newest reminder first', async () => {
    const db = makeDb();
    await createNotificationService(db as any).listNotifications('user-1');
    expect(db.recurringReminderEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' }, orderBy: { reminderDate: 'desc' } })
    );
  });

  it('refreshes notifications by evaluating reminders for the authenticated user only, then re-lists', async () => {
    const db = makeDb();
    evaluateReminders.mockClear();

    await createNotificationService(db as any).refreshNotifications('user-1');

    expect(evaluateReminders).toHaveBeenCalledTimes(1);
    expect(evaluateReminders).toHaveBeenCalledWith(expect.any(String), 'user-1');
    expect(db.recurringReminderEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } })
    );
  });

  it('marks an unread notification as read', async () => {
    const db = makeDb();
    db.recurringReminderEvent.findFirst.mockResolvedValue({
      id: 'evt-1',
      userId: 'user-1',
      readAt: null,
    } as any);

    const result = await createNotificationService(db as any).markNotificationRead({ userId: 'user-1', id: 'evt-1' });

    expect(db.recurringReminderEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'evt-1' }, data: { readAt: expect.any(Date) } })
    );
    expect(result.readAt).toBeInstanceOf(Date);
  });

  it('is idempotent: marking an already-read notification does not re-update it', async () => {
    const db = makeDb();
    db.recurringReminderEvent.findFirst.mockResolvedValue({
      id: 'evt-1',
      userId: 'user-1',
      readAt: new Date('2026-07-01'),
    } as any);

    await createNotificationService(db as any).markNotificationRead({ userId: 'user-1', id: 'evt-1' });

    expect(db.recurringReminderEvent.update).not.toHaveBeenCalled();
  });

  it('rejects marking a notification that does not belong to the user', async () => {
    const db = makeDb();
    await expect(
      createNotificationService(db as any).markNotificationRead({ userId: 'user-1', id: 'evt-404' })
    ).rejects.toThrow(NotificationError);
  });

  it('marks all unread notifications as read for the user', async () => {
    const db = makeDb();
    const result = await createNotificationService(db as any).markAllNotificationsRead('user-1');

    expect(db.recurringReminderEvent.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', readAt: null },
      data: { readAt: expect.any(Date) },
    });
    expect(result).toEqual({ count: 3 });
  });
});

describe('notification service — confirmReminder', () => {
  it('confirms a FIXED reminder, using the template amount and debiting the wallet once', async () => {
    const { db, committed, transactionCreates } = makeConfirmDb(baseReminder());

    const result = await createNotificationService(db as any).confirmReminder({ userId: 'user-1', id: 'evt-1' });

    expect(transactionCreates[0]).toMatchObject({
      userId: 'user-1',
      walletId: 'wallet-1',
      categoryId: 'cat-1',
      type: 'EXPENSE',
      description: 'Netflix',
    });
    expect(transactionCreates[0].amount.toString()).toBe('150000');
    expect(committed).toEqual([{ id: 'wallet-1', delta: -150000 }]);
    expect(result.notification.completedAt).toBeInstanceOf(Date);
    expect(result.notification.generatedTransactionId).toBe('tx-new');
    expect(result.transaction.id).toBe('tx-new');
  });

  it('confirms a FLEXIBLE reminder using the caller-supplied amount', async () => {
    const reminder = baseReminder({
      template: { id: 'rec-1', name: 'Freelance', type: 'INCOME', amountMode: 'FLEXIBLE', amount: null, walletId: 'wallet-1', categoryId: 'cat-1' },
    });
    const { db, committed, transactionCreates } = makeConfirmDb(reminder);

    await createNotificationService(db as any).confirmReminder({ userId: 'user-1', id: 'evt-1', amount: 250000 });

    expect(transactionCreates[0].amount.toString()).toBe('250000');
    expect(committed).toEqual([{ id: 'wallet-1', delta: 250000 }]);
  });

  it('rejects a FLEXIBLE reminder confirmed without an amount', async () => {
    const reminder = baseReminder({
      template: { id: 'rec-1', name: 'Freelance', type: 'INCOME', amountMode: 'FLEXIBLE', amount: null, walletId: 'wallet-1', categoryId: 'cat-1' },
    });
    const { db } = makeConfirmDb(reminder);

    await expect(
      createNotificationService(db as any).confirmReminder({ userId: 'user-1', id: 'evt-1' })
    ).rejects.toMatchObject({ code: 'INVALID_AMOUNT' });
  });

  it('rejects confirming a reminder that does not belong to the caller (or does not exist)', async () => {
    const { db } = makeConfirmDb(null);

    await expect(
      createNotificationService(db as any).confirmReminder({ userId: 'user-1', id: 'evt-404' })
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('rejects a reminder whose recurring template no longer exists', async () => {
    const { db } = makeConfirmDb(baseReminder({ template: null }));

    await expect(
      createNotificationService(db as any).confirmReminder({ userId: 'user-1', id: 'evt-1' })
    ).rejects.toMatchObject({ code: 'TEMPLATE_NOT_FOUND' });
  });

  it('rejects a reminder whose wallet no longer belongs to the caller', async () => {
    const { db } = makeConfirmDb(baseReminder({ template: { ...baseReminder().template, walletId: 'wallet-gone' } }));

    await expect(
      createNotificationService(db as any).confirmReminder({ userId: 'user-1', id: 'evt-1' })
    ).rejects.toMatchObject({ code: 'WALLET_NOT_FOUND' });
  });

  it('rejects a reminder whose category was deleted', async () => {
    const { db } = makeConfirmDb(baseReminder({ template: { ...baseReminder().template, categoryId: 'cat-gone' } }));

    await expect(
      createNotificationService(db as any).confirmReminder({ userId: 'user-1', id: 'evt-1' })
    ).rejects.toMatchObject({ code: 'CATEGORY_NOT_FOUND' });
  });

  it('rejects an already-completed reminder without touching the wallet', async () => {
    const { db, committed } = makeConfirmDb(baseReminder({ completedAt: new Date('2026-07-01'), generatedTransactionId: 'tx-old' }));

    await expect(
      createNotificationService(db as any).confirmReminder({ userId: 'user-1', id: 'evt-1' })
    ).rejects.toMatchObject({ statusCode: 409, code: 'ALREADY_PROCESSED' });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(committed).toEqual([]);
  });

  it('rolls back the transaction and wallet write when a concurrent confirm wins the race', async () => {
    const { db, committed } = makeConfirmDb(baseReminder(), { updateManyCount: 0 });

    await expect(
      createNotificationService(db as any).confirmReminder({ userId: 'user-1', id: 'evt-1' })
    ).rejects.toMatchObject({ statusCode: 409, code: 'ALREADY_PROCESSED' });
    // The wallet.update was called inside the transaction callback, but since the
    // callback threw, $transaction never commits it into the buffer — no drift.
    expect(committed).toEqual([]);
  });
});
