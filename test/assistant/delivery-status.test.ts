import { describe, it, expect } from 'vitest';
import { DELIVERY_STATUS_MAP, resolveDeliveryStatus } from '../../src/assistant/conversation.service';

describe('DELIVERY_STATUS_MAP — Phase 31 channel delivery status mapping', () => {
  it('maps every internal ChannelDeliveryStatus to a safe AssistantDeliveryStatus', () => {
    expect(DELIVERY_STATUS_MAP).toEqual({
      PENDING: 'PENDING',
      SENDING: 'PROCESSING',
      SENT: 'DELIVERED',
      FAILED_RETRYABLE: 'PROCESSING',
      FAILED_TERMINAL: 'FAILED',
    });
  });

  it('treats a retry still in backoff as still-in-progress, not failed', () => {
    // FAILED_RETRYABLE means the outbound worker will attempt again — showing
    // "failed" to the user here would be misleading since it may yet succeed.
    expect(DELIVERY_STATUS_MAP.FAILED_RETRYABLE).toBe('PROCESSING');
  });

  it('only ever produces one of the five closed safe values', () => {
    const allowed = new Set(['NOT_APPLICABLE', 'PENDING', 'PROCESSING', 'DELIVERED', 'FAILED']);
    for (const value of Object.values(DELIVERY_STATUS_MAP)) expect(allowed.has(value)).toBe(true);
  });
});

describe('resolveDeliveryStatus — Phase 32 turn-level delivery status', () => {
  it('is NOT_APPLICABLE for a WEB turn regardless of any mapped status', () => {
    expect(resolveDeliveryStatus('WEB', undefined)).toBe('NOT_APPLICABLE');
    expect(resolveDeliveryStatus('WEB', 'DELIVERED')).toBe('NOT_APPLICABLE');
  });

  it('passes through the mapped status for a TELEGRAM turn with a retained delivery row', () => {
    for (const status of ['PENDING', 'PROCESSING', 'DELIVERED', 'FAILED'] as const) {
      expect(resolveDeliveryStatus('TELEGRAM', status)).toBe(status);
    }
  });

  it('is UNKNOWN — not omitted, not a guess — for a TELEGRAM turn with no retained delivery row', () => {
    expect(resolveDeliveryStatus('TELEGRAM', undefined)).toBe('UNKNOWN');
  });

  it('only ever produces one of the six closed safe values', () => {
    const allowed = new Set(['NOT_APPLICABLE', 'PENDING', 'PROCESSING', 'DELIVERED', 'FAILED', 'UNKNOWN']);
    const inputs: Array<Parameters<typeof resolveDeliveryStatus>> = [
      ['WEB', undefined], ['TELEGRAM', undefined], ['TELEGRAM', 'PENDING'], ['TELEGRAM', 'PROCESSING'],
      ['TELEGRAM', 'DELIVERED'], ['TELEGRAM', 'FAILED'],
    ];
    for (const args of inputs) expect(allowed.has(resolveDeliveryStatus(...args))).toBe(true);
  });
});
