import { describe, expect, it } from 'vitest';
import { effectiveClarificationStatus, effectiveDraftStatus } from '../../src/assistant/effective-status';

const now = new Date('2026-10-19T10:00:00.000Z');
const past = new Date('2026-10-19T09:59:59.999Z');
const future = new Date('2026-10-19T10:00:00.001Z');

describe('effective lifecycle status (Phase 38.1)', () => {
  it('draft: only a past-TTL PENDING_CONFIRMATION is normalized to EXPIRED (expiresAt == now counts as expired)', () => {
    expect(effectiveDraftStatus({ status: 'PENDING_CONFIRMATION', expiresAt: past }, now)).toBe('EXPIRED');
    expect(effectiveDraftStatus({ status: 'PENDING_CONFIRMATION', expiresAt: now }, now)).toBe('EXPIRED');
    expect(effectiveDraftStatus({ status: 'PENDING_CONFIRMATION', expiresAt: future }, now)).toBe('PENDING_CONFIRMATION');
    for (const status of ['COMMITTED', 'CANCELLED', 'FAILED', 'EXPIRED']) {
      expect(effectiveDraftStatus({ status, expiresAt: past }, now)).toBe(status);
    }
  });

  it('clarification: a past-TTL PENDING is STALE+expired, exactly what the lazy write stores; terminal rows are untouched', () => {
    expect(effectiveClarificationStatus({ status: 'PENDING', terminalCode: null, expiresAt: now }, now)).toEqual({ status: 'STALE', terminalCode: 'expired' });
    expect(effectiveClarificationStatus({ status: 'PENDING', terminalCode: null, expiresAt: future }, now)).toEqual({ status: 'PENDING', terminalCode: null });
    expect(effectiveClarificationStatus({ status: 'CANCELLED', terminalCode: 'user_cancelled', expiresAt: past }, now)).toEqual({ status: 'CANCELLED', terminalCode: 'user_cancelled' });
  });
});
