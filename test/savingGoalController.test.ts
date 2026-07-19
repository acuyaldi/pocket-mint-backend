import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const h = vi.hoisted(() => ({
  listSavingGoals: vi.fn(),
  getSavingGoal: vi.fn(),
  createSavingGoal: vi.fn(),
  updateSavingGoal: vi.fn(),
  updateSavingGoalProgress: vi.fn(),
  archiveSavingGoal: vi.fn(),
}));
vi.mock('../src/services/savingGoal.service', () => ({
  savingGoalService: h,
}));

import { SavingGoalController } from '../src/controllers/savingGoal.controller';
import { Prisma } from '../src/generated/prisma/client';

beforeEach(() => vi.clearAllMocks());

function app(authenticated = true) {
  const instance = express();
  instance.use(express.json());
  if (authenticated) {
    instance.use((req, _res, next) => {
      (req as unknown as { auth: { userId: string } }).auth = { userId: 'user-1' };
      next();
    });
  }
  instance.get('/saving-goals', SavingGoalController.getAll);
  instance.get('/saving-goals/:id', SavingGoalController.getOne);
  instance.post('/saving-goals', SavingGoalController.create);
  instance.patch('/saving-goals/:id', SavingGoalController.update);
  instance.patch('/saving-goals/:id/progress', SavingGoalController.updateProgress);
  instance.post('/saving-goals/:id/archive', SavingGoalController.archive);
  return instance;
}

function goal(overrides: Record<string, unknown> = {}) {
  return {
    id: 'goal-1',
    userId: 'user-1',
    name: 'Laptop Baru',
    targetAmount: new Prisma.Decimal(15000000),
    currentAmount: new Prisma.Decimal(2500000),
    targetDate: null,
    notes: 'Target laptop kerja',
    status: 'ACTIVE',
    createdAt: new Date('2026-07-01T00:00:00Z'),
    updatedAt: new Date('2026-07-01T00:00:00Z'),
    ...overrides,
  };
}

