import { describe, it, expect, vi } from 'vitest';
import { withPrismaErrorTranslation, withPrismaErrorSwallowed, isTransactionTimeout, transactionTimeoutCause } from '../src/utils/prismaErrors';

class FakeDomainError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly isOperational = true;
  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, FakeDomainError.prototype);
  }
}

function prismaError(code: string): Error & { code: string } {
  const err = new Error(`simulated ${code}`) as Error & { code: string };
  err.code = code;
  return err;
}

describe('withPrismaErrorTranslation', () => {
  it('returns the resolved value untouched on success', async () => {
    await expect(withPrismaErrorTranslation(async () => 'ok', {})).resolves.toBe('ok');
  });

  it('translates a mapped P2025 into the caller-supplied error', async () => {
    const err = await withPrismaErrorTranslation(
      async () => { throw prismaError('P2025'); },
      { P2025: () => new FakeDomainError('not found', 404, 'NOT_FOUND') },
    ).catch((e) => e);
    expect(err).toBeInstanceOf(FakeDomainError);
    expect(err).toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('translates a mapped P2002 into the caller-supplied error', async () => {
    const err = await withPrismaErrorTranslation(
      async () => { throw prismaError('P2002'); },
      { P2002: () => new FakeDomainError('conflict', 409, 'CONFLICT') },
    ).catch((e) => e);
    expect(err).toBeInstanceOf(FakeDomainError);
    expect(err).toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });

  it('propagates a Prisma code with no entry in the mapping unchanged', async () => {
    const raw = prismaError('P2003');
    const err = await withPrismaErrorTranslation(
      async () => { throw raw; },
      { P2025: () => new FakeDomainError('not found', 404, 'NOT_FOUND') },
    ).catch((e) => e);
    expect(err).toBe(raw);
  });

  it('propagates a mapped code with no factory supplied unchanged', async () => {
    const raw = prismaError('P2025');
    const err = await withPrismaErrorTranslation(async () => { throw raw; }, {}).catch((e) => e);
    expect(err).toBe(raw);
  });

  it('propagates a non-Prisma error unchanged', async () => {
    const raw = new TypeError('boom');
    const err = await withPrismaErrorTranslation(
      async () => { throw raw; },
      { P2025: () => new FakeDomainError('not found', 404, 'NOT_FOUND') },
    ).catch((e) => e);
    expect(err).toBe(raw);
  });

  it('passes an already-operational error through unchanged, never re-wrapping it', async () => {
    const already = new FakeDomainError('already typed', 409, 'ALREADY_ARCHIVED');
    const err = await withPrismaErrorTranslation(
      async () => { throw already; },
      { P2025: () => new FakeDomainError('not found', 404, 'NOT_FOUND') },
    ).catch((e) => e);
    expect(err).toBe(already);
  });
});

describe('withPrismaErrorSwallowed', () => {
  it('returns the resolved value untouched on success', async () => {
    await expect(withPrismaErrorSwallowed(async () => 'ok', {})).resolves.toBe('ok');
  });

  it('swallows a mapped P2025, runs the side effect, and resolves to undefined', async () => {
    const onSwallow = vi.fn();
    const result = await withPrismaErrorSwallowed(
      async () => { throw prismaError('P2025'); },
      { P2025: onSwallow },
    );
    expect(result).toBeUndefined();
    expect(onSwallow).toHaveBeenCalledTimes(1);
  });

  // Phase 37.4 security review: deliberately P2025-only. P2002 means a
  // concurrent write already happened — swallowing it without reading back
  // what that write was risks an idempotency/replay bypass, so it must
  // always propagate here (a caller that genuinely needs to react to a
  // concurrent insert uses withPrismaErrorTranslation or its own explicit
  // read-and-verify instead).
  it('never swallows P2002, even if a (type-unsafe) caller forces a P2002 handler in', async () => {
    const raw = prismaError('P2002');
    const onSwallow = vi.fn();
    // `swallow` is typed to only accept P2025 — this cast simulates a
    // caller bypassing that (e.g. via `as never`) to prove the RUNTIME
    // guard itself (not just the type) refuses to swallow anything but
    // P2025, in case the type is ever weakened later.
    const unsafeSwallow = { P2025: onSwallow, P2002: onSwallow } as unknown as Parameters<typeof withPrismaErrorSwallowed>[1];
    const err = await withPrismaErrorSwallowed(
      async () => { throw raw; },
      unsafeSwallow,
    ).catch((e) => e);
    expect(err).toBe(raw);
    expect(onSwallow).not.toHaveBeenCalled();
  });

  it('propagates a mapped code with no swallow handler supplied unchanged', async () => {
    const raw = prismaError('P2025');
    const err = await withPrismaErrorSwallowed(async () => { throw raw; }, {}).catch((e) => e);
    expect(err).toBe(raw);
  });

  it('propagates an already-operational error unchanged, never swallowing it', async () => {
    const already = new FakeDomainError('already typed', 409, 'ALREADY_ARCHIVED');
    const onSwallow = vi.fn();
    const err = await withPrismaErrorSwallowed(
      async () => { throw already; },
      { P2025: onSwallow },
    ).catch((e) => e);
    expect(err).toBe(already);
    expect(onSwallow).not.toHaveBeenCalled();
  });

  it('propagates a non-Prisma error unchanged', async () => {
    const raw = new TypeError('boom');
    const err = await withPrismaErrorSwallowed(
      async () => { throw raw; },
      { P2025: vi.fn() },
    ).catch((e) => e);
    expect(err).toBe(raw);
  });
});

// Phase 38.2
describe('P2003 translation and P2028 cause', () => {
  it('translates a mapped P2003 (parent row deleted before the insert)', async () => {
    const err = await withPrismaErrorTranslation(
      async () => { throw prismaError('P2003'); },
      { P2003: () => new FakeDomainError('gone', 404, 'NOT_FOUND') },
    ).catch((e) => e);
    expect(err).toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('classifies maxWait vs timeout and logs only the cause, never the message', () => {
    const maxWait = Object.assign(new Error('Transaction API error: Unable to start a transaction in the given time.'), { code: 'P2028' });
    const timeout = Object.assign(new Error('A commit cannot be executed on an expired transaction. The timeout for this transaction was 5000 ms'), { code: 'P2028' });
    expect(transactionTimeoutCause(maxWait)).toBe('maxWait');
    expect(transactionTimeoutCause(timeout)).toBe('timeout');
    expect(transactionTimeoutCause(new Error('other'))).toBe('unknown');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(isTransactionTimeout(timeout, 'clarification.select')).toBe(true);
    expect(isTransactionTimeout(prismaError('P2025'), 'clarification.select')).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const logged = warnSpy.mock.calls[0]![0] as string;
    expect(JSON.parse(logged)).toMatchObject({ event: 'assistant.transaction_timeout', stage: 'clarification.select', timeoutCause: 'timeout' });
    expect(logged).not.toContain('expired transaction');
    warnSpy.mockRestore();
  });
});
