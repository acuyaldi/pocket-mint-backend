import { describe, it, expect } from 'vitest';
import {
  canMarkReviewed,
  canRequeueOutbound,
  canReconcileStaleTurn,
  buildMarkReviewedUpdate,
  buildRequeueOutboundUpdate,
  buildReconcileTurnUpdate,
} from '../src/domain/opsRemediation';

describe('canMarkReviewed — safety gate', () => {
  it('allows a terminal job with an ambiguous errorCategory', () => {
    expect(canMarkReviewed({ status: 'FAILED_TERMINAL', errorCategory: 'ambiguous_assistant_execution' })).toBe(true);
    expect(canMarkReviewed({ status: 'FAILED_TERMINAL', errorCategory: 'ambiguous_callback_execution' })).toBe(true);
  });

  it('rejects a non-terminal job even if ambiguous', () => {
    expect(canMarkReviewed({ status: 'PENDING', errorCategory: 'ambiguous_assistant_execution' })).toBe(false);
    expect(canMarkReviewed({ status: 'PROCESSING', errorCategory: 'ambiguous_assistant_execution' })).toBe(false);
  });

  it('rejects a terminal job that is not ambiguous', () => {
    expect(canMarkReviewed({ status: 'FAILED_TERMINAL', errorCategory: 'validation' })).toBe(false);
    expect(canMarkReviewed({ status: 'FAILED_TERMINAL', errorCategory: null })).toBe(false);
  });
});

describe('canRequeueOutbound — safety gate', () => {
  it('allows only FAILED_TERMINAL deliveries', () => {
    expect(canRequeueOutbound({ status: 'FAILED_TERMINAL' })).toBe(true);
    expect(canRequeueOutbound({ status: 'PENDING' })).toBe(false);
    expect(canRequeueOutbound({ status: 'SENDING' })).toBe(false);
    expect(canRequeueOutbound({ status: 'SENT' })).toBe(false);
  });
});

describe('canReconcileStaleTurn — safety gate', () => {
  const thresholdMs = 5 * 60 * 1000;
  const now = new Date('2026-09-17T00:10:00Z');

  it('allows a RUNNING turn started past the threshold', () => {
    const turn = { status: 'RUNNING', startedAt: new Date('2026-09-17T00:00:00Z') };
    expect(canReconcileStaleTurn(turn, now, thresholdMs)).toBe(true);
  });

  it('rejects a RUNNING turn still within the threshold', () => {
    const turn = { status: 'RUNNING', startedAt: new Date('2026-09-17T00:09:00Z') };
    expect(canReconcileStaleTurn(turn, now, thresholdMs)).toBe(false);
  });

  it('rejects a turn that is not RUNNING, regardless of age', () => {
    const turn = { status: 'SUCCEEDED', startedAt: new Date('2026-09-17T00:00:00Z') };
    expect(canReconcileStaleTurn(turn, now, thresholdMs)).toBe(false);
  });
});

describe('buildMarkReviewedUpdate — cannot cause reprocessing', () => {
  it('writes only reviewedAt/reviewedBy/reviewNote', () => {
    const update = buildMarkReviewedUpdate('alice', 'checked drafts, no duplicate', new Date('2026-09-17T00:00:00Z'));
    expect(update).toEqual({
      reviewedAt: new Date('2026-09-17T00:00:00Z'),
      reviewedBy: 'alice',
      reviewNote: 'checked drafts, no duplicate',
    });
  });

  it('never includes a field that would let the job be reclaimed/reprocessed', () => {
    const update = buildMarkReviewedUpdate('alice', 'note');
    const keys = Object.keys(update);
    expect(keys).not.toContain('status');
    expect(keys).not.toContain('attempt');
    expect(keys).not.toContain('availableAt');
    expect(keys).not.toContain('errorCategory');
    expect(keys).not.toContain('text');
  });
});

describe('buildRequeueOutboundUpdate — cannot touch Assistant or domain state', () => {
  it('matches the runbook §8.1 SQL precedent exactly', () => {
    const now = new Date('2026-09-17T00:00:00Z');
    const update = buildRequeueOutboundUpdate(now);
    expect(update).toEqual({
      status: 'PENDING',
      availableAt: now,
      attempt: 0,
      errorCategory: null,
      leaseOwner: null,
      leaseExpiresAt: null,
    });
  });

  it('never references rendered content, reply markup, or the originating inbound job', () => {
    const keys = Object.keys(buildRequeueOutboundUpdate());
    expect(keys).not.toContain('renderedText');
    expect(keys).not.toContain('replyMarkup');
    expect(keys).not.toContain('inboundJobId');
  });
});

describe('buildReconcileTurnUpdate — cannot create a draft/transaction', () => {
  it('writes only status/safeErrorCode/finishedAt', () => {
    const now = new Date('2026-09-17T00:00:00Z');
    expect(buildReconcileTurnUpdate(now)).toEqual({
      status: 'FAILED',
      safeErrorCode: 'operator_reconciled_stale_turn',
      finishedAt: now,
    });
  });

  it('never references a draft, idempotency record, or transaction field', () => {
    const keys = Object.keys(buildReconcileTurnUpdate());
    expect(keys).not.toContain('financialDrafts');
    expect(keys).not.toContain('transactionId');
    expect(keys).not.toContain('idempotencyRecords');
  });
});
