// ============================================================
// Phase 35.1 — persisted capture events (disposable PostgreSQL).
// The same message → clarification → draft → confirm/cancel journey is
// driven once over Web HTTP (controllers) and once through the real Telegram
// inbound worker (webhook ingest → processJob → inline-keyboard callbacks),
// and both must persist an identical taxonomy, differing only in `source`.
// ============================================================
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createHash } from 'node:crypto';
import { createPrismaResources } from '../../src/lib/prismaFactory';
import { assertTestDatabaseUrl } from '../../src/lib/assertTestDatabaseUrl';
import { createAssistantConversationService } from '../../src/assistant/conversation.service';
import { createAssistantContextService } from '../../src/assistant/context.service';
import { createAssistantApplicationService } from '../../src/assistant/application.service';
import { createAssistantFinancialDraftService } from '../../src/assistant/financial-draft.service';
import { createClarificationService } from '../../src/assistant/clarification.service';
import { createAssistantProviderRuntime } from '../../src/assistant/provider-runtime';
import { createCaptureEventEmitter, type CaptureEventEmitter } from '../../src/assistant/capture-events';
import { createTransactionService } from '../../src/services/transaction.service';
import { createAssistantControllers } from '../../src/controllers/assistant.controller';
import { correlationMiddleware } from '../../src/http/correlation';
import { errorHandler } from '../../src/middlewares/error.middleware';
import { ToolRegistry } from '../../src/assistant/registry';
import { monthlySpendingSummary, transactionCreate } from '../../src/assistant/tools';
import {
  EntityResolverRegistry,
  createEntityResolutionService,
  createWalletResolver,
  createMerchantResolver,
  createCategoryResolver,
} from '../../src/assistant/entity-resolution';
import { createChannelLinkTokenService } from '../../src/channels/linkToken.service';
import { createChannelConnectionService } from '../../src/channels/connection.service';
import { createTelegramService } from '../../src/telegram/telegram.service';
import { processJob, type InboundWorkerDeps } from '../../src/channels/workers/inbound.worker';
import { claimInboundJobs } from '../../src/channels/workers/claim';
import { buildCaptureReport, formatReport } from '../../src/scripts/captureReport';
import { assertPrivacySafeRow } from './capture-privacy';

const url = process.env.TEST_DATABASE_URL;
if (url) assertTestDatabaseUrl(url);
const resources = url ? createPrismaResources(url, { max: 12 }) : undefined;
const users: string[] = [];
afterAll(() => resources?.close());
afterEach(async () => { if (resources && users.length) await resources.prisma.user.deleteMany({ where: { id: { in: users.splice(0) } } }); });

const sha = (id: string) => createHash('sha256').update(id).digest('hex');

