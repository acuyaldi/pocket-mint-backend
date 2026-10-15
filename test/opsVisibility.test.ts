import { describe, it, expect } from 'vitest';
import {
  toSafeInboundJobRow,
  toSafeOutboundDeliveryRow,
  toSafeAssistantTurnRow,
  summarizeByErrorCategory,
  isAmbiguousExecution,
} from '../src/domain/opsVisibility';

describe('toSafeInboundJobRow — redaction', () => {
  it('keeps only the allowlisted fields, even when the row carries sensitive extras', () => {
    const row = {
      id: 'job1',
      provider: 'TELEGRAM',
      status: 'FAILED_TERMINAL',
      attempt: 3,
      errorCategory: 'ambiguous_assistant_execution',
      assistantTurnId: 'turn1',
      createdAt: new Date('2026-09-01'),
      completedAt: new Date('2026-09-02'),
      // sensitive fields that must never survive projection
      text: 'transfer 500000 to my brother',
      externalSenderId: 'tg-user-123',
      externalChatId: 'tg-chat-456',
      callbackQueryId: 'cbq-789',
      callbackMessageId: 'msg-999',
    };

    const safe = toSafeInboundJobRow(row);

    expect(safe).toEqual({
      id: 'job1',
      provider: 'TELEGRAM',
      status: 'FAILED_TERMINAL',
      attempt: 3,
      errorCategory: 'ambiguous_assistant_execution',
      assistantTurnId: 'turn1',
      createdAt: row.createdAt,
      completedAt: row.completedAt,
    });
    expect(Object.keys(safe)).not.toContain('text');
    expect(Object.keys(safe)).not.toContain('externalSenderId');
    expect(Object.keys(safe)).not.toContain('externalChatId');
    expect(Object.keys(safe)).not.toContain('callbackQueryId');
  });
});

describe('toSafeOutboundDeliveryRow — redaction', () => {
  it('keeps only the allowlisted fields, dropping rendered content and reply markup', () => {
    const row = {
      id: 'del1',
      inboundJobId: 'job1',
      provider: 'TELEGRAM',
      status: 'FAILED_TERMINAL',
      attempt: 2,
      errorCategory: 'provider_unavailable',
      createdAt: new Date('2026-09-01'),
      sentAt: null,
      renderedText: 'Your balance is Rp 5.000.000',
      replyMarkup: { inline_keyboard: [[{ text: 'Confirm', callback_data: 'secret-token' }]] },
      destinationChatId: 'tg-chat-456',
      providerMessageId: 'tg-msg-1',
    };

    const safe = toSafeOutboundDeliveryRow(row);

    expect(safe).toEqual({
      id: 'del1',
      inboundJobId: 'job1',
      provider: 'TELEGRAM',
      status: 'FAILED_TERMINAL',
      attempt: 2,
      errorCategory: 'provider_unavailable',
      createdAt: row.createdAt,
      sentAt: null,
    });
    expect(Object.keys(safe)).not.toContain('renderedText');
    expect(Object.keys(safe)).not.toContain('replyMarkup');
    expect(Object.keys(safe)).not.toContain('destinationChatId');
  });
});

describe('toSafeAssistantTurnRow — redaction', () => {
  it('keeps only the allowlisted fields', () => {
    const row = {
      id: 'turn1',
      conversationId: 'conv1',
      correlationId: 'corr1',
      intent: 'transaction.create',
      status: 'RUNNING',
      startedAt: new Date('2026-09-01'),
      safeErrorCode: null,
      locale: 'id-ID',
    };

    const safe = toSafeAssistantTurnRow(row);

    expect(safe).toEqual({
      id: 'turn1',
      conversationId: 'conv1',
      correlationId: 'corr1',
      intent: 'transaction.create',
      status: 'RUNNING',
      startedAt: row.startedAt,
    });
    expect(Object.keys(safe)).not.toContain('locale');
  });
});

describe('isAmbiguousExecution', () => {
  it('flags both ambiguous categories', () => {
    expect(isAmbiguousExecution({ errorCategory: 'ambiguous_assistant_execution' })).toBe(true);
    expect(isAmbiguousExecution({ errorCategory: 'ambiguous_callback_execution' })).toBe(true);
  });

  it('does not flag other categories or null', () => {
    expect(isAmbiguousExecution({ errorCategory: 'provider_unavailable' })).toBe(false);
    expect(isAmbiguousExecution({ errorCategory: null })).toBe(false);
  });
});

describe('summarizeByErrorCategory', () => {
  it('counts rows per category and buckets null as (none)', () => {
    const counts = summarizeByErrorCategory([
      { errorCategory: 'ambiguous_assistant_execution' },
      { errorCategory: 'ambiguous_assistant_execution' },
      { errorCategory: 'provider_unavailable' },
      { errorCategory: null },
    ]);

    expect(counts).toEqual({
      ambiguous_assistant_execution: 2,
      provider_unavailable: 1,
      '(none)': 1,
    });
  });

  it('returns an empty object for no rows', () => {
    expect(summarizeByErrorCategory([])).toEqual({});
  });
});
