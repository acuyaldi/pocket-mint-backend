import { describe, it, expect, vi } from 'vitest';
import type { Response, NextFunction } from 'express';
import { forwardError, isOperationalError } from '../src/http/forwardError';
import { TransactionError } from '../src/services/transaction.errors';
import { WalletError } from '../src/services/wallet.errors';

/** Minimal Response double capturing the status + json payload. */
function fakeRes() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return { res: { status } as unknown as Response, status, json };
}

describe('isOperationalError', () => {
  it('recognizes the domain error classes', () => {
    expect(isOperationalError(new TransactionError('nope', 404, 'TRANSACTION_NOT_FOUND'))).toBe(true);
    expect(isOperationalError(new WalletError('nope', 409, 'CONFLICT'))).toBe(true);
  });

  it('recognizes any error following the operational shape (structural, not nominal)', () => {
    const e = Object.assign(new Error('forbidden'), { isOperational: true, statusCode: 403, code: 'FORBIDDEN' });
    expect(isOperationalError(e)).toBe(true);
  });

  it('rejects a plain Error and non-error values', () => {
    expect(isOperationalError(new Error('boom'))).toBe(false);
    expect(isOperationalError({ isOperational: true, statusCode: 400, code: 'X' })).toBe(false); // not an Error
    expect(isOperationalError(undefined)).toBe(false);
  });
});

describe('forwardError', () => {
  it('renders an operational error through the standard envelope with exact status/code/message', () => {
    const { res, status, json } = fakeRes();
    const next = vi.fn() as unknown as NextFunction;

    forwardError(new TransactionError('Transaction with id t1 not found', 404, 'TRANSACTION_NOT_FOUND'), res, next);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'TRANSACTION_NOT_FOUND', statusCode: 404, message: 'Transaction with id t1 not found' },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('passes an unexpected error to next() without touching the response', () => {
    const { res, status } = fakeRes();
    const next = vi.fn() as unknown as NextFunction;
    const boom = new Error('db exploded');

    forwardError(boom, res, next);

    expect(status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(boom);
  });
});
