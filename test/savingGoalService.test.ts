import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/prisma', () => ({ default: {} }));

import { createSavingGoalService } from '../src/services/savingGoal.service';
import { SavingGoalError } from '../src/services/savingGoal.errors';
import { Prisma } from '../src/generated/prisma/client';

function existingGoal(overrides: Record<string, unknown> = {}) {
  return {
    id: 'goal-1',
    userId: 'user-1',
    name: 'Laptop Baru',
    targetAmount: new Prisma.Decimal(10000000),
    currentAmount: new Prisma.Decimal(5000000),
    targetDate: null,
    notes: null,
    status: 'ACTIVE',
    ...overrides,
  };
}

function makeDb() {
  return {
    savingGoal: {
      findMany: vi.fn(async () => []),
      findFirst: vi.fn(async () => null),
      create: vi.fn(async ({ data }: any) => ({ id: 'goal-1', ...data })),
      update: vi.fn(async ({ data }: any) => ({ id: 'goal-1', ...data })),
    },
  };
}

const baseInput = {
  userId: 'user-1',
  name: 'Laptop Baru',
  targetAmount: 15000000,
};

describe('saving goal service', () => {
  it('lists goals scoped to the user', async () => {
    const db = makeDb();
    await createSavingGoalService(db as any).listSavingGoals('user-1');
    expect(db.savingGoal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } })
    );
  });

  it('creates a goal defaulting currentAmount to zero and status ACTIVE', async () => {
    const db = makeDb();
    const created = await createSavingGoalService(db as any).createSavingGoal(baseInput);
    expect(created).toMatchObject({ name: 'Laptop Baru', status: 'ACTIVE' });
    expect(created.currentAmount.toString()).toBe('0');
  });

  it('rejects a missing name', async () => {
    const db = makeDb();
    await expect(
      createSavingGoalService(db as any).createSavingGoal({ ...baseInput, name: '  ' })
    ).rejects.toThrow(SavingGoalError);
  });

  it('rejects a zero or negative targetAmount', async () => {
    const db = makeDb();
    await expect(
      createSavingGoalService(db as any).createSavingGoal({ ...baseInput, targetAmount: 0 })
    ).rejects.toThrow(SavingGoalError);
    await expect(
      createSavingGoalService(db as any).createSavingGoal({ ...baseInput, targetAmount: -1 })
    ).rejects.toThrow(SavingGoalError);
  });

  it('rejects a negative currentAmount', async () => {
    const db = makeDb();
    await expect(
      createSavingGoalService(db as any).createSavingGoal({ ...baseInput, currentAmount: -1 })
    ).rejects.toThrow(SavingGoalError);
  });

  it('creates a goal ACTIVE when currentAmount is below targetAmount', async () => {
    const db = makeDb();
    const created = await createSavingGoalService(db as any).createSavingGoal({
      ...baseInput,
      currentAmount: 5000000,
    });
    expect(created.status).toBe('ACTIVE');
  });

  it('creates a goal COMPLETED when currentAmount already meets targetAmount', async () => {
    const db = makeDb();
    const created = await createSavingGoalService(db as any).createSavingGoal({
      ...baseInput,
      currentAmount: 15000000,
    });
    expect(created.status).toBe('COMPLETED');
  });

  it('creates a goal COMPLETED when currentAmount exceeds targetAmount', async () => {
    const db = makeDb();
    const created = await createSavingGoalService(db as any).createSavingGoal({
      ...baseInput,
      currentAmount: 20000000,
    });
    expect(created.status).toBe('COMPLETED');
  });

  it('does not let the client set status directly on create', async () => {
    const db = makeDb();
    const created = await createSavingGoalService(db as any).createSavingGoal({
      ...baseInput,
      // @ts-expect-error status is not part of CreateSavingGoalInput
      status: 'ARCHIVED',
    });
    expect(created.status).toBe('ACTIVE');
  });

  describe('metadata update', () => {
    it('rejects updating a goal that does not belong to the user', async () => {
      const db = makeDb();
      await expect(
        createSavingGoalService(db as any).updateSavingGoal({ userId: 'user-1', id: 'goal-404', name: 'x' })
      ).rejects.toThrow(SavingGoalError);
    });

    it('recalculates status to COMPLETED when targetAmount is lowered below currentAmount', async () => {
      const db = makeDb();
      db.savingGoal.findFirst.mockResolvedValue(existingGoal() as any);

      const updated = await createSavingGoalService(db as any).updateSavingGoal({
        userId: 'user-1',
        id: 'goal-1',
        targetAmount: 4000000,
      });
      expect(updated.status).toBe('COMPLETED');
    });

    it('recalculates status back to ACTIVE when targetAmount is raised above currentAmount', async () => {
      const db = makeDb();
      db.savingGoal.findFirst.mockResolvedValue(
        existingGoal({ targetAmount: new Prisma.Decimal(4000000), status: 'COMPLETED' }) as any
      );

      const updated = await createSavingGoalService(db as any).updateSavingGoal({
        userId: 'user-1',
        id: 'goal-1',
        targetAmount: 10000000,
      });
      expect(updated.status).toBe('ACTIVE');
    });

    it('rejects updating an archived goal', async () => {
      const db = makeDb();
      db.savingGoal.findFirst.mockResolvedValue(existingGoal({ status: 'ARCHIVED' }) as any);
      await expect(
        createSavingGoalService(db as any).updateSavingGoal({ userId: 'user-1', id: 'goal-1', name: 'New name' })
      ).rejects.toThrow(SavingGoalError);
      expect(db.savingGoal.update).not.toHaveBeenCalled();
    });

    it('rejects clearing the name to blank', async () => {
      const db = makeDb();
      db.savingGoal.findFirst.mockResolvedValue(existingGoal() as any);
      await expect(
        createSavingGoalService(db as any).updateSavingGoal({ userId: 'user-1', id: 'goal-1', name: '   ' })
      ).rejects.toThrow(SavingGoalError);
    });
  });

  describe('progress update', () => {
    it('rejects updating progress on a goal that does not belong to the user', async () => {
      const db = makeDb();
      await expect(
        createSavingGoalService(db as any).updateSavingGoalProgress({ userId: 'user-1', id: 'goal-404', currentAmount: 100 })
      ).rejects.toThrow(SavingGoalError);
    });

    it('rejects a negative currentAmount', async () => {
      const db = makeDb();
      db.savingGoal.findFirst.mockResolvedValue(existingGoal({ currentAmount: new Prisma.Decimal(0) }) as any);
      await expect(
        createSavingGoalService(db as any).updateSavingGoalProgress({ userId: 'user-1', id: 'goal-1', currentAmount: -1 })
      ).rejects.toThrow(SavingGoalError);
    });

    it('updates progress and stays ACTIVE when below target', async () => {
      const db = makeDb();
      db.savingGoal.findFirst.mockResolvedValue(existingGoal({ currentAmount: new Prisma.Decimal(0) }) as any);
      const updated = await createSavingGoalService(db as any).updateSavingGoalProgress({
        userId: 'user-1',
        id: 'goal-1',
        currentAmount: 2500000,
      });
      expect(updated.status).toBe('ACTIVE');
      expect(updated.currentAmount.toString()).toBe('2500000');
    });

    it('completes a goal when currentAmount equals targetAmount', async () => {
      const db = makeDb();
      db.savingGoal.findFirst.mockResolvedValue(existingGoal() as any);
      const updated = await createSavingGoalService(db as any).updateSavingGoalProgress({
        userId: 'user-1',
        id: 'goal-1',
        currentAmount: 10000000,
      });
      expect(updated.status).toBe('COMPLETED');
    });

    it('stays COMPLETED when currentAmount exceeds targetAmount', async () => {
      const db = makeDb();
      db.savingGoal.findFirst.mockResolvedValue(
        existingGoal({ currentAmount: new Prisma.Decimal(10000000), status: 'COMPLETED' }) as any
      );
      const updated = await createSavingGoalService(db as any).updateSavingGoalProgress({
        userId: 'user-1',
        id: 'goal-1',
        currentAmount: 12000000,
      });
      expect(updated.status).toBe('COMPLETED');
    });

    it('rejects updating progress on an archived goal', async () => {
      const db = makeDb();
      db.savingGoal.findFirst.mockResolvedValue(existingGoal({ status: 'ARCHIVED' }) as any);
      await expect(
        createSavingGoalService(db as any).updateSavingGoalProgress({ userId: 'user-1', id: 'goal-1', currentAmount: 6000000 })
      ).rejects.toThrow(SavingGoalError);
      expect(db.savingGoal.update).not.toHaveBeenCalled();
    });
  });

  describe('archive', () => {
    it('archives a goal after an ownership check', async () => {
      const db = makeDb();
      db.savingGoal.findFirst.mockResolvedValue({ id: 'goal-1', userId: 'user-1', status: 'ACTIVE' } as any);
      const archived = await createSavingGoalService(db as any).archiveSavingGoal({ userId: 'user-1', id: 'goal-1' });
      expect(archived.status).toBe('ARCHIVED');
      expect(db.savingGoal.update).toHaveBeenCalledWith({ where: { id: 'goal-1' }, data: { status: 'ARCHIVED' } });
    });

    it('rejects archiving a goal that does not belong to the user', async () => {
      const db = makeDb();
      await expect(
        createSavingGoalService(db as any).archiveSavingGoal({ userId: 'user-1', id: 'goal-404' })
      ).rejects.toThrow(SavingGoalError);
    });

    it('rejects archiving an already-archived goal', async () => {
      const db = makeDb();
      db.savingGoal.findFirst.mockResolvedValue({ id: 'goal-1', userId: 'user-1', status: 'ARCHIVED' } as any);
      await expect(
        createSavingGoalService(db as any).archiveSavingGoal({ userId: 'user-1', id: 'goal-1' })
      ).rejects.toThrow(SavingGoalError);
      expect(db.savingGoal.update).not.toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('rejects fetching a goal that does not belong to the user', async () => {
      const db = makeDb();
      await expect(
        createSavingGoalService(db as any).getSavingGoal({ userId: 'user-1', id: 'goal-404' })
      ).rejects.toThrow(SavingGoalError);
    });

    it('returns an owned goal', async () => {
      const db = makeDb();
      db.savingGoal.findFirst.mockResolvedValue({ id: 'goal-1', userId: 'user-1', status: 'ACTIVE' } as any);
      const goal = await createSavingGoalService(db as any).getSavingGoal({ userId: 'user-1', id: 'goal-1' });
      expect(goal).toMatchObject({ id: 'goal-1' });
    });
  });
});