describe('saving goal controller', () => {
  it('lists goals for the authenticated user, serializing Decimal amounts and derived fields', async () => {
    h.listSavingGoals.mockResolvedValue([goal()]);

    const response = await request(app()).get('/saving-goals');

    expect(response.status).toBe(200);
    expect(h.listSavingGoals).toHaveBeenCalledWith('user-1');
    expect(response.body.data[0]).toMatchObject({
      id: 'goal-1',
      targetAmount: 15000000,
      currentAmount: 2500000,
      remainingAmount: 12500000,
    });
    expect(response.body.data[0].progressPercentage).toBeCloseTo((2500000 / 15000000) * 100, 2);
  });

  it('caps progressPercentage at 100 even when currentAmount exceeds targetAmount', async () => {
    h.listSavingGoals.mockResolvedValue([goal({ currentAmount: new Prisma.Decimal(20000000) })]);

    const response = await request(app()).get('/saving-goals');

    expect(response.body.data[0].progressPercentage).toBe(100);
    expect(response.body.data[0].remainingAmount).toBe(0);
  });

  it('rejects a missing authenticated identity on every route', async () => {
    const instance = app(false);
    expect((await request(instance).get('/saving-goals')).status).toBe(401);
    expect((await request(instance).get('/saving-goals/goal-1')).status).toBe(401);
    expect((await request(instance).post('/saving-goals').send({})).status).toBe(401);
    expect((await request(instance).patch('/saving-goals/goal-1').send({})).status).toBe(401);
    expect((await request(instance).patch('/saving-goals/goal-1/progress').send({})).status).toBe(401);
    expect((await request(instance).post('/saving-goals/goal-1/archive')).status).toBe(401);
    expect(h.createSavingGoal).not.toHaveBeenCalled();
    expect(h.updateSavingGoal).not.toHaveBeenCalled();
    expect(h.updateSavingGoalProgress).not.toHaveBeenCalled();
    expect(h.archiveSavingGoal).not.toHaveBeenCalled();
  });

  it('creates a goal from an allowlisted body', async () => {
    h.createSavingGoal.mockResolvedValue(goal());

    const response = await request(app())
      .post('/saving-goals')
      .send({
        name: 'Laptop Baru',
        targetAmount: 15000000,
        currentAmount: 0,
        targetDate: '2027-01-31',
        notes: 'Target laptop kerja',
        status: 'COMPLETED', // must be dropped — client cannot set status
        extraField: 'should be dropped',
      });

    expect(response.status).toBe(201);
    expect(h.createSavingGoal).toHaveBeenCalledWith({
      userId: 'user-1',
      name: 'Laptop Baru',
      targetAmount: 15000000,
      currentAmount: 0,
      targetDate: '2027-01-31',
      notes: 'Target laptop kerja',
    });
  });

  it('gets a single goal by id', async () => {
    h.getSavingGoal.mockResolvedValue(goal());
    const response = await request(app()).get('/saving-goals/goal-1');
    expect(response.status).toBe(200);
    expect(h.getSavingGoal).toHaveBeenCalledWith({ userId: 'user-1', id: 'goal-1' });
  });

  it('updates metadata by id from an allowlisted body', async () => {
    h.updateSavingGoal.mockResolvedValue(goal({ name: 'Laptop Kerja' }));

    const response = await request(app())
      .patch('/saving-goals/goal-1')
      .send({ name: 'Laptop Kerja', extraField: 'dropped' });

    expect(response.status).toBe(200);
    expect(h.updateSavingGoal).toHaveBeenCalledWith({
      userId: 'user-1',
      id: 'goal-1',
      name: 'Laptop Kerja',
      targetAmount: undefined,
      targetDate: undefined,
      notes: undefined,
    });
  });

  it('updates progress via the dedicated endpoint', async () => {
    h.updateSavingGoalProgress.mockResolvedValue(goal({ currentAmount: new Prisma.Decimal(10000000), status: 'COMPLETED' }));

    const response = await request(app())
      .patch('/saving-goals/goal-1/progress')
      .send({ currentAmount: 10000000 });

    expect(response.status).toBe(200);
    expect(h.updateSavingGoalProgress).toHaveBeenCalledWith({ userId: 'user-1', id: 'goal-1', currentAmount: 10000000 });
    expect(response.body.data.status).toBe('COMPLETED');
  });

  it('archives a goal by id', async () => {
    h.archiveSavingGoal.mockResolvedValue(goal({ status: 'ARCHIVED' }));

    const response = await request(app()).post('/saving-goals/goal-1/archive');

    expect(response.status).toBe(200);
    expect(h.archiveSavingGoal).toHaveBeenCalledWith({ userId: 'user-1', id: 'goal-1' });
    expect(response.body.data.status).toBe('ARCHIVED');
  });

  it('forwards a NOT_FOUND operational error from the service as a 404', async () => {
    const { SavingGoalError } = await import('../src/services/savingGoal.errors');
    h.getSavingGoal.mockRejectedValue(new SavingGoalError('Target tabungan tidak ditemukan', 404, 'NOT_FOUND'));

    const response = await request(app()).get('/saving-goals/missing');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('forwards a CONFLICT operational error when mutating an archived goal', async () => {
    const { SavingGoalError } = await import('../src/services/savingGoal.errors');
    h.updateSavingGoalProgress.mockRejectedValue(
      new SavingGoalError('Target tabungan yang diarsipkan tidak dapat diperbarui progresnya', 409, 'CONFLICT')
    );

    const response = await request(app()).patch('/saving-goals/goal-1/progress').send({ currentAmount: 100 });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONFLICT');
  });

  it('mounts the protected saving-goals router', () => {
    const route = readFileSync(join(process.cwd(), 'src', 'routes', 'savingGoal.routes.ts'), 'utf8');
    const index = readFileSync(join(process.cwd(), 'src', 'routes', 'index.ts'), 'utf8');
    expect(route).toContain("savingGoalRouter.get('/', requireUser, SavingGoalController.getAll)");
    expect(route).toContain("savingGoalRouter.post('/', requireUser, mutationLimiter, SavingGoalController.create)");
    expect(route).toContain("savingGoalRouter.patch('/:id/progress', requireUser, mutationLimiter, SavingGoalController.updateProgress)");
    expect(route).toContain("savingGoalRouter.post('/:id/archive', requireUser, mutationLimiter, SavingGoalController.archive)");
    expect(index).toContain("router.use('/v1/saving-goals', savingGoalRouter)");
  });
});
