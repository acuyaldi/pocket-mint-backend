import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/prisma', () => ({ default: {} }));

import { createNotificationService } from '../src/services/notification.service';
import { NotificationError } from '../src/services/notification.errors';

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
