import { afterAll, afterEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createPrismaResources } from '../../src/lib/prismaFactory';
import { assertTestDatabaseUrl } from '../../src/lib/assertTestDatabaseUrl';
import { createAssistantConversationService } from '../../src/assistant/conversation.service';
import { createAssistantApplicationService } from '../../src/assistant/application.service';
import { createAssistantFinancialDraftService } from '../../src/assistant/financial-draft.service';
import { createClarificationService } from '../../src/assistant/clarification.service';
import {
  EntityResolverRegistry,
  createCategoryResolver,
  createEntityResolutionService,
  createMerchantResolver,
  createWalletResolver,
} from '../../src/assistant/entity-resolution';
import { createTransactionService } from '../../src/services/transaction.service';
import { ToolRegistry } from '../../src/assistant/registry';
import { monthlySpendingSummary, transactionCreate } from '../../src/assistant/tools';
import { createAssistantControllers } from '../../src/controllers/assistant.controller';
import { correlationMiddleware } from '../../src/http/correlation';
import { errorHandler } from '../../src/middlewares/error.middleware';
import { renderApplicationResult } from '../../src/channels/interaction.service';

const url = process.env.TEST_DATABASE_URL;
if (url) assertTestDatabaseUrl(url);
const resources = url ? createPrismaResources(url, { max: 12 }) : undefined;
const users: string[] = [];
afterAll(() => resources?.close());
afterEach(async () => { if (resources && users.length) await resources.prisma.user.deleteMany({ where: { id: { in: users.splice(0) } } }); });

