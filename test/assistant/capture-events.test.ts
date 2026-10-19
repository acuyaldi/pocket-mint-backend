import { describe, expect, it, vi } from 'vitest';
import { AssistantCaptureEventType, AssistantCaptureField } from '../../src/generated/prisma/client';
import { assertPrivacySafeRow } from './capture-privacy';
import {
  CAPTURE_PHASE_MARKER,
  CAPTURE_SCHEMA_VERSION,
  createCaptureEventEmitter,
  emitForResult,
  runWithCaptureSource,
  toCaptureEventRow,
  type CaptureEvent,
} from '../../src/assistant/capture-events';
import { validateAssistantPlan } from '../../src/assistant/provider-plan';
import { ToolRegistry } from '../../src/assistant/registry';
import { monthlySpendingSummary, transactionCreate } from '../../src/assistant/tools';
import { computeCaptureReport, INSUFFICIENT_DATA } from '../../src/domain/captureReport';
import { parseArgs } from '../../src/scripts/captureReport';

function capturingDb() {
  const rows: Record<string, unknown>[] = [];
  const db = {
    assistantCaptureEvent: {
      createMany: vi.fn(async ({ data }: { data: Record<string, unknown>[] }) => { rows.push(...data); return { count: data.length }; }),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
  };
  return { rows, db, emit: createCaptureEventEmitter(db as never) };
}

const ENTITY_ID = 'cmabc123draftid';
const allEvents: CaptureEvent[] = Object.values(AssistantCaptureEventType).map((type) => ({
  type,
  entityId: ENTITY_ID,
  ...(type === 'CLARIFICATION_REQUESTED' || type === 'DRAFT_EDITED' ? { fields: Object.values(AssistantCaptureField) } : {}),
  ...(type === 'CLARIFICATION_REQUESTED' || type === 'DRAFT_CREATED' ? { origin: 'AFTER_CLARIFICATION' as const } : {}),
}));

describe('capture events — phase marker', () => {
  it('Phase 38 rows are split from the phase-35.1 baseline', () => {
    expect(CAPTURE_PHASE_MARKER).toBe('phase-38');
    expect(toCaptureEventRow({ type: 'DRAFT_CREATED', entityId: ENTITY_ID }).phaseMarker).toBe('phase-38');
  });
});

describe('capture events — privacy', () => {
  it.each(allEvents)('$type payload carries only closed enums, constants, and a hashed key', (event) => {
    const row = toCaptureEventRow(event);
    assertPrivacySafeRow(row);
    expect(JSON.stringify(row)).not.toContain(ENTITY_ID);
    expect(row).toMatchObject({ schemaVersion: CAPTURE_SCHEMA_VERSION, phaseMarker: CAPTURE_PHASE_MARKER });
  });

  it.each([
    ['message text', { fields: ['kopi susu 25rb'] }],
    ['an amount', { origin: '25000' }],
    ['a raw id', { correlationKey: ENTITY_ID }],
    ['an extra column', { userId: 'user-1' }],
  ])('the privacy check rejects %s', (_label, injected) => {
    expect(() => assertPrivacySafeRow({ ...toCaptureEventRow(allEvents[0]!), ...injected })).toThrow();
  });
});

describe('capture events — emitter', () => {
  it.each(allEvents)('$type is emitted from both sources through the same emitter', async (event) => {
    const { rows, emit } = capturingDb();
    await emit(event);
    await runWithCaptureSource('TELEGRAM', () => emit(event));
    expect(rows.map((r) => r.source)).toEqual(['WEB', 'TELEGRAM']);
    expect(rows.map((r) => r.eventType)).toEqual([event.type, event.type]);
  });

  it('inserts with ON CONFLICT DO NOTHING so a retried emission is a no-op', async () => {
    const { db, emit } = capturingDb();
    await emit(allEvents[0]!);
    expect(db.assistantCaptureEvent.createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true }));
  });

  it('swallows a store failure and logs it instead of throwing', async () => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const emit = createCaptureEventEmitter({ assistantCaptureEvent: { createMany: async () => { throw new Error('db down'); } } } as never);
    await expect(emit(allEvents[0]!)).resolves.toBeUndefined();
    expect(log.mock.calls.flat().join(' ')).toContain('assistant.capture.persist_failed');
    log.mockRestore();
  });

  it('purges past-retention rows at most once per hour', async () => {
    let now = 1_000_000_000_000;
    const { db } = capturingDb();
    const emit = createCaptureEventEmitter(db as never, () => now);
    await emit(allEvents[0]!);
    await emit(allEvents[1]!);
    now += 60 * 60 * 1000;
    await emit(allEvents[2]!);
    expect(db.assistantCaptureEvent.deleteMany).toHaveBeenCalledTimes(2);
  });
});

