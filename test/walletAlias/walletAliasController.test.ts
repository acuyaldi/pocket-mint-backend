import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';

const USER = 'user-1';

const h = vi.hoisted(() => ({
  walletAliasService: {
    create: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('../../src/services/walletAlias.service', () => ({ walletAliasService: h.walletAliasService }));

import { WalletAliasController } from '../../src/controllers/walletAlias.controller';
import { WalletAliasError } from '../../src/services/walletAlias.errors';
import { errorHandler } from '../../src/middlewares/error.middleware';

function buildApp(injectUser = true): Express {
  const app = express();
  app.use(express.json());
  if (injectUser) {
    app.use((req, _res, next) => {
      (req as unknown as { auth: { userId: string } }).auth = { userId: USER };
      next();
    });
  }
  app.post('/wallets/:walletId/aliases', WalletAliasController.create);
  app.delete('/wallets/:walletId/aliases/:aliasId', WalletAliasController.remove);
  app.use(errorHandler);
  return app;
}

function makeAlias(over: Record<string, unknown> = {}) {
  return {
    id: 'alias-1',
    walletId: 'wallet-1',
    userId: USER,
    aliasDisplay: 'Rekening Utama',
    aliasNormalized: 'rekening utama',
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Wallet alias controller — authentication', () => {
  it.each([
    ['POST /wallets/:walletId/aliases', () => request(buildApp(false)).post('/wallets/wallet-1/aliases').send({ aliasDisplay: 'X' })],
    ['DELETE /wallets/:walletId/aliases/:aliasId', () => request(buildApp(false)).delete('/wallets/wallet-1/aliases/alias-1')],
  ])('%s: returns 401 when unauthenticated', async (_label, req) => {
    const res = await req();
    expect(res.status).toBe(401);
  });
});

describe('POST /wallets/:walletId/aliases', () => {
  it('creates an alias and returns its DTO', async () => {
    h.walletAliasService.create.mockResolvedValue(makeAlias());
    const res = await request(buildApp()).post('/wallets/wallet-1/aliases').send({ aliasDisplay: 'Rekening Utama' });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({
      id: 'alias-1',
      walletId: 'wallet-1',
      aliasDisplay: 'Rekening Utama',
      createdAt: '2026-07-01T00:00:00.000Z',
    });
    expect(h.walletAliasService.create).toHaveBeenCalledWith({
      userId: USER,
      walletId: 'wallet-1',
      aliasDisplay: 'Rekening Utama',
    });
  });

  it('forwards a typed CONFLICT error (namespace collision) safely', async () => {
    h.walletAliasService.create.mockRejectedValue(new WalletAliasError('taken', 409, 'CONFLICT'));
    const res = await request(buildApp()).post('/wallets/wallet-1/aliases').send({ aliasDisplay: 'X' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it("forwards NOT_FOUND for a wallet the caller doesn't own", async () => {
    h.walletAliasService.create.mockRejectedValue(new WalletAliasError('nf', 404, 'NOT_FOUND'));
    const res = await request(buildApp()).post('/wallets/wallet-1/aliases').send({ aliasDisplay: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /wallets/:walletId/aliases/:aliasId', () => {
  it('deletes an alias', async () => {
    h.walletAliasService.remove.mockResolvedValue(undefined);
    const res = await request(buildApp()).delete('/wallets/wallet-1/aliases/alias-1');
    expect(res.status).toBe(200);
    expect(h.walletAliasService.remove).toHaveBeenCalledWith({ userId: USER, walletId: 'wallet-1', aliasId: 'alias-1' });
  });

  it('forwards NOT_FOUND', async () => {
    h.walletAliasService.remove.mockRejectedValue(new WalletAliasError('nf', 404, 'NOT_FOUND'));
    const res = await request(buildApp()).delete('/wallets/wallet-1/aliases/alias-1');
    expect(res.status).toBe(404);
  });
});