describe.skipIf(!url)('Assistant TRANSFER drafts (disposable PostgreSQL)', () => {
  async function fixture(label: string) {
    const user = await resources!.prisma.user.create({ data: { email: `${label}-${Date.now()}-${Math.random()}@test.local`, name: label } });
    users.push(user.id);
    const source = await resources!.prisma.wallet.create({ data: { userId: user.id, name: 'Cash', type: 'CASH', balance: 100000 } });
    const destination = await resources!.prisma.wallet.create({ data: { userId: user.id, name: 'Bank BCA', type: 'BANK', balance: 5000 } });
    return { user, source, destination };
  }

  function app() {
    const conversations = createAssistantConversationService(resources!.prisma);
    const clarification = createClarificationService(resources!.prisma);
    const entityResolverRegistry = new EntityResolverRegistry();
    entityResolverRegistry.register(createWalletResolver(resources!.prisma));
    entityResolverRegistry.register(createMerchantResolver(resources!.prisma));
    entityResolverRegistry.register(createCategoryResolver(resources!.prisma));
    entityResolverRegistry.finalize();
    const entityResolution = createEntityResolutionService(entityResolverRegistry);
    let application: ReturnType<typeof createAssistantApplicationService>;
    const drafts = createAssistantFinancialDraftService(resources!.prisma, createTransactionService(resources!.prisma), () => ({ inferCategoryId: application.inferCategoryId }));
    const registry = new ToolRegistry(); registry.register(monthlySpendingSummary); registry.register(transactionCreate);
    application = createAssistantApplicationService({ conversations, toolRegistry: registry, handlerRegistry: new Map(), financialDrafts: drafts, clarification, entityResolution });
    const controllers = createAssistantControllers(application, conversations, drafts);
    const server = express(); server.use(express.json()); server.use(correlationMiddleware);
    server.use((req, _res, next) => { (req as any).auth = { userId: req.header('x-test-user') }; next(); });
    server.post('/execute', controllers.execute);
    server.post('/drafts/:draftId/confirm', controllers.confirmDraft);
    server.post('/drafts/:draftId/cancel', controllers.cancelDraft);
    server.get('/conversations/:conversationId', controllers.get);
    server.post('/conversations/:conversationId/clarifications/:clarificationId/select', controllers.selectClarification);
    server.post('/conversations/:conversationId/clarifications/:clarificationId/cancel', controllers.cancelClarification);
    server.use(errorHandler);
    return server;
  }

  const transferBody = (walletId: string, toWalletReference: string, amount = '50000') =>
    ({ intent: 'transaction.create', arguments: { type: 'TRANSFER', amount, walletId, toWalletReference, date: '2026-07-22' } });
  const transferByRef = (walletReference: string, toWalletReference: string, amount = '50000') =>
    ({ intent: 'transaction.create', arguments: { type: 'TRANSFER', amount, walletReference, toWalletReference, date: '2026-07-22' } });

  // /execute wraps a 'success' response under `.data` and every other status
  // (including 'clarification_required', still HTTP 200) under `.error` — an
  // existing, unrelated convention of that endpoint (see clarification-http.integration.test.ts).
  function executeEnvelope(res: request.Response): any {
    return res.body.success ? res.body.data : res.body.error;
  }

  it('prepares an unambiguous transfer draft with no category and both wallet labels, and never touches balances until confirm', async () => {
    const { user, source, destination } = await fixture('transfer-happy');
    const server = app();
    const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(transferBody(source.id, destination.name));
    expect(prepared.status).toBe(200);
    expect(prepared.body.data.data).toMatchObject({ status: 'PENDING_CONFIRMATION', confirmationRequired: true });
    expect(prepared.body.data.data.preview).toMatchObject({ type: 'TRANSFER', toWallet: destination.name });
    expect(prepared.body.data.data.preview).not.toHaveProperty('category');
    expect(prepared.body.data.data.preview).not.toHaveProperty('categoryId');
    expect(await resources!.prisma.transaction.count({ where: { userId: user.id } })).toBe(0);
    expect((await resources!.prisma.wallet.findUniqueOrThrow({ where: { id: source.id } })).balance.toString()).toBe('100000');

    const draftId = prepared.body.data.data.draftId;
    const confirm = await request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'transfer-happy-key');
    expect(confirm.status).toBe(200);
    const transaction = await resources!.prisma.transaction.findUniqueOrThrow({ where: { id: confirm.body.data.transactionId } });
    expect(transaction.type).toBe('TRANSFER');
    expect(transaction.walletId).toBe(source.id);
    expect(transaction.toWalletId).toBe(destination.id);
    expect(transaction.categoryId).toBeNull();
    expect((await resources!.prisma.wallet.findUniqueOrThrow({ where: { id: source.id } })).balance.toString()).toBe('50000');
    expect((await resources!.prisma.wallet.findUniqueOrThrow({ where: { id: destination.id } })).balance.toString()).toBe('55000');
  });

  it('never silently coerces transfer-sounding language into INCOME or EXPENSE at the tool boundary', async () => {
    const { user, source, destination } = await fixture('transfer-no-coercion');
    const response = await request(app()).post('/execute').set('x-test-user', user.id).send({
      intent: 'transaction.create',
      arguments: { type: 'EXPENSE', amount: '50000', walletId: source.id, toWalletReference: destination.name, date: '2026-07-22' },
    });
    // toWalletReference is only a valid key for TRANSFER — EXPENSE + toWalletReference is rejected, never silently treated as EXPENSE.
    expect(response.status).toBe(400);
    expect(await resources!.prisma.assistantFinancialDraft.count({ where: { userId: user.id } })).toBe(0);
  });

  it('rejects a transfer with a missing destination wallet reference before creating a draft', async () => {
    const { user, source } = await fixture('transfer-missing-dest');
    const response = await request(app()).post('/execute').set('x-test-user', user.id).send({
      intent: 'transaction.create',
      arguments: { type: 'TRANSFER', amount: '50000', walletId: source.id, date: '2026-07-22' },
    });
    expect(response.status).toBe(400);
    expect(await resources!.prisma.assistantFinancialDraft.count({ where: { userId: user.id } })).toBe(0);
  });

  it('rejects category supplied for a TRANSFER at the tool boundary', async () => {
    const { user, source, destination } = await fixture('transfer-category-rejected');
    const response = await request(app()).post('/execute').set('x-test-user', user.id).send({
      intent: 'transaction.create',
      arguments: { type: 'TRANSFER', amount: '50000', walletId: source.id, toWalletReference: destination.name, categoryReference: 'Food', date: '2026-07-22' },
    });
    expect(response.status).toBe(400);
    expect(await resources!.prisma.assistantFinancialDraft.count({ where: { userId: user.id } })).toBe(0);
  });

  it('rejects source === destination before creating a draft', async () => {
    const { user, source } = await fixture('transfer-same-wallet');
    const response = await request(app()).post('/execute').set('x-test-user', user.id).send(transferBody(source.id, source.name));
    expect(response.status).toBe(200);
    expect(executeEnvelope(response).status).toBe('clarification_required');
    expect(await resources!.prisma.assistantFinancialDraft.count({ where: { userId: user.id } })).toBe(0);
  });

  it('rejects an unowned destination wallet reference as not_found, creating no draft', async () => {
    const { user, source } = await fixture('transfer-foreign-dest-owner');
    const foreign = await fixture('transfer-foreign-dest-other');
    const foreignOnlyWallet = await resources!.prisma.wallet.create({ data: { userId: foreign.user.id, name: 'Foreign Only Wallet', type: 'BANK', balance: 0 } });
    const response = await request(app()).post('/execute').set('x-test-user', user.id).send(transferBody(source.id, foreignOnlyWallet.name));
    expect(response.status).toBe(200);
    expect(executeEnvelope(response).status).toBe('clarification_required');
    expect(await resources!.prisma.assistantFinancialDraft.count({ where: { userId: user.id } })).toBe(0);
  });

  it('rejects an invalid transfer-source wallet type (credit card) without creating a draft', async () => {
    const { user, destination } = await fixture('transfer-invalid-source-type');
    const creditCard = await resources!.prisma.wallet.create({ data: { userId: user.id, name: 'Visa', type: 'CREDIT_CARD', balance: -100000, creditLimit: 1000000 } });
    const response = await request(app()).post('/execute').set('x-test-user', user.id).send(transferBody(creditCard.id, destination.name));
    expect(response.status).toBe(400);
    expect(await resources!.prisma.assistantFinancialDraft.count({ where: { userId: user.id } })).toBe(0);
  });

  it('rejects confirmation on insufficient funds through the existing transaction service, with no mutation', async () => {
    const { user, source, destination } = await fixture('transfer-insufficient-funds');
    const server = app();
    const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(transferBody(source.id, destination.name, '999999'));
    const draftId = prepared.body.data.data.draftId;
    const response = await request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'insufficient-key');
    expect(response.status).toBe(400);
    expect(await resources!.prisma.transaction.count({ where: { userId: user.id } })).toBe(0);
    expect((await resources!.prisma.wallet.findUniqueOrThrow({ where: { id: source.id } })).balance.toString()).toBe('100000');
    expect((await resources!.prisma.assistantFinancialDraft.findUniqueOrThrow({ where: { id: draftId } })).status).toBe('FAILED');
  });

  it('resolves source ambiguity via clarification, carrying the already-resolved destination forward without overwriting it', async () => {
    const { user, source, destination } = await fixture('transfer-source-ambiguous');
    await resources!.prisma.wallet.create({ data: { userId: user.id, name: 'Cash', type: 'CASH', balance: 20000 } });
    const server = app();
    const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(transferByRef(source.name, destination.name));
    const preparedBody = executeEnvelope(prepared);
    expect(preparedBody.status).toBe('clarification_required');
    const clarification = preparedBody.data.clarification;
    expect(clarification.options).toHaveLength(2);
    const token = clarification.options[0].token;
    const select = await request(server)
      .post(`/conversations/${preparedBody.conversationId}/clarifications/${clarification.clarificationId}/select`)
      .set('x-test-user', user.id)
      .send({ optionToken: token });
    expect(select.status).toBe(200);
    expect(select.body.data.status).toBe('success');
    expect(select.body.data.data.preview).toMatchObject({ type: 'TRANSFER', toWallet: destination.name });
  });

  it('resolves destination ambiguity via clarification while the already-resolved source is unaffected', async () => {
    const { user, source, destination } = await fixture('transfer-dest-ambiguous');
    await resources!.prisma.wallet.create({ data: { userId: user.id, name: 'Bank BCA', type: 'BANK', balance: 1000 } });
    const server = app();
    const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(transferByRef(source.name, destination.name));
    const preparedBody = executeEnvelope(prepared);
    expect(preparedBody.status).toBe('clarification_required');
    const clarification = preparedBody.data.clarification;
    const select = await request(server)
      .post(`/conversations/${preparedBody.conversationId}/clarifications/${clarification.clarificationId}/select`)
      .set('x-test-user', user.id)
      .send({ optionToken: clarification.options[0].token });
    expect(select.status).toBe(200);
    expect(select.body.data.status).toBe('success');
    expect(select.body.data.data.preview.wallet ?? select.body.data.data.preview.walletId).toBeTruthy();
  });

  it('sequences both-ambiguous wallets as source-first then a child destination clarification, with no slot collision', async () => {
    const { user, source, destination } = await fixture('transfer-both-ambiguous');
    await resources!.prisma.wallet.create({ data: { userId: user.id, name: 'Cash', type: 'CASH', balance: 20000 } });
    await resources!.prisma.wallet.create({ data: { userId: user.id, name: 'Bank BCA', type: 'BANK', balance: 1000 } });
    const server = app();

    const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(transferByRef(source.name, destination.name));
    const preparedBody = executeEnvelope(prepared);
    expect(preparedBody.status).toBe('clarification_required');
    const sourceClarification = preparedBody.data.clarification;

    const selectSource = await request(server)
      .post(`/conversations/${preparedBody.conversationId}/clarifications/${sourceClarification.clarificationId}/select`)
      .set('x-test-user', user.id)
      .send({ optionToken: sourceClarification.options[0].token });
    // Destination is still ambiguous — a second, child clarification is returned, not a draft.
    expect(selectSource.status).toBe(200);
    expect(selectSource.body.data.status).toBe('clarification_required');
    const destClarification = selectSource.body.data.data.clarification;
    expect(destClarification.clarificationId).not.toBe(sourceClarification.clarificationId);

    const selectDest = await request(server)
      .post(`/conversations/${preparedBody.conversationId}/clarifications/${destClarification.clarificationId}/select`)
      .set('x-test-user', user.id)
      .send({ optionToken: destClarification.options[0].token });
    expect(selectDest.status).toBe(200);
    expect(selectDest.body.data.status).toBe('success');
    expect(selectDest.body.data.data.preview.type).toBe('TRANSFER');
    expect(await resources!.prisma.assistantFinancialDraft.count({ where: { userId: user.id, status: 'PENDING_CONFIRMATION' } })).toBe(1);
  });

  it('cancelling a mid-chain wallet clarification produces no draft and no financial mutation', async () => {
    const { user, source, destination } = await fixture('transfer-cancel-chain');
    await resources!.prisma.wallet.create({ data: { userId: user.id, name: 'Cash', type: 'CASH', balance: 20000 } });
    const server = app();
    const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(transferByRef(source.name, destination.name));
    const preparedBody = executeEnvelope(prepared);
    const clarificationId = preparedBody.data.clarification.clarificationId;
    const cancel = await request(server)
      .post(`/conversations/${preparedBody.conversationId}/clarifications/${clarificationId}/cancel`)
      .set('x-test-user', user.id)
      .send({});
    expect(cancel.status).toBe(200);
    expect(await resources!.prisma.assistantFinancialDraft.count({ where: { userId: user.id } })).toBe(0);
    expect(await resources!.prisma.transaction.count({ where: { userId: user.id } })).toBe(0);
  });

  it('applies a confirm-time toWalletId override, crediting the overridden destination', async () => {
    const { user, source, destination } = await fixture('transfer-override-dest');
    const otherDestination = await resources!.prisma.wallet.create({ data: { userId: user.id, name: 'GoPay', type: 'E_WALLET', balance: 1000 } });
    const server = app();
    const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(transferBody(source.id, destination.name));
    const draftId = prepared.body.data.data.draftId;
    const confirm = await request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'override-dest-key').send({ toWalletId: otherDestination.id });
    expect(confirm.status).toBe(200);
    expect((await resources!.prisma.transaction.findUniqueOrThrow({ where: { id: confirm.body.data.transactionId } })).toWalletId).toBe(otherDestination.id);
    expect((await resources!.prisma.wallet.findUniqueOrThrow({ where: { id: destination.id } })).balance.toString()).toBe('5000');
    expect((await resources!.prisma.wallet.findUniqueOrThrow({ where: { id: otherDestination.id } })).balance.toString()).toBe('51000');
  });

  it('applies a confirm-time source walletId override, debiting the overridden source', async () => {
    const { user, source, destination } = await fixture('transfer-override-source');
    const otherSource = await resources!.prisma.wallet.create({ data: { userId: user.id, name: 'Bank Mandiri', type: 'BANK', balance: 200000 } });
    const server = app();
    const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(transferBody(source.id, destination.name));
    const draftId = prepared.body.data.data.draftId;
    const confirm = await request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'override-source-key').send({ walletId: otherSource.id });
    expect(confirm.status).toBe(200);
    expect((await resources!.prisma.wallet.findUniqueOrThrow({ where: { id: source.id } })).balance.toString()).toBe('100000');
    expect((await resources!.prisma.wallet.findUniqueOrThrow({ where: { id: otherSource.id } })).balance.toString()).toBe('150000');
  });

  it('rejects a confirm-time source override that collides with the destination, without mutating balances', async () => {
    const { user, source, destination } = await fixture('transfer-override-collide');
    const server = app();
    const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(transferBody(source.id, destination.name));
    const draftId = prepared.body.data.data.draftId;
    const confirm = await request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'override-collide-key').send({ walletId: destination.id });
    expect(confirm.status).toBe(400);
    expect(await resources!.prisma.transaction.count({ where: { userId: user.id } })).toBe(0);
    expect((await resources!.prisma.wallet.findUniqueOrThrow({ where: { id: destination.id } })).balance.toString()).toBe('5000');
  });

  it('rejects a confirm-time categoryId override against a TRANSFER draft', async () => {
    const { user, source, destination } = await fixture('transfer-override-category-rejected');
    const category = await resources!.prisma.category.create({ data: { userId: user.id, name: 'Food', type: 'EXPENSE' } });
    const server = app();
    const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(transferBody(source.id, destination.name));
    const draftId = prepared.body.data.data.draftId;
    const confirm = await request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'override-category-key').send({ categoryId: category.id });
    expect(confirm.status).toBe(400);
    expect(await resources!.prisma.transaction.count({ where: { userId: user.id } })).toBe(0);
  });

  it('rejects a confirm-time toWalletId override against a non-transfer draft', async () => {
    const { user, source } = await fixture('transfer-override-type-change');
    const category = await resources!.prisma.category.create({ data: { userId: user.id, name: 'Food', type: 'EXPENSE' } });
    const server = app();
    const prepared = await request(server).post('/execute').set('x-test-user', user.id).send({
      intent: 'transaction.create',
      arguments: { type: 'EXPENSE', amount: '50000', walletId: source.id, categoryId: category.id, date: '2026-07-22' },
    });
    const draftId = prepared.body.data.data.draftId;
    const otherWallet = await resources!.prisma.wallet.create({ data: { userId: user.id, name: 'Bank', type: 'BANK', balance: 0 } });
    const confirm = await request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'type-change-key').send({ toWalletId: otherWallet.id });
    // A confirm override can never change a draft's type — toWalletId is rejected on an EXPENSE draft, and the
    // transaction is still created as the draft's original EXPENSE type, not silently upgraded to TRANSFER.
    expect(confirm.status).toBe(400);
    expect(await resources!.prisma.transaction.count({ where: { userId: user.id, type: 'TRANSFER' } })).toBe(0);
  });

  it('serializes concurrent transfer confirmations to exactly one transaction and one atomic debit/credit', async () => {
    const { user, source, destination } = await fixture('transfer-concurrent');
    const server = app();
    const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(transferBody(source.id, destination.name));
    const draftId = prepared.body.data.data.draftId;
    const responses = await Promise.all(Array.from({ length: 6 }, (_, index) => request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', `transfer-concurrent-${index}`)));
    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(await resources!.prisma.transaction.count({ where: { userId: user.id } })).toBe(1);
    expect((await resources!.prisma.wallet.findUniqueOrThrow({ where: { id: source.id } })).balance.toString()).toBe('50000');
    expect((await resources!.prisma.wallet.findUniqueOrThrow({ where: { id: destination.id } })).balance.toString()).toBe('55000');
  });

  it('replays an idempotent confirm and rejects cross-draft key reuse, same as INCOME/EXPENSE', async () => {
    const { user, source, destination } = await fixture('transfer-idempotency');
    const server = app();
    const first = await request(server).post('/execute').set('x-test-user', user.id).send(transferBody(source.id, destination.name));
    const second = await request(server).post('/execute').set('x-test-user', user.id).send(transferBody(source.id, destination.name));
    const confirm1 = await request(server).post(`/drafts/${first.body.data.data.draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'shared-transfer-key');
    const replay1 = await request(server).post(`/drafts/${first.body.data.data.draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'shared-transfer-key');
    expect(confirm1.body.data.transactionId).toBe(replay1.body.data.transactionId);
    const conflict = await request(server).post(`/drafts/${second.body.data.data.draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'shared-transfer-key');
    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe('ASSISTANT_IDEMPOTENCY_CONFLICT');
  });

  it('renders a pending TRANSFER draft to Telegram as the fixed web-handoff, never a confirm/cancel keyboard', async () => {
    const { user, source, destination } = await fixture('transfer-telegram-handoff');
    const server = app();
    const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(transferBody(source.id, destination.name));
    expect(prepared.body.data.status).toBe('success');

    const rendered = await renderApplicationResult(resources!.prisma, 'connection-1', prepared.body.data.conversationId, { response: prepared.body.data });
    expect(rendered.terminalStatus).toBe('guided_fields_handoff');
    expect(rendered.keyboard).toBeUndefined();
    expect(rendered.replyText).not.toContain(prepared.body.data.data.draftId);
  });
});
