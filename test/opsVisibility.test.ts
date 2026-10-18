import { describe, it, expect } from 'vitest';
import {
  toSafeInboundJobRow,
  toSafeOutboundDeliveryRow,
  toSafeAssistantTurnRow,
  toSafeFinancialDraftRow,
  toSafeClarificationRequestRow,
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

describe('toSafeFinancialDraftRow — redaction (Phase 37.3)', () => {
  it('keeps only the allowlisted fields, dropping amount/wallet/category/description', () => {
    const row = {
      id: 'draft1',
      userId: 'user1',
      conversationId: 'conv1',
      operation: 'transaction.create',
      transactionType: 'EXPENSE',
      status: 'FAILED',
      createdAt: new Date('2026-09-01'),
      expiresAt: new Date('2026-09-01T00:15:00Z'),
      failedAt: new Date('2026-09-01T00:10:00Z'),
      amount: '500000',
      walletId: 'wallet1',
      categoryId: 'cat1',
      description: 'transfer to my brother',
    };

    const safe = toSafeFinancialDraftRow(row);

    expect(safe).toEqual({
      id: 'draft1',
      userId: 'user1',
      conversationId: 'conv1',
      operation: 'transaction.create',
      transactionType: 'EXPENSE',
      status: 'FAILED',
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      failedAt: row.failedAt,
    });
    expect(Object.keys(safe)).not.toContain('amount');
    expect(Object.keys(safe)).not.toContain('walletId');
    expect(Object.keys(safe)).not.toContain('categoryId');
    expect(Object.keys(safe)).not.toContain('description');
  });
});

describe('toSafeClarificationRequestRow — redaction (Phase 37.3)', () => {
  it('keeps only the allowlisted fields, dropping prompt/trustedContext', () => {
    const row = {
      id: 'clar1',
      userId: 'user1',
      conversationId: 'conv1',
      entityType: 'wallet',
      status: 'PENDING',
      createdAt: new Date('2026-09-01'),
      expiresAt: new Date('2026-09-01T00:15:00Z'),
      prompt: 'Which wallet did you mean: BCA or Mandiri?',
      trustedContext: { version: 1, operation: 'transaction.create', type: 'EXPENSE', amount: '500000' },
    };

    const safe = toSafeClarificationRequestRow(row);

    expect(safe).toEqual({
      id: 'clar1',
      userId: 'user1',
      conversationId: 'conv1',
      entityType: 'wallet',
      status: 'PENDING',
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
    });
    expect(Object.keys(safe)).not.toContain('prompt');
    expect(Object.keys(safe)).not.toContain('trustedContext');
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
