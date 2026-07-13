import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Shared mock handles, hoisted so the vi.mock factories below can reference them.
const h = vi.hoisted(() => ({
  poolEnd: vi.fn(async () => {}),
  prismaDisconnect: vi.fn(async () => {}),
  prismaClientCtor: vi.fn(),
  prismaPgCtor: vi.fn(),
  poolInstances: [] as any[],
}));

// Mock `pg` so no socket is ever opened; the fake Pool records its config and
// lets tests emit an 'error' event to exercise the error listener.
vi.mock('pg', () => ({
  // Regular functions (not arrows) so `new Pool(...)` is constructable.
  Pool: vi.fn(function (this: any, config: any) {
    const handlers: Record<string, (...a: any[]) => void> = {};
    const inst: any = {
      config,
      end: h.poolEnd,
      on(ev: string, cb: (...a: any[]) => void) {
        handlers[ev] = cb;
        return inst;
      },
      emit(ev: string, ...args: any[]) {
        handlers[ev]?.(...args);
      },
    };
    h.poolInstances.push(inst);
    return inst;
  }),
}));

vi.mock('@prisma/adapter-pg', () => ({
  PrismaPg: vi.fn(function (this: any, poolOrConfig: any, options: any) {
    h.prismaPgCtor(poolOrConfig, options);
    return { __adapter: true };
  }),
}));

vi.mock('../src/generated/prisma/client', () => ({
  PrismaClient: vi.fn(function (this: any, opts: any) {
    h.prismaClientCtor(opts);
    return { $disconnect: h.prismaDisconnect };
  }),
  Prisma: {},
}));

import { Pool } from 'pg';
import { createPrismaResources } from '../src/lib/prismaFactory';

const URL = 'postgresql://user:SUPERSECRET@db.example.com:5432/postgres';

beforeEach(() => {
  vi.clearAllMocks();
  h.poolInstances.length = 0;
  h.poolEnd.mockImplementation(async () => {});
  h.prismaDisconnect.mockImplementation(async () => {});
});

describe('createPrismaResources — construction', () => {
  it('creates the Pool with sanitized, pg-named options', () => {
    createPrismaResources(URL, { max: 7, idleTimeoutMs: 111, connectionTimeoutMs: 222 });

    expect(Pool).toHaveBeenCalledTimes(1);
    expect(Pool).toHaveBeenCalledWith({
      connectionString: URL,
      max: 7,
      idleTimeoutMillis: 111,
      connectionTimeoutMillis: 222,
    });
  });

  it('passes the constructed pool into the adapter and the adapter into PrismaClient', () => {
    createPrismaResources(URL);

    const poolInstance = h.poolInstances[0];
    expect(h.prismaPgCtor).toHaveBeenCalledWith(poolInstance, undefined);
    expect(h.prismaClientCtor).toHaveBeenCalledWith(
      expect.objectContaining({ adapter: expect.objectContaining({ __adapter: true }) }),
    );
  });

  it('forwards the log configuration to PrismaClient unchanged', () => {
    createPrismaResources(URL, {}, ['error']);
    expect(h.prismaClientCtor).toHaveBeenCalledWith(
      expect.objectContaining({ log: ['error'] }),
    );
  });
});

describe('createPrismaResources — missing / malformed input', () => {
  it('throws a clear, URL-free error when the database URL is missing', () => {
    expect(() => createPrismaResources(undefined)).toThrow(/DATABASE_URL is required/);
    expect(() => createPrismaResources('')).toThrow(/DATABASE_URL is required/);
    // No pool/client should have been constructed on the failure path.
    expect(Pool).not.toHaveBeenCalled();
    expect(h.prismaClientCtor).not.toHaveBeenCalled();
  });

  it('does not embed the connection string in the thrown error', () => {
    let message = '';
    try {
      createPrismaResources(undefined);
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).not.toContain('postgresql://');
    expect(message).not.toContain('SUPERSECRET');
  });
});

describe('createPrismaResources — close()', () => {
  it('is idempotent: disconnects Prisma and ends the pool exactly once', async () => {
    const { close } = createPrismaResources(URL);
    await close();
    await close();
    await close();

    expect(h.prismaDisconnect).toHaveBeenCalledTimes(1);
    expect(h.poolEnd).toHaveBeenCalledTimes(1);
  });

  it('swallows cleanup errors so shutdown always completes', async () => {
    h.prismaDisconnect.mockRejectedValueOnce(new Error('disconnect boom'));
    h.poolEnd.mockRejectedValueOnce(new Error('pool boom'));

    const { close } = createPrismaResources(URL);
    await expect(close()).resolves.toBeUndefined();
  });
});

describe('createPrismaResources — the connection string never leaks to logs', () => {
  let logs: string[];
  let spies: Array<ReturnType<typeof vi.spyOn>>;

  beforeEach(() => {
    logs = [];
    const capture = (...args: unknown[]) => {
      logs.push(args.map(String).join(' '));
    };
    spies = [
      vi.spyOn(console, 'log').mockImplementation(capture),
      vi.spyOn(console, 'warn').mockImplementation(capture),
      vi.spyOn(console, 'error').mockImplementation(capture),
    ];
  });

  afterEach(() => spies.forEach((s) => s.mockRestore()));

  it('never writes the URL when the pool errors or cleanup fails', async () => {
    h.prismaDisconnect.mockRejectedValueOnce(new Error('disconnect boom'));
    h.poolEnd.mockRejectedValueOnce(new Error('pool boom'));

    const { pool, close } = createPrismaResources(URL);
    // Simulate an async backend disconnect surfacing on the pool.
    (pool as any).emit('error', new Error('server closed the connection'));
    await close();

    const combined = logs.join('\n');
    expect(combined).toContain('postgres pool error');
    expect(combined).not.toContain('SUPERSECRET');
    expect(combined).not.toContain('postgresql://');
  });
});
