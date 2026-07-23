"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ASSISTANT_CONTEXT_LIMITS = void 0;
exports.assembleAssistantContext = assembleAssistantContext;
const context_serializer_1 = require("./context.serializer");
exports.DEFAULT_ASSISTANT_CONTEXT_LIMITS = Object.freeze({
    messages: 40,
    turns: 20,
    toolExecutions: 10,
    pendingDrafts: 1,
    maxSerializedBytes: 64 * 1024,
});
const HIDDEN_KEY_FRAGMENT = /(correlation|policy|risk|prisma|database|stack|sql|lock|idempotency|audit|reasoning|argument|raw|payload|executionmetadata)/i;
function compareText(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
}
function isHiddenKey(key) {
    const normalized = key.replace(/[_-]/g, '');
    if (normalized.toLowerCase() === 'draftid')
        return false;
    if (/^id$/i.test(key) || /(?:Id|ID|_id|_ID|-id|-ID)$/.test(key))
        return true;
    if (/^(?:user|owner|request|conversation|turn|message|execution|transaction|wallet|category|resource)id$/i.test(normalized))
        return true;
    return HIDDEN_KEY_FRAGMENT.test(normalized);
}
function compareNewest(a, b) {
    return b.createdAt.getTime() - a.createdAt.getTime() || compareText(b.id, a.id);
}
function canonicalSafeValue(value) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean')
        return value;
    if (typeof value === 'number')
        return Number.isFinite(value) ? value : undefined;
    if (Array.isArray(value))
        return value.map(canonicalSafeValue).filter((item) => item !== undefined);
    if (typeof value !== 'object')
        return undefined;
    const result = {};
    for (const key of Object.keys(value).sort()) {
        if (isHiddenKey(key))
            continue;
        const mapped = canonicalSafeValue(value[key]);
        if (mapped !== undefined)
            result[key] = mapped;
    }
    return result;
}
function normalizedDecimal(value) {
    const raw = value.toString();
    if (!raw.includes('.'))
        return raw;
    return raw.replace(/0+$/, '').replace(/\.$/, '');
}
function draftContext(row) {
    if (!row)
        return undefined;
    return {
        draftId: row.id,
        operation: row.operation,
        status: row.status,
        preview: {
            type: row.transactionType,
            amount: normalizedDecimal(row.amount),
            date: row.transactionDate.toISOString(),
            ...(row.description === null ? {} : { description: row.description }),
        },
        expiresAt: row.expiresAt.toISOString(),
        confirmationRequired: true,
    };
}
function selectMessages(rows, limits) {
    const newest = [...rows].sort(compareNewest);
    const latestAssistant = newest.find((message) => message.role === 'ASSISTANT');
    const selected = latestAssistant
        ? [latestAssistant, ...newest.filter((message) => message.id !== latestAssistant.id).slice(0, Math.max(0, limits.messages - 1))]
        : newest.slice(0, limits.messages);
    const turnOrder = [...new Map(newest.map((message) => [message.turnId, message])).values()];
    const allowedTurns = new Set();
    if (latestAssistant)
        allowedTurns.add(latestAssistant.turnId);
    for (const message of turnOrder) {
        if (allowedTurns.size >= limits.turns)
            break;
        allowedTurns.add(message.turnId);
    }
    return selected.filter((message) => allowedTurns.has(message.turnId));
}
function mapTurns(messages) {
    const latestAssistant = [...messages].sort(compareNewest).find((message) => message.role === 'ASSISTANT');
    const grouped = new Map();
    for (const message of messages)
        grouped.set(message.turnId, [...(grouped.get(message.turnId) ?? []), message]);
    return [...grouped.entries()].map(([turnId, rows]) => {
        const ordered = [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || compareText(a.id, b.id));
        return {
            _id: turnId,
            _time: ordered[0].turn.createdAt.getTime(),
            _protected: ordered.some((row) => row.id === latestAssistant?.id),
            status: ordered[0].turn.status,
            timestamp: ordered[0].turn.createdAt.toISOString(),
            messages: ordered.map((row) => ({ role: row.role, content: row.content, source: row.source, timestamp: row.createdAt.toISOString() })),
        };
    }).sort((a, b) => compareText(a.timestamp, b.timestamp) || compareText(a._id, b._id));
}
function mapTools(rows, limit) {
    return [...rows]
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime() || compareText(b.id, a.id))
        .slice(0, limit)
        .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime() || compareText(a.id, b.id))
        .map((row) => {
        const summary = canonicalSafeValue(row.outputSummary);
        return {
            _id: row.id,
            _time: row.startedAt.getTime(),
            tool: row.toolId,
            status: row.status,
            timestamp: row.startedAt.toISOString(),
            ...(summary && typeof summary === 'object' && Object.keys(summary).length > 0 ? { safeOutputSummary: summary } : {}),
        };
    });
}
function assembleAssistantContext(input, limits = exports.DEFAULT_ASSISTANT_CONTEXT_LIMITS) {
    const turns = mapTurns(selectMessages(input.messages, limits));
    const tools = mapTools(input.toolExecutions, limits.toolExecutions);
    const pendingDraft = limits.pendingDrafts > 0 ? draftContext(input.pendingDraft) : undefined;
    const materialize = () => ({
        system: { contextVersion: '1', locale: input.conversation.locale },
        conversation: {
            conversationId: input.conversation.id,
            createdAt: input.conversation.createdAt.toISOString(),
            updatedAt: input.conversation.updatedAt.toISOString(),
            archived: input.conversation.status === 'ARCHIVED',
        },
        turns: turns.map(({ _id, _time, _protected, ...turn }) => turn),
        ...(pendingDraft ? { pendingDraft } : {}),
        toolExecutions: tools.map(({ _id, _time, ...tool }) => tool),
        currentRequest: { role: 'USER', content: input.currentRequest, source: 'CURRENT_REQUEST' },
    });
    let context = materialize();
    while ((0, context_serializer_1.assistantContextByteLength)(context) > limits.maxSerializedBytes) {
        const oldestTurn = turns.find((turn) => !turn._protected);
        const oldestTool = tools[0];
        if (!oldestTurn && !oldestTool) {
            throw new Error(`Assistant context protected content exceeds ${limits.maxSerializedBytes} bytes`);
        }
        if (oldestTurn && (!oldestTool || oldestTurn._time < oldestTool._time
            || (oldestTurn._time === oldestTool._time && compareText(oldestTurn._id, oldestTool._id) <= 0))) {
            turns.splice(turns.indexOf(oldestTurn), 1);
        }
        else
            tools.shift();
        context = materialize();
    }
    return context;
}
//# sourceMappingURL=context.assembler.js.map