describe('capture events — result mapping', () => {
  const run = async (result: Parameters<typeof emitForResult>[1], origin: 'DIRECT' | 'AFTER_CLARIFICATION' = 'DIRECT', resolved?: string) => {
    const emit = vi.fn(async () => undefined);
    await emitForResult(emit, result, origin, resolved);
    return emit.mock.calls.map((c) => c[0]);
  };

  it('a draft-ready response emits DRAFT_CREATED with its origin', async () => {
    expect(await run({ response: { status: 'success', turnId: 't', data: { draftId: 'd1', confirmationRequired: true } } }, 'AFTER_CLARIFICATION', 'c1')).toEqual([
      { type: 'CLARIFICATION_RESOLVED', entityId: 'c1' },
      { type: 'DRAFT_CREATED', entityId: 'd1', origin: 'AFTER_CLARIFICATION' },
    ]);
  });

  it('an entity clarification is keyed by clarification id, provider text by turn id', async () => {
    expect(await run({ captureField: 'SOURCE_WALLET', response: { status: 'clarification_required', turnId: 't', data: { clarification: { clarificationId: 'c2' } } } })).toEqual([
      { type: 'CLARIFICATION_REQUESTED', entityId: 'c2', fields: ['SOURCE_WALLET'], origin: 'DIRECT' },
    ]);
    expect(await run({ response: { status: 'clarification_required', turnId: 't3', data: { kind: 'provider_text' } } })).toEqual([
      { type: 'CLARIFICATION_REQUESTED', entityId: 't3', fields: ['UNSPECIFIED'], origin: 'DIRECT' },
    ]);
  });

  it('error/rejected results and non-draft successes emit nothing', async () => {
    expect(await run({ response: { status: 'error', turnId: 't' } }, 'AFTER_CLARIFICATION', 'c1')).toEqual([]);
    expect(await run({ response: { status: 'rejected', turnId: 't' } })).toEqual([]);
    expect(await run({ response: { status: 'success', turnId: 't', data: { totals: 1 } } })).toEqual([]);
  });

  it('deterministic provider clarifications carry their field', () => {
    const registry = new ToolRegistry();
    registry.register(monthlySpendingSummary);
    registry.register(transactionCreate);
    const plan = (args: Record<string, unknown>) => validateAssistantPlan({ kind: 'intent', intent: 'transaction.create', arguments: args, clarification: null, userMessage: '' }, registry);
    expect(plan({ amount: null, type: 'EXPENSE', walletReference: 'x' })).toMatchObject({ kind: 'clarification', field: 'AMOUNT' });
    expect(plan({ amount: '1', type: null, walletReference: 'x' })).toMatchObject({ kind: 'clarification', field: 'TYPE' });
    expect(plan({ amount: '1', type: 'EXPENSE', walletReference: null })).toMatchObject({ kind: 'clarification', field: 'WALLET' });
  });
});

describe('capture report (39.0)', () => {
  const at = new Date('2026-10-10T00:00:00Z');
  const row = (eventType: string, correlationKey: string, extra: Partial<{ source: string; origin: string; fields: string[]; occurredAt: Date }> = {}) =>
    ({ eventType, correlationKey, source: 'WEB', phaseMarker: 'phase-35.1', fields: [], origin: null, occurredAt: at, ...extra });
  const options = { from: new Date('2026-10-01T00:00:00Z'), to: new Date('2026-10-19T00:00:00Z'), now: new Date('2026-10-10T00:10:00Z'), minSamples: 1 };

  it('splits by source and phase marker, and marks small denominators INSUFFICIENT DATA', () => {
    const groups = computeCaptureReport([
      row('DRAFT_CREATED', 'a', { origin: 'DIRECT' }),
      row('DRAFT_CREATED', 'b', { origin: 'DIRECT', source: 'TELEGRAM' }),
      row('DRAFT_CREATED', 'c', { origin: 'DIRECT', phaseMarker: 'phase-38' } as never),
    ], { ...options, minSamples: 2 });
    expect(groups.map((g) => `${g.source}/${g.phaseMarker}`)).toEqual(['TELEGRAM/phase-35.1', 'WEB/phase-35.1', 'WEB/phase-38']);
    expect(groups[0]!.directDraftRate).toEqual({ value: INSUFFICIENT_DATA, numerator: 1, denominator: 1 });
  });

  it('a draft without a terminal event is open within TTL and abandoned past it', () => {
    const [g] = computeCaptureReport([
      row('DRAFT_CREATED', 'fresh', { origin: 'DIRECT', occurredAt: new Date('2026-10-10T00:05:00Z') }),
      row('DRAFT_CREATED', 'stale', { origin: 'DIRECT', occurredAt: new Date('2026-10-09T23:50:00Z') }),
    ], options);
    expect(g!.outcomes).toMatchObject({ open: 1, abandonedPastTtl: 1 });
  });

  it('parses the CLI window and rejects bad input', () => {
    const now = new Date('2026-10-19T00:00:00Z');
    expect(parseArgs([], now)).toMatchObject({ to: now, from: new Date('2026-09-19T00:00:00Z'), minSamples: 30, json: false });
    expect(parseArgs(['--from=2026-10-01', '--to=2026-10-08', '--min-samples=5', '--json'], now)).toMatchObject({ minSamples: 5, json: true });
    expect(() => parseArgs(['--from=nope'], now)).toThrow();
    expect(() => parseArgs(['--from=2026-10-09', '--to=2026-10-08'], now)).toThrow();
    expect(() => parseArgs(['--min-samples=0'], now)).toThrow();
  });
});
