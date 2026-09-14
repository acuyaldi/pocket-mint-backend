"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.channelOperationId = channelOperationId;
exports.beginAssistantOperation = beginAssistantOperation;
exports.completeAssistantOperation = completeAssistantOperation;
exports.beginCallbackOperation = beginCallbackOperation;
exports.completeCallbackOperation = completeCallbackOperation;
function channelOperationId(provider, inboundJobId) {
    return `channel:${provider.toLowerCase()}:${inboundJobId}`;
}
/**
 * Operation-identity guard binding one inbound job to at most one Assistant
 * turn (see docs/product/decisions/015). Telegram never supplies an
 * `Idempotency-Key` (Phase 27, PD-017 — the Assistant module itself now has
 * a request-level idempotency contract for Web), so this channel-layer guard
 * remains Telegram's sole protection, unaffected by and unchanged since
 * Phase 27. Insert-first-wins: a conflict means a previous attempt on this
 * exact job already started.
 */
async function beginAssistantOperation(db, operationId, userId) {
    try {
        await db.channelAssistantOperation.create({ data: { id: operationId, userId } });
        return { status: 'new' };
    }
    catch (error) {
        if (error.code !== 'P2002')
            throw error;
        const existing = await db.channelAssistantOperation.findUniqueOrThrow({ where: { id: operationId } });
        return existing.turnId && existing.renderedText
            ? { status: 'replay', turnId: existing.turnId, renderedText: existing.renderedText }
            : { status: 'ambiguous' };
    }
}
async function completeAssistantOperation(db, operationId, turnId, renderedText) {
    await db.channelAssistantOperation.update({ where: { id: operationId }, data: { turnId, renderedText } });
}
/**
 * Same insert-first-wins operation-identity guard as `beginAssistantOperation`,
 * but for a CALLBACK_INTERACTION — never an Assistant turn. One inbound
 * callback job maps to at most one interaction operation.
 */
async function beginCallbackOperation(db, operationId, userId, callbackTokenId) {
    try {
        await db.channelAssistantOperation.create({ data: { id: operationId, userId, kind: 'CALLBACK_INTERACTION', callbackTokenId } });
        return { status: 'new' };
    }
    catch (error) {
        if (error.code !== 'P2002')
            throw error;
        const existing = await db.channelAssistantOperation.findUniqueOrThrow({ where: { id: operationId } });
        return existing.terminalStatus && existing.renderedText
            ? { status: 'replay', terminalStatus: existing.terminalStatus, renderedText: existing.renderedText }
            : { status: 'ambiguous' };
    }
}
async function completeCallbackOperation(db, operationId, terminalStatus, renderedText) {
    await db.channelAssistantOperation.update({ where: { id: operationId }, data: { terminalStatus, renderedText } });
}
//# sourceMappingURL=assistantOperationGuard.js.map