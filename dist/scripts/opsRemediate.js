"use strict";
// ============================================================
// Bounded operator remediation for the states src/scripts/opsVisibility.ts
// makes discoverable (Phase 29, PD-018/PD-019)
// ------------------------------------------------------------
// Three subcommands, each acting on exactly one explicit row id:
//   mark-reviewed     --job <id> --operator <name> --note <text>
//   requeue-outbound  --delivery <id>
//   reconcile-turn    --turn <id>
//
// Dry-run by default — prints what WOULD change. Pass --apply to write.
// Every write is a conditional `updateMany` re-asserting the same
// precondition the safety gate checked, so a raced/changed row fails safely
// instead of being overwritten.
//
// No subcommand ever flips an ambiguous job's `status` back to PENDING, calls
// into Assistant Core, or touches AssistantFinancialDraft/AssistantIdempotencyRecord/
// Transaction. See docs/development/telegram-deployment-runbook.md §8.2.
//
//   npx ts-node src/scripts/opsRemediate.ts <subcommand> [args] [--apply]
//   # or, after build: node dist/scripts/opsRemediate.js <subcommand> [args] [--apply]
//
// Exit code: 0 applied (or dry-run printed cleanly), 1 usage/not-eligible/
// raced/DB error — never 2 (this script doesn't report a scan, opsVisibility does).
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../lib/prisma"));
const logger_1 = require("../utils/logger");
const opsVisibility_1 = require("../domain/opsVisibility");
const opsRemediation_1 = require("../domain/opsRemediation");
function flagValue(args, flag) {
    const idx = args.indexOf(flag);
    return idx === -1 ? undefined : args[idx + 1];
}
async function markReviewed(args, apply) {
    const jobId = flagValue(args, '--job');
    const operator = flagValue(args, '--operator');
    const note = flagValue(args, '--note');
    if (!jobId || !operator || !note) {
        console.error('Usage: opsRemediate mark-reviewed --job <id> --operator <name> --note <text> [--apply]');
        return 1;
    }
    const job = await prisma_1.default.channelInboundJob.findUnique({
        where: { id: jobId },
        select: { id: true, status: true, errorCategory: true },
    });
    if (!job) {
        console.error(`No ChannelInboundJob with id ${jobId}`);
        return 1;
    }
    if (!(0, opsRemediation_1.canMarkReviewed)(job)) {
        console.error(`Job ${jobId} is not eligible: status=${job.status} errorCategory=${job.errorCategory}. ` +
            `Only FAILED_TERMINAL rows with an ambiguous errorCategory can be marked reviewed.`);
        return 1;
    }
    const update = (0, opsRemediation_1.buildMarkReviewedUpdate)(operator, note);
    console.log(`Job ${jobId}: would set ${JSON.stringify({ ...update, reviewNote: '[note omitted from log]' })}`);
    if (!apply) {
        console.log('DRY RUN — nothing changed. Pass --apply to apply.');
        return 0;
    }
    const result = await prisma_1.default.channelInboundJob.updateMany({
        where: { id: jobId, status: 'FAILED_TERMINAL' },
        data: update,
    });
    if (result.count !== 1) {
        console.error(`Job ${jobId} changed since it was read — nothing applied. Re-run to reassess.`);
        return 1;
    }
    (0, logger_1.logEvent)('warn', { event: 'ops.remediation.applied', operation: 'mark-reviewed', requestId: jobId, outcome: 'applied' });
    console.log(`Job ${jobId}: marked reviewed.`);
    return 0;
}
async function requeueOutbound(args, apply) {
    const deliveryId = flagValue(args, '--delivery');
    if (!deliveryId) {
        console.error('Usage: opsRemediate requeue-outbound --delivery <id> [--apply]');
        return 1;
    }
    const delivery = await prisma_1.default.channelOutboundDelivery.findUnique({
        where: { id: deliveryId },
        select: { id: true, status: true },
    });
    if (!delivery) {
        console.error(`No ChannelOutboundDelivery with id ${deliveryId}`);
        return 1;
    }
    if (!(0, opsRemediation_1.canRequeueOutbound)(delivery)) {
        console.error(`Delivery ${deliveryId} is not eligible: status=${delivery.status}. Only FAILED_TERMINAL rows can be requeued.`);
        return 1;
    }
    const update = (0, opsRemediation_1.buildRequeueOutboundUpdate)();
    console.log(`Delivery ${deliveryId}: would set ${JSON.stringify(update)}`);
    if (!apply) {
        console.log('DRY RUN — nothing changed. Pass --apply to apply.');
        return 0;
    }
    const result = await prisma_1.default.channelOutboundDelivery.updateMany({
        where: { id: deliveryId, status: 'FAILED_TERMINAL' },
        data: update,
    });
    if (result.count !== 1) {
        console.error(`Delivery ${deliveryId} changed since it was read — nothing applied. Re-run to reassess.`);
        return 1;
    }
    (0, logger_1.logEvent)('warn', { event: 'ops.remediation.applied', operation: 'requeue-outbound', requestId: deliveryId, outcome: 'applied' });
    console.log(`Delivery ${deliveryId}: requeued.`);
    return 0;
}
async function reconcileTurn(args, apply) {
    const turnId = flagValue(args, '--turn');
    if (!turnId) {
        console.error('Usage: opsRemediate reconcile-turn --turn <id> [--apply]');
        return 1;
    }
    const turn = await prisma_1.default.assistantTurn.findUnique({
        where: { id: turnId },
        select: { id: true, status: true, startedAt: true },
    });
    if (!turn) {
        console.error(`No AssistantTurn with id ${turnId}`);
        return 1;
    }
    const now = new Date();
    if (!(0, opsRemediation_1.canReconcileStaleTurn)(turn, now, opsVisibility_1.STALE_RUNNING_TURN_MS)) {
        console.error(`Turn ${turnId} is not eligible: status=${turn.status} startedAt=${turn.startedAt.toISOString()}. ` +
            `Only RUNNING turns stale past ${opsVisibility_1.STALE_RUNNING_TURN_MS}ms can be reconciled.`);
        return 1;
    }
    const update = (0, opsRemediation_1.buildReconcileTurnUpdate)(now);
    console.log(`Turn ${turnId}: would set ${JSON.stringify(update)}`);
    if (!apply) {
        console.log('DRY RUN — nothing changed. Pass --apply to apply. Cross-check assistant_financial_drafts/transactions first (see runbook §8.2).');
        return 0;
    }
    const result = await prisma_1.default.assistantTurn.updateMany({
        where: { id: turnId, status: 'RUNNING' },
        data: update,
    });
    if (result.count !== 1) {
        console.error(`Turn ${turnId} changed since it was read — nothing applied. Re-run to reassess.`);
        return 1;
    }
    (0, logger_1.logEvent)('warn', { event: 'ops.remediation.applied', operation: 'reconcile-turn', requestId: turnId, outcome: 'applied' });
    console.log(`Turn ${turnId}: reconciled to FAILED.`);
    return 0;
}
async function main() {
    const [subcommand, ...rest] = process.argv.slice(2);
    const apply = rest.includes('--apply');
    switch (subcommand) {
        case 'mark-reviewed':
            return markReviewed(rest, apply);
        case 'requeue-outbound':
            return requeueOutbound(rest, apply);
        case 'reconcile-turn':
            return reconcileTurn(rest, apply);
        default:
            console.error('Usage: opsRemediate <mark-reviewed|requeue-outbound|reconcile-turn> [args] [--apply]');
            return 1;
    }
}
main()
    .then((code) => prisma_1.default.$disconnect().then(() => process.exit(code)))
    .catch(async (err) => {
    console.error('opsRemediate failed:', err instanceof Error ? err.message : String(err));
    await prisma_1.default.$disconnect();
    process.exit(1);
});
//# sourceMappingURL=opsRemediate.js.map