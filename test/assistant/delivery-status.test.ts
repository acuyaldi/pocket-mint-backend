import { describe, it, expect } from 'vitest';
import { DELIVERY_STATUS_MAP } from '../../src/assistant/conversation.service';

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
