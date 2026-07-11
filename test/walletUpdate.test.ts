import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { Prisma } from '../src/generated/prisma/client';

const D = (n: number | string) => new Prisma.Decimal(n);

const h = vi.hoisted(() => {
  const prismaMock = {
    wallet: { findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  };
  return { prismaMock };
});

vi.mock('../src/lib/prisma', () => ({ default: h.prismaMock }));

import { updateWallet } from '../src/controllers/account.controller';

const USER = 'user-1';

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as unknown as { userId: string }).userId = USER;
    next();
  });
  app.put('/wallets/:id', updateWallet);
  return app;
}

/** The `data` object passed to the single wallet.update call, if any. */
function updateData() {
  const call = h.prismaMock.wallet.update.mock.calls[0];
  return call ? (call[0] as { data: Record<string, unknown> }).data : undefined;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.prismaMock.wallet.findMany.mockResolvedValue([]); // for the net-worth snapshot
  h.prismaMock.wallet.update.mockResolvedValue({ id: 'w1', userId: USER, name: 'x', balance: D(1000) });
});

describe('PUT /wallets/:id — ledger boundary', () => {
  it('updates non-financial metadata without touching balance', async () => {
    h.prismaMock.wallet.findFirst.mockResolvedValue({ id: 'w1', balance: D(1000) });

    const res = await request(buildApp()).put('/wallets/w1').send({ name: 'Dompet', color: '#fff' });

    expect(res.status).toBe(200);
    expect(h.prismaMock.wallet.update).toHaveBeenCalledTimes(1);
    expect(updateData()).toMatchObject({ name: 'Dompet', color: '#fff' });
    expect(updateData()).not.toHaveProperty('balance');
  });

  it('rejects a direct balance overwrite and mutates nothing', async () => {
    h.prismaMock.wallet.findFirst.mockResolvedValue({ id: 'w1', balance: D(1000) });

    const res = await request(buildApp()).put('/wallets/w1').send({ balance: 5000 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BALANCE_UPDATE_NOT_ALLOWED');
    expect(h.prismaMock.wallet.update).not.toHaveBeenCalled();
  });

  it('still updates metadata sent alongside an unchanged balance echo (balance never written)', async () => {
    h.prismaMock.wallet.findFirst.mockResolvedValue({ id: 'w1', balance: D(1000) });

    const res = await request(buildApp()).put('/wallets/w1').send({ name: 'Echo', balance: 1000 });

    expect(res.status).toBe(200);
    expect(updateData()).toMatchObject({ name: 'Echo' });
    expect(updateData()).not.toHaveProperty('balance');
  });

  it('rejects a malformed balance payload without mutating', async () => {
    h.prismaMock.wallet.findFirst.mockResolvedValue({ id: 'w1', balance: D(1000) });

    const res = await request(buildApp()).put('/wallets/w1').send({ balance: 'not-a-number' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_AMOUNT');
    expect(h.prismaMock.wallet.update).not.toHaveBeenCalled();
  });

  it('404s for a wallet the caller does not own, without updating', async () => {
    h.prismaMock.wallet.findFirst.mockResolvedValue(null);

    const res = await request(buildApp()).put('/wallets/w1').send({ balance: 5000 });

    expect(res.status).toBe(404);
    expect(h.prismaMock.wallet.update).not.toHaveBeenCalled();
  });
});
