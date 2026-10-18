import { describe, it, expect, vi } from 'vitest';
import { withPrismaErrorTranslation, withPrismaErrorSwallowed } from '../src/utils/prismaErrors';

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

  it('swallows a mapped P2002 the same way', async () => {
    const onSwallow = vi.fn();
    const result = await withPrismaErrorSwallowed(
      async () => { throw prismaError('P2002'); },
      { P2002: onSwallow },
    );
    expect(result).toBeUndefined();
    expect(onSwallow).toHaveBeenCalledTimes(1);
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
