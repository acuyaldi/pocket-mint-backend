import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';

const h = vi.hoisted(() => {
  const prismaMock = {
    wallet: { findFirst: vi.fn(), findMany: vi.fn(), delete: vi.fn() },
    transaction: { count: vi.fn() },
  };
  return { prismaMock };
});

vi.mock('../src/lib/prisma', () => ({ default: h.prismaMock }));

import { deleteWallet } from '../src/controllers/account.controller';

const USER = 'user-1';

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as unknown as { auth: { userId: string; method: string } }).auth = { userId: USER, method: 'jwt' };
    next();
  });
  app.delete('/wallets/:id', deleteWallet);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.prismaMock.wallet.findMany.mockResolvedValue([]); // for the net-worth snapshot
  h.prismaMock.wallet.delete.mockResolvedValue({ id: 'w1', userId: USER });
});

describe('DELETE /wallets/:id — ledger integrity', () => {
  it('refuses to delete a wallet referenced by a transfer, even with force', async () => {
    h.prismaMock.wallet.findFirst.mockResolvedValue({ id: 'w1' });
    h.prismaMock.transaction.count.mockResolvedValueOnce(2); // transfer participation

    const res = await request(buildApp()).delete('/wallets/w1?force=true');

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(h.prismaMock.wallet.delete).not.toHaveBeenCalled();
  });

  it('force-deletes a wallet whose only history is income/expense', async () => {
    h.prismaMock.wallet.findFirst.mockResolvedValue({ id: 'w1' });
    h.prismaMock.transaction.count
      .mockResolvedValueOnce(0) // no transfers
      .mockResolvedValueOnce(5); // 5 income/expense rows

    const res = await request(buildApp()).delete('/wallets/w1?force=true');

    expect(res.status).toBe(200);
    expect(h.prismaMock.wallet.delete).toHaveBeenCalledWith({ where: { id: 'w1' } });
  });

  it('409s without force when the wallet has non-transfer history', async () => {
    h.prismaMock.wallet.findFirst.mockResolvedValue({ id: 'w1' });
    h.prismaMock.transaction.count.mockResolvedValueOnce(0).mockResolvedValueOnce(5);

    const res = await request(buildApp()).delete('/wallets/w1');

    expect(res.status).toBe(409);
    expect(h.prismaMock.wallet.delete).not.toHaveBeenCalled();
  });

  it('404s for a wallet the caller does not own, without counting transactions', async () => {
    h.prismaMock.wallet.findFirst.mockResolvedValue(null);

    const res = await request(buildApp()).delete('/wallets/w1');

    expect(res.status).toBe(404);
    expect(h.prismaMock.transaction.count).not.toHaveBeenCalled();
  });
});
