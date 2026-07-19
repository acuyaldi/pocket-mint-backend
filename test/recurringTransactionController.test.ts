import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const h = vi.hoisted(() => ({
  listRecurringTransactions: vi.fn(),
  createRecurringTransaction: vi.fn(),
  updateRecurringTransaction: vi.fn(),
  deleteRecurringTransaction: vi.fn(),
}));
vi.mock('../src/services/recurringTransaction.service', () => ({
  recurringTransactionService: h,
}));

import { RecurringTransactionController } from '../src/controllers/recurringTransaction.controller';

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
  instance.get('/recurring-transactions', RecurringTransactionController.getAll);
  instance.post('/recurring-transactions', RecurringTransactionController.create);
  instance.put('/recurring-transactions/:id', RecurringTransactionController.update);
  instance.delete('/recurring-transactions/:id', RecurringTransactionController.delete);
  return instance;
}

const decimalLike = (value: number) => ({ toString: () => String(value) });

describe('recurring transaction controller', () => {
  it('lists templates for the authenticated user, serializing Decimal amounts', async () => {
    h.listRecurringTransactions.mockResolvedValue([
      { id: 'rec-1', name: 'Netflix', amount: decimalLike(54000) },
    ]);

    const response = await request(app()).get('/recurring-transactions');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([{ id: 'rec-1', name: 'Netflix', amount: 54000 }]);
    expect(h.listRecurringTransactions).toHaveBeenCalledWith('user-1');
  });

  it('passes through a null amount for FLEXIBLE templates without touching it', async () => {
    h.listRecurringTransactions.mockResolvedValue([
      { id: 'rec-2', name: 'Groceries', amountMode: 'FLEXIBLE', amount: null },
    ]);

    const response = await request(app()).get('/recurring-transactions');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([{ id: 'rec-2', name: 'Groceries', amountMode: 'FLEXIBLE', amount: null }]);
  });

  it('rejects a missing authenticated identity on every route', async () => {
    const instance = app(false);
    expect((await request(instance).get('/recurring-transactions')).status).toBe(401);
    expect((await request(instance).post('/recurring-transactions').send({})).status).toBe(401);
    expect((await request(instance).put('/recurring-transactions/rec-1').send({})).status).toBe(401);
    expect((await request(instance).delete('/recurring-transactions/rec-1')).status).toBe(401);
    expect(h.createRecurringTransaction).not.toHaveBeenCalled();
    expect(h.updateRecurringTransaction).not.toHaveBeenCalled();
    expect(h.deleteRecurringTransaction).not.toHaveBeenCalled();
  });

  it('creates a template from an allowlisted body', async () => {
    h.createRecurringTransaction.mockResolvedValue({ id: 'rec-1', name: 'Netflix', amount: decimalLike(54000) });

    const response = await request(app())
      .post('/recurring-transactions')
      .send({
        name: 'Netflix',
        walletId: 'wallet-1',
        type: 'EXPENSE',
        amountMode: 'FIXED',
        amount: 54000,
        frequency: 'MONTHLY',
        startDate: '2026-08-01',
        extraField: 'should be dropped',
      });

    expect(response.status).toBe(201);
    expect(h.createRecurringTransaction).toHaveBeenCalledWith({
      userId: 'user-1',
      name: 'Netflix',
      walletId: 'wallet-1',
      categoryId: undefined,
      type: 'EXPENSE',
      amountMode: 'FIXED',
      amount: 54000,
      description: undefined,
      frequency: 'MONTHLY',
      startDate: '2026-08-01',
      endDate: undefined,
    });
  });

  it('updates a template by id from an allowlisted body', async () => {
    h.updateRecurringTransaction.mockResolvedValue({ id: 'rec-1', name: 'Netflix', amount: decimalLike(60000) });

    const response = await request(app())
      .put('/recurring-transactions/rec-1')
      .send({ isActive: false });

    expect(response.status).toBe(200);
    expect(h.updateRecurringTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', id: 'rec-1', isActive: false })
    );
  });

  it('deletes a template by id', async () => {
    h.deleteRecurringTransaction.mockResolvedValue({ id: 'rec-1' });

    const response = await request(app()).delete('/recurring-transactions/rec-1');

    expect(response.status).toBe(200);
    expect(h.deleteRecurringTransaction).toHaveBeenCalledWith({ userId: 'user-1', id: 'rec-1' });
  });

  it('mounts the protected recurring-transactions router', () => {
    const route = readFileSync(join(process.cwd(), 'src', 'routes', 'recurringTransaction.routes.ts'), 'utf8');
    const index = readFileSync(join(process.cwd(), 'src', 'routes', 'index.ts'), 'utf8');
    expect(route).toContain("recurringTransactionRouter.get('/', requireUser, RecurringTransactionController.getAll)");
    expect(index).toContain("router.use('/v1/recurring-transactions', recurringTransactionRouter)");
  });
});
