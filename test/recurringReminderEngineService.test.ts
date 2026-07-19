import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/prisma', () => ({ default: {} }));

import { createRecurringReminderEngineService } from '../src/services/recurringReminderEngine.service';

function makeDb(templates: any[], existingEvents: Map<string, any> = new Map()) {
  return {
    recurringTransactionTemplate: {
      findMany: vi.fn(async () => templates),
    },
    recurringReminderEvent: {
      upsert: vi.fn(async ({ where, create }: any) => {
        const key = JSON.stringify(where.templateId_occurrenceDate_offsetDays);
        const existing = existingEvents.get(key);
        if (existing) return existing;
        const created = { id: `evt-${existingEvents.size + 1}`, createdAt: new Date(), ...create };
        existingEvents.set(key, created);
        return created;
      }),
    },
  };
}

const template = {
  id: 'rec-1',
  userId: 'user-1',
  startDate: new Date('2026-01-15T00:00:00.000Z'),
  endDate: null,
  reminderOffsetDays: 3,
};

describe('recurring reminder engine', () => {
  it('creates a reminder event when the offset date matches the evaluation date', async () => {
    const db = makeDb([template]);
    const service = createRecurringReminderEngineService(db as any);

    // Next monthly occurrence on/after 2026-07-12 is 2026-07-15; offset 3 -> reminderDate 2026-07-12.
    const events = await service.evaluateReminders('2026-07-12');

    expect(events).toHaveLength(1);
    expect(db.recurringReminderEvent.upsert).toHaveBeenCalledTimes(1);
  });

  it('skips templates whose reminder date does not match the evaluation date', async () => {
    const db = makeDb([template]);
    const service = createRecurringReminderEngineService(db as any);

    const events = await service.evaluateReminders('2026-07-01');

    expect(events).toHaveLength(0);
    expect(db.recurringReminderEvent.upsert).not.toHaveBeenCalled();
  });

  it('is idempotent: evaluating the same date twice does not duplicate the event', async () => {
    const existingEvents = new Map();
    const db = makeDb([template], existingEvents);
    const service = createRecurringReminderEngineService(db as any);

    const first = await service.evaluateReminders('2026-07-12');
    const second = await service.evaluateReminders('2026-07-12');

    expect(first[0].id).toBe(second[0].id);
    expect(existingEvents.size).toBe(1);
  });

  it('skips templates with reminderOffsetDays null', async () => {
    const db = makeDb([{ ...template, reminderOffsetDays: null }]);
    const service = createRecurringReminderEngineService(db as any);

    const events = await service.evaluateReminders('2026-07-12');

    expect(events).toHaveLength(0);
  });

  it('skips templates whose recurrence has ended before the evaluation window', async () => {
    const db = makeDb([{ ...template, endDate: new Date('2026-02-15T00:00:00.000Z') }]);
    const service = createRecurringReminderEngineService(db as any);

    const events = await service.evaluateReminders('2026-07-12');

    expect(events).toHaveLength(0);
  });

  it('only queries active, reminder-enabled, monthly templates', async () => {
    const db = makeDb([]);
    const service = createRecurringReminderEngineService(db as any);

    await service.evaluateReminders('2026-07-12');

    expect(db.recurringTransactionTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true, reminderEnabled: true, frequency: 'MONTHLY' },
      })
    );
  });
});
