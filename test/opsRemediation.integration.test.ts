import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { createPrismaResources } from '../src/lib/prismaFactory';
import { assertTestDatabaseUrl } from '../src/lib/assertTestDatabaseUrl';
import { canMarkReviewed, canRequeueOutbound, canReconcileStaleTurn, buildMarkReviewedUpdate, buildRequeueOutboundUpdate, buildReconcileTurnUpdate } from '../src/domain/opsRemediation';
import { STALE_RUNNING_TURN_MS } from '../src/domain/opsVisibility';

const url = process.env.TEST_DATABASE_URL;
if (url) assertTestDatabaseUrl(url);
const resources = url ? createPrismaResources(url, { max: 5 }) : undefined;
const users: string[] = [];
afterAll(() => resources?.close());
afterEach(async () => { if (resources && users.length) await resources.prisma.user.deleteMany({ where: { id: { in: users.splice(0) } } }); });

describe.skipIf(!url)('Phase 29 operator remediation (disposable PostgreSQL)', () => {
  async function fixtureUser(label: string) {
    const user = await resources!.prisma.user.create({ data: { email: `${label}-${Date.now()}-${Math.random()}@test.local`, name: label } });
    users.push(user.id);
    return user;
  }

  it('mark-reviewed sets only reviewedAt/reviewedBy/reviewNote on an ambiguous terminal job, never status/attempt/errorCategory', async () => {
    const user = await fixtureUser('ambiguous');
    const job = await resources!.prisma.channelInboundJob.create({
      data: {
        provider: 'TELEGRAM',
        externalUpdateId: `upd-${Date.now()}-${Math.random()}`,
        externalSenderId: 'tg-sender',
        externalChatId: 'tg-chat',
        text: 'transfer 500000 to my brother',
        status: 'FAILED_TERMINAL',
        errorCategory: 'ambiguous_assistant_execution',
        attempt: 3,
      },
    });

    expect(canMarkReviewed(job)).toBe(true);
    const update = buildMarkReviewedUpdate('operator-alice', 'checked assistant_turns, no duplicate risk');
    const result = await resources!.prisma.channelInboundJob.updateMany({
      where: { id: job.id, status: 'FAILED_TERMINAL' },
      data: update,
    });
    expect(result.count).toBe(1);

    const after = await resources!.prisma.channelInboundJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(after.reviewedBy).toBe('operator-alice');
    expect(after.reviewNote).toBe('checked assistant_turns, no duplicate risk');
    expect(after.reviewedAt).not.toBeNull();
    // Unchanged — proves the ambiguous execution was never replayed/reprocessed.
    expect(after.status).toBe('FAILED_TERMINAL');
    expect(after.errorCategory).toBe('ambiguous_assistant_execution');
    expect(after.attempt).toBe(3);
  });

  it('mark-reviewed is rejected by the safety gate for a non-ambiguous or non-terminal job — no DB write attempted', async () => {
    const pending = { status: 'PENDING', errorCategory: 'ambiguous_assistant_execution' };
    const nonAmbiguous = { status: 'FAILED_TERMINAL', errorCategory: 'validation' };
    expect(canMarkReviewed(pending)).toBe(false);
    expect(canMarkReviewed(nonAmbiguous)).toBe(false);
  });

  it('requeue-outbound resets a terminal delivery to PENDING without touching renderedText, the inbound job, or creating a Transaction', async () => {
    const user = await fixtureUser('outbound');
    const job = await resources!.prisma.channelInboundJob.create({
      data: {
        provider: 'TELEGRAM',
        externalUpdateId: `upd-${Date.now()}-${Math.random()}`,
        externalSenderId: 'tg-sender',
        externalChatId: 'tg-chat',
        text: 'balance',
        status: 'SUCCEEDED',
      },
    });
    const delivery = await resources!.prisma.channelOutboundDelivery.create({
      data: {
        inboundJobId: job.id,
        provider: 'TELEGRAM',
        destinationChatId: 'tg-chat',
        renderedText: 'Your balance is Rp 5.000.000',
        status: 'FAILED_TERMINAL',
        attempt: 3,
        errorCategory: 'provider_unavailable',
      },
    });

    expect(canRequeueOutbound(delivery)).toBe(true);
    const update = buildRequeueOutboundUpdate();
    const result = await resources!.prisma.channelOutboundDelivery.updateMany({
      where: { id: delivery.id, status: 'FAILED_TERMINAL' },
      data: update,
    });
    expect(result.count).toBe(1);

    const after = await resources!.prisma.channelOutboundDelivery.findUniqueOrThrow({ where: { id: delivery.id } });
    expect(after.status).toBe('PENDING');
    expect(after.attempt).toBe(0);
    expect(after.errorCategory).toBeNull();
    // Unchanged — proves nothing about the message content or its source job was touched.
    expect(after.renderedText).toBe('Your balance is Rp 5.000.000');
    expect(after.inboundJobId).toBe(job.id);
    expect(await resources!.prisma.transaction.count({ where: { userId: user.id } })).toBe(0);
  });

  it('reconcile-turn marks a stale RUNNING turn FAILED without creating a draft, idempotency record, or transaction', async () => {
    const user = await fixtureUser('stale-turn');
    const conversation = await resources!.prisma.assistantConversation.create({ data: { userId: user.id } });
    const staleStartedAt = new Date(Date.now() - STALE_RUNNING_TURN_MS - 60_000);
    const turn = await resources!.prisma.assistantTurn.create({
      data: {
        conversationId: conversation.id,
        correlationId: `corr-${Date.now()}-${Math.random()}`,
        status: 'RUNNING',
        intent: 'transaction.create',
        locale: 'id-ID',
        startedAt: staleStartedAt,
      },
    });

    expect(canReconcileStaleTurn(turn, new Date(), STALE_RUNNING_TURN_MS)).toBe(true);
    const update = buildReconcileTurnUpdate();
    const result = await resources!.prisma.assistantTurn.updateMany({
      where: { id: turn.id, status: 'RUNNING' },
      data: update,
    });
    expect(result.count).toBe(1);

    const after = await resources!.prisma.assistantTurn.findUniqueOrThrow({ where: { id: turn.id } });
    expect(after.status).toBe('FAILED');
    expect(after.safeErrorCode).toBe('operator_reconciled_stale_turn');
    expect(after.finishedAt).not.toBeNull();
    expect(await resources!.prisma.assistantFinancialDraft.count({ where: { originatingTurnId: turn.id } })).toBe(0);
    expect(await resources!.prisma.assistantIdempotencyRecord.count({ where: { userId: user.id } })).toBe(0);
    expect(await resources!.prisma.transaction.count({ where: { userId: user.id } })).toBe(0);
  });

  it('a raced write (row already changed) applies to zero rows instead of overwriting', async () => {
    const job = await resources!.prisma.channelInboundJob.create({
      data: {
        provider: 'TELEGRAM',
        externalUpdateId: `upd-${Date.now()}-${Math.random()}`,
        externalSenderId: 'tg-sender',
        externalChatId: 'tg-chat',
        text: 'race',
        status: 'FAILED_TERMINAL',
        errorCategory: 'ambiguous_assistant_execution',
      },
    });
    // Simulate another operator already having reviewed it — read stale, status same but
    // guard condition still narrows to id + status, so this scenario instead proves the
    // guard rejects an id whose status has since moved off FAILED_TERMINAL.
    await resources!.prisma.channelInboundJob.update({ where: { id: job.id }, data: { status: 'FAILED_RETRYABLE' } });

    const result = await resources!.prisma.channelInboundJob.updateMany({
      where: { id: job.id, status: 'FAILED_TERMINAL' },
      data: buildMarkReviewedUpdate('operator-bob', 'late'),
    });
    expect(result.count).toBe(0);
  });
});