describe.skipIf(!url)('Assistant capture events (disposable PostgreSQL)', () => {
  const db = () => resources!.prisma;
  // Capture rows deliberately have no user FK, so isolate tests by clearing the table.
  beforeEach(async () => { await db().assistantCaptureEvent.deleteMany(); });

  async function fixture(label: string) {
    const user = await db().user.create({ data: { email: `${label}-${Date.now()}-${Math.random()}@test.local`, name: label } });
    users.push(user.id);
    const debit = await db().wallet.create({ data: { userId: user.id, name: 'BCA Debit', type: 'BANK', balance: 500000 } });
    const payroll = await db().wallet.create({ data: { userId: user.id, name: 'BCA Payroll', type: 'BANK', balance: 1000000 } });
    const gopay = await db().wallet.create({ data: { userId: user.id, name: 'GoPay', type: 'E_WALLET', balance: 100000 } });
    const category = await db().category.create({ data: { userId: user.id, name: 'Lainnya', type: 'EXPENSE', icon: 'other', color: '#000000' } });
    return { user, debit, payroll, gopay, category };
  }

  const plan = (args: Record<string, unknown>) => {
    const output = { kind: 'intent', intent: 'transaction.create', arguments: { type: 'EXPENSE', description: 'kopi susu', ...args }, clarification: null, userMessage: '' };
    return { output, outputBytes: Buffer.byteLength(JSON.stringify(output)), finishClassification: 'STOP' as const, usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } };
  };
  /** The scripted journey both channels replay: ambiguous wallet → select → confirm; exact wallet → cancel; missing amount. */
  const journeyPlans = () => [
    plan({ amount: '25000', walletReference: 'BCA' }),
    plan({ amount: '10000', walletReference: 'BCA Debit' }),
    plan({ amount: null, walletReference: 'BCA Debit' }),
  ];

  function buildServices(captureEvents: CaptureEventEmitter = createCaptureEventEmitter(db()), plans = journeyPlans()) {
    const conversations = createAssistantConversationService(db());
    const drafts = createAssistantFinancialDraftService(db(), createTransactionService(db()), undefined, undefined, captureEvents);
    const registry = new ToolRegistry();
    registry.register(monthlySpendingSummary);
    registry.register(transactionCreate);
    const resolvers = new EntityResolverRegistry();
    resolvers.register(createWalletResolver(db()));
    resolvers.register(createMerchantResolver(db()));
    resolvers.register(createCategoryResolver(db()));
    resolvers.finalize();
    const application = createAssistantApplicationService({
      conversations, contexts: createAssistantContextService(db()), toolRegistry: registry, handlerRegistry: new Map(),
      financialDrafts: drafts, entityResolution: createEntityResolutionService(resolvers), clarification: createClarificationService(db()),
      captureEvents,
    });
    const runtime = createAssistantProviderRuntime({
      application, conversations, financialDrafts: drafts,
      provider: { kind: 'gemini', model: 'test', generateStructuredResponse: vi.fn(async () => plans.shift()!) } as never,
      audit: { begin: async () => 'audit', finalize: async () => undefined },
      toolRegistry: registry, timeoutMs: 5000, captureEvents,
    });
    const controllers = createAssistantControllers(application, conversations, drafts, runtime);
    const server = express();
    server.use(express.json());
    server.use(correlationMiddleware);
    server.use((req, _res, next) => { (req as any).auth = { userId: req.header('x-test-user') }; next(); });
    server.post('/messages', controllers.messages);
    server.post('/execute', controllers.execute);
    server.post('/conversations/:conversationId/clarifications/:clarificationId/select', controllers.selectClarification);
    server.post('/drafts/:draftId/confirm', controllers.confirmDraft);
    server.post('/drafts/:draftId/cancel', controllers.cancelDraft);
    server.use(errorHandler);
    return { server, drafts, application, runtime };
  }

  const envelope = (res: request.Response) => (res.body.success ? res.body.data : res.body.error);

  /** Persisted taxonomy without source/time/key: what both channels must agree on. */
  async function taxonomy() {
    const rows = await db().assistantCaptureEvent.findMany({ orderBy: { occurredAt: 'asc' } });
    return rows.map((r) => `${r.eventType}|${r.fields.join(',')}|${r.origin ?? ''}`).sort();
  }

  async function webJourney() {
    const { user } = await fixture('web');
    const { server } = buildServices();
    const as = (r: request.Test) => r.set('x-test-user', user.id);

    const first = envelope(await as(request(server).post('/messages')).send({ message: 'kopi susu 25rb pakai BCA' }));
    expect(first.status).toBe('clarification_required');
    const clar = first.data.clarification;
    const selected = envelope(await as(request(server).post(`/conversations/${first.conversationId}/clarifications/${clar.clarificationId}/select`)).send({ optionToken: clar.options[0].token }));
    expect(selected.status).toBe('success');
    const confirm = await as(request(server).post(`/drafts/${selected.data.draftId}/confirm`)).set('Idempotency-Key', `web-${user.id}`).send();
    expect(confirm.status).toBe(200);

    const direct = envelope(await as(request(server).post('/messages')).send({ message: 'kopi susu 10rb pakai BCA Debit', conversationId: first.conversationId }));
    expect(direct.data.confirmationRequired).toBe(true);
    expect((await as(request(server).post(`/drafts/${direct.data.draftId}/cancel`)).send()).status).toBe(200);

    const missing = envelope(await as(request(server).post('/messages')).send({ message: 'kopi susu pakai BCA Debit', conversationId: first.conversationId }));
    expect(missing.status).toBe('clarification_required');
    return { user, draftIds: [selected.data.draftId, direct.data.draftId] };
  }

  // ---- Telegram harness: the real webhook → worker → callback path ----------------
  let updateId = Date.now() * 1000;
  const fakeClient = { answerCallbackQuery: async () => ({ ok: true as const }), sendMessage: async () => ({ ok: true as const }), editMessageReplyMarkup: async () => ({ ok: true as const }) };

  async function telegramJourney() {
    const { user } = await fixture('tg');
    const { runtime } = buildServices();
    const externalId = `tg-${user.id}`;
    const linkTokens = createChannelLinkTokenService(db());
    const connections = createChannelConnectionService(db());
    const { token } = await linkTokens.createLinkToken(user.id, 'TELEGRAM');
    await linkTokens.consumeLinkToken(token, 'TELEGRAM', externalId, `chat-${externalId}`);
    const telegram = createTelegramService({ db: db(), connections, client: fakeClient as never });
    const deps: InboundWorkerDeps = {
      db: db(), connections, linkTokens, assistantProviderRuntime: runtime,
      config: { workersEnabled: true, inboundPollMs: 1, outboundPollMs: 1, batchSize: 10, leaseMs: 5000, maxAttemptsInbound: 5, maxAttemptsOutbound: 5, retentionDays: 7 },
      owner: 'capture-test',
    };
    const work = async () => {
      for (const job of await claimInboundJobs(db(), { batchSize: 10, leaseMs: 5000, owner: 'capture-test' })) await processJob(deps, job, `corr-${job.id}`);
    };
    /** Sends an update, runs the worker, returns the inline-keyboard buttons of the reply. */
    const send = async (update: Record<string, unknown>) => {
      const id = ++updateId;
      await telegram.handleUpdate({ update_id: id, ...update }, `corr-${id}`);
      await work();
      const job = await db().channelInboundJob.findFirstOrThrow({ where: { externalUpdateId: String(id) } });
      expect(job.status).toBe('SUCCEEDED');
      const delivery = await db().channelOutboundDelivery.findFirst({ where: { inboundJobId: job.id, kind: 'SEND_MESSAGE' } });
      return ((delivery?.replyMarkup as any)?.inline_keyboard ?? []).flat() as { text: string; callback_data: string }[];
    };
    const message = (text: string) => send({ message: { chat: { id: `chat-${externalId}`, type: 'private' }, from: { id: externalId }, text } });
    const press = (button: { callback_data: string }) => send({ callback_query: { id: `cbq-${updateId}`, data: button.callback_data, from: { id: externalId }, message: { message_id: 1, chat: { id: `chat-${externalId}`, type: 'private' } } } });

    const options = await message('kopi susu 25rb pakai BCA');
    const draftButtons = await press(options[0]!);
    await press(draftButtons.find((b) => b.text === 'Confirm')!);
    const directButtons = await message('kopi susu 10rb pakai BCA Debit');
    await press(directButtons.find((b) => b.text === 'Cancel')!);
    await message('kopi susu pakai BCA Debit');
    return { user };
  }

  const EXPECTED_JOURNEY = [
    'CLARIFICATION_REQUESTED|WALLET|DIRECT',
    'CLARIFICATION_RESOLVED||',
    'DRAFT_CREATED||AFTER_CLARIFICATION',
    'DRAFT_CONFIRMED||',
    'DRAFT_CREATED||DIRECT',
    'DRAFT_CANCELLED||',
    'CLARIFICATION_REQUESTED|AMOUNT|DIRECT',
  ].sort();

  it('Web and Telegram journeys persist an identical taxonomy, labelled by source', async () => {
    await webJourney();
    const web = await taxonomy();
    expect(web).toEqual(EXPECTED_JOURNEY);
    expect(await db().assistantCaptureEvent.count({ where: { source: { not: 'WEB' } } })).toBe(0);

    await db().assistantCaptureEvent.deleteMany();
    await telegramJourney();
    expect(await taxonomy()).toEqual(web);
    expect(await db().assistantCaptureEvent.count({ where: { source: { not: 'TELEGRAM' } } })).toBe(0);
  });

  it('persisted rows hold no free text, amount, name, or raw id from the journey', async () => {
    const { user, draftIds } = await webJourney();
    const wallets = await db().wallet.findMany({ where: { userId: user.id } });
    const rows = await db().assistantCaptureEvent.findMany();
    expect(rows.length).toBeGreaterThan(0);
    const dump = JSON.stringify(rows);
    for (const secret of ['kopi', '25000', '10000', 'BCA', 'Lainnya', user.id, user.email, ...wallets.map((w) => w.id), ...draftIds]) {
      expect(dump).not.toContain(secret);
    }
    for (const row of rows) assertPrivacySafeRow(row);
    // Same draft is joinable across its own events by the hashed key only.
    expect(rows.filter((r) => r.correlationKey === sha(draftIds[0]!)).map((r) => r.eventType).sort()).toEqual(['DRAFT_CONFIRMED', 'DRAFT_CREATED']);
  });

  it('draft edits at confirm record only the fields that actually changed', async () => {
    const { user, debit, payroll, category } = await fixture('edit');
    const { server } = buildServices(undefined, [plan({ amount: '25000', walletReference: 'BCA Debit' })]);
    const draft = envelope(await request(server).post('/messages').set('x-test-user', user.id).send({ message: 'x' }));
    await request(server).post(`/drafts/${draft.data.draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', `edit-${user.id}`)
      .send({ amount: 30000, walletId: payroll.id, categoryId: category.id, description: 'kopi susu' });
    const edited = await db().assistantCaptureEvent.findFirstOrThrow({ where: { eventType: 'DRAFT_EDITED' } });
    // categoryId and description were sent unchanged → not counted.
    expect(edited.fields.sort()).toEqual(['AMOUNT', 'WALLET']);
    expect(debit.id).not.toBe(payroll.id);
  });

  it('transfer clarifications distinguish source vs destination wallet', async () => {
    const { user } = await fixture('transfer');
    const { application } = buildServices();
    const exec = (args: Record<string, unknown>) => application.execute(user.id, `corr-${Math.random()}`, {
      intent: 'transaction.create', arguments: { type: 'TRANSFER', amount: '50000', date: '2026-10-19', ...args },
    });
    expect((await exec({ walletReference: 'BCA', toWalletReference: 'GoPay' })).response.status).toBe('clarification_required');
    expect((await exec({ walletReference: 'GoPay', toWalletReference: 'BCA' })).response.status).toBe('clarification_required');
    const rows = await db().assistantCaptureEvent.findMany({ where: { eventType: 'CLARIFICATION_REQUESTED' } });
    expect(rows.flatMap((r) => r.fields).sort()).toEqual(['DESTINATION_WALLET', 'SOURCE_WALLET']);
    expect(rows.map((r) => r.phaseMarker)).toEqual(['phase-38', 'phase-38']);
  });

  it('transfer clarification copy asks "Dari" then "Ke", showing the chosen source before the second question', async () => {
    const { user } = await fixture('transfer-copy');
    const { application } = buildServices();
    type Clar = { clarificationId: string; prompt: string; options: { token: string; label: string }[]; transfer?: unknown };
    const first = (await application.execute(user.id, 'corr-copy-1', {
      intent: 'transaction.create', arguments: { type: 'TRANSFER', amount: '50000', date: '2026-10-19', walletReference: 'BCA', toWalletReference: 'BCA' },
    })).response as { conversationId: string; data: { clarification: Clar } };
    const source = first.data.clarification;
    expect(source.prompt).toBe('Dari wallet mana? Pilih salah satu: BCA Debit (BANK), BCA Payroll (BANK).');
    expect(source.transfer).toEqual({ field: 'SOURCE_WALLET' });

    const debit = source.options.find((o) => o.label === 'BCA Debit')!;
    const second = (await application.selectClarification(user.id, 'corr-copy-2', debit.token, first.conversationId, source.clarificationId))
      .response as { data: { clarification: Clar } };
    const destination = second.data.clarification;
    expect(destination.prompt).toBe('Dari: BCA Debit. Ke wallet mana? Pilih salah satu: BCA Debit (BANK), BCA Payroll (BANK).');
    expect(destination.transfer).toEqual({ field: 'DESTINATION_WALLET', sourceWalletLabel: 'BCA Debit' });

    // Survives a refresh: recovery-state carries the same role for the open question.
    const state = await application.getAssistantState(user.id, first.conversationId) as { activeClarification?: Clar };
    expect(state.activeClarification?.transfer).toEqual({ field: 'DESTINATION_WALLET', sourceWalletLabel: 'BCA Debit' });

    const stored = await db().assistantCaptureEvent.findMany({ where: { eventType: 'CLARIFICATION_REQUESTED' } });
    expect(stored.map((r) => [r.fields, r.phaseMarker])).toEqual(expect.arrayContaining([[['SOURCE_WALLET'], 'phase-38'], [['DESTINATION_WALLET'], 'phase-38']]));
  });

  it('a failing event store never fails confirm or its transaction', async () => {
    const { user, category } = await fixture('emit-fail');
    const broken = createCaptureEventEmitter({ assistantCaptureEvent: { createMany: async () => { throw new Error('event store down'); }, deleteMany: async () => { throw new Error('down'); } } } as never);
    const { server } = buildServices(broken, [plan({ amount: '25000', walletReference: 'BCA Debit' })]);
    const draft = envelope(await request(server).post('/messages').set('x-test-user', user.id).send({ message: 'x' }));
    expect(draft.data.confirmationRequired).toBe(true);
    const confirm = await request(server).post(`/drafts/${draft.data.draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', `fail-${user.id}`).send();
    expect(confirm.status).toBe(200);
    expect(await db().transaction.count({ where: { userId: user.id, categoryId: category.id } })).toBe(1);
    expect(await db().assistantCaptureEvent.count()).toBe(0);
  });

  it('retries and recovery never duplicate an event', async () => {
    const { user } = await fixture('retry');
    const emit = createCaptureEventEmitter(db());
    const { server, drafts } = buildServices(emit, [plan({ amount: '25000', walletReference: 'BCA Debit' })]);
    const draft = envelope(await request(server).post('/messages').set('x-test-user', user.id).send({ message: 'x' }));
    const key = `retry-${user.id}`;
    // Same Idempotency-Key replayed (Phase 27), sequential and concurrent.
    await request(server).post(`/drafts/${draft.data.draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', key).send();
    await Promise.all([1, 2].map(() => drafts.confirm(user.id, draft.data.draftId, key, 'corr-replay')));
    // A recovered turn re-emitting the same transition.
    await emit({ type: 'DRAFT_CREATED', entityId: draft.data.draftId, origin: 'DIRECT' });
    const counts = await db().assistantCaptureEvent.groupBy({ by: ['eventType'], _count: true });
    expect(Object.fromEntries(counts.map((c) => [c.eventType, c._count]))).toEqual({ DRAFT_CREATED: 1, DRAFT_CONFIRMED: 1 });
  });

  it('a re-processed Telegram job (worker recovery) does not re-emit', async () => {
    await telegramJourney();
    const before = await db().assistantCaptureEvent.count();
    // Re-run every already-processed job: the assistantOperationGuard replays the stored reply.
    await db().channelInboundJob.updateMany({ where: { status: 'SUCCEEDED' }, data: { status: 'PENDING', leaseOwner: null, leaseExpiresAt: null } });
    const deps = { db: db(), connections: createChannelConnectionService(db()), linkTokens: createChannelLinkTokenService(db()), assistantProviderRuntime: buildServices().runtime, config: { workersEnabled: true, inboundPollMs: 1, outboundPollMs: 1, batchSize: 50, leaseMs: 5000, maxAttemptsInbound: 5, maxAttemptsOutbound: 5, retentionDays: 7 }, owner: 'recovery' } as InboundWorkerDeps;
    for (const job of await claimInboundJobs(db(), { batchSize: 50, leaseMs: 5000, owner: 'recovery' })) await processJob(deps, job, `corr-r-${job.id}`);
    expect(await db().assistantCaptureEvent.count()).toBe(before);
  });

  it('the 39.0 report computes the five metrics from seeded rows', async () => {
    const at = new Date('2026-10-10T10:00:00Z');
    const later = new Date('2026-10-10T10:05:00Z');
    const row = (eventType: string, key: string, source: 'WEB' | 'TELEGRAM', extra: Record<string, unknown> = {}, occurredAt = at) =>
      ({ eventType, correlationKey: sha(key), source, schemaVersion: 1, phaseMarker: 'phase-35.1', occurredAt, ...extra }) as any;
    const web = [
      ...Array.from({ length: 4 }, (_, i) => row('DRAFT_CREATED', `wd${i}`, 'WEB', { origin: i < 3 ? 'DIRECT' : 'AFTER_CLARIFICATION' })),
      row('CLARIFICATION_REQUESTED', 'wc0', 'WEB', { fields: ['WALLET'], origin: 'DIRECT' }),
      row('CLARIFICATION_REQUESTED', 'wc1', 'WEB', { fields: ['AMOUNT'], origin: 'DIRECT' }),
      row('DRAFT_CONFIRMED', 'wd0', 'WEB', {}, later), row('DRAFT_CONFIRMED', 'wd1', 'WEB', {}, later),
      row('DRAFT_EDITED', 'wd0', 'WEB', { fields: ['AMOUNT', 'CATEGORY'] }, later),
      row('DRAFT_CANCELLED', 'wd2', 'TELEGRAM', {}, later), // cancelled from the other channel: still the WEB cohort
    ];
    const tg = [row('DRAFT_CREATED', 'td0', 'TELEGRAM', { origin: 'DIRECT' }), row('DRAFT_FAILED', 'td0', 'TELEGRAM', {}, later)];
    const outside = [row('DRAFT_CREATED', 'old', 'WEB', { origin: 'DIRECT' }, new Date('2026-09-01T00:00:00Z'))];
    await db().assistantCaptureEvent.createMany({ data: [...web, ...tg, ...outside] });

    const options = { from: new Date('2026-10-01T00:00:00Z'), to: new Date('2026-10-19T00:00:00Z'), now: new Date('2026-10-19T00:00:00Z'), minSamples: 2 };
    const groups = await buildCaptureReport(db(), options);
    const webGroup = groups.find((g) => g.source === 'WEB')!;
    expect(webGroup).toMatchObject({
      captureStarts: 5,
      draftsCreated: 4,
      outcomes: { confirmed: 2, cancelled: 1, expired: 0, abandonedPastTtl: 1, failed: 0, open: 0 },
      editedByField: { AMOUNT: 1, CATEGORY: 1 },
    });
    expect(webGroup.clarificationByField.WALLET!.value).toBe(0.2);
    expect(webGroup.directDraftRate.value).toBe(0.75);
    expect(webGroup.cancelRate.value).toBe(0.25);
    expect(webGroup.editRate.value).toBe(0.5);
    const tgGroup = groups.find((g) => g.source === 'TELEGRAM')!;
    expect(tgGroup).toMatchObject({ draftsCreated: 1, outcomes: { failed: 1 } });
    expect(tgGroup.cancelRate.value).toBe('INSUFFICIENT DATA');
    const text = formatReport(groups, options);
    expect(text).toContain('== TELEGRAM · phase-35.1 ==');
    expect(text).toContain('INSUFFICIENT DATA (n=1)');
  });
});
