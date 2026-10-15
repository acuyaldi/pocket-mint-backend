import { assistantContextByteLength } from './context.serializer';
import { AssistantError } from './errors';
import type {
  AssistantContext,
  AssistantContextAssemblyInput,
  AssistantContextLimits,
  ContextMessageRow,
  DraftContext,
  ToolExecutionContext,
  TurnContext,
} from './context.types';

export const DEFAULT_ASSISTANT_CONTEXT_LIMITS: Readonly<AssistantContextLimits> = Object.freeze({
  messages: 40,
  turns: 20,
  toolExecutions: 10,
  pendingDrafts: 1,
  maxSerializedBytes: 64 * 1024,
});

const HIDDEN_KEYS = new Set([
  'id', 'userid', 'ownerid', 'requestid', 'conversationid', 'turnid', 'messageid', 'executionid',
  'transactionid', 'walletid', 'categoryid', 'resourceid', 'correlationid', 'idempotencykey',
  'policydecision', 'risk', 'risklevel', 'prisma', 'database', 'stack', 'sql', 'lock', 'audit',
  'reasoning', 'arguments', 'rawarguments', 'rawoutput', 'rawpayload', 'payload', 'executionmetadata',
  'inputaudit', 'password', 'token', 'secret', 'apikey', 'accesstoken', 'refreshtoken', 'balance',
  'proto', 'constructor', 'prototype',
]);

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function isHiddenKey(key: string): boolean {
  const normalized = key.replace(/[_-]/g, '').toLowerCase();
  return normalized !== 'draftid' && HIDDEN_KEYS.has(normalized);
}

function compareNewest(a: { createdAt: Date; id: string }, b: { createdAt: Date; id: string }) {
  return b.createdAt.getTime() - a.createdAt.getTime() || compareText(b.id, a.id);
}

function canonicalSafeValue(value: unknown, active = new WeakSet<object>()): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (Number.isFinite(value)) return value;
    throw AssistantError.unsupportedContextData();
  }
  if (typeof value !== 'object') throw AssistantError.unsupportedContextData();
  if (active.has(value)) throw AssistantError.unsupportedContextData();
  active.add(value);
  if (Array.isArray(value)) {
    const mapped = value.map((item) => canonicalSafeValue(item, active));
    active.delete(value);
    return mapped;
  }
  if (Object.getPrototypeOf(value) !== Object.prototype) throw AssistantError.unsupportedContextData();
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    if (isHiddenKey(key)) continue;
    result[key] = canonicalSafeValue((value as Record<string, unknown>)[key], active);
  }
  active.delete(value);
  return result;
}

export function validateAssistantContextLimits(limits: AssistantContextLimits): void {
  const integers = [limits.messages, limits.turns, limits.toolExecutions, limits.pendingDrafts, limits.maxSerializedBytes];
  if (integers.some((value) => !Number.isSafeInteger(value))
    || limits.messages < 1 || limits.messages > 1_000
    || limits.turns < 1 || limits.turns > 500
    || limits.toolExecutions < 0 || limits.toolExecutions > 100
    || limits.pendingDrafts < 0 || limits.pendingDrafts > 1
    || limits.maxSerializedBytes < 1_024 || limits.maxSerializedBytes > 1024 * 1024) {
    throw AssistantError.invalidContextConfiguration();
  }
}

function normalizedDecimal(value: { toString(): string }): string {
  const raw = value.toString();
  if (!raw.includes('.')) return raw;
  return raw.replace(/0+$/, '').replace(/\.$/, '');
}

function draftContext(row: AssistantContextAssemblyInput['pendingDraft']): DraftContext | undefined {
  if (!row) return undefined;
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

function selectMessages(rows: readonly ContextMessageRow[], limits: AssistantContextLimits): ContextMessageRow[] {
  const newest = [...rows].sort(compareNewest);
  const latestAssistant = newest.find((message) => message.role === 'ASSISTANT');
  const selected = latestAssistant
    ? [latestAssistant, ...newest.filter((message) => message.id !== latestAssistant.id).slice(0, Math.max(0, limits.messages - 1))]
    : newest.slice(0, limits.messages);

  const turnOrder = [...new Map(newest.map((message) => [message.turnId, message])).values()];
  const allowedTurns = new Set<string>();
  if (latestAssistant) allowedTurns.add(latestAssistant.turnId);
  for (const message of turnOrder) {
    if (allowedTurns.size >= limits.turns) break;
    allowedTurns.add(message.turnId);
  }
  return selected.filter((message) => allowedTurns.has(message.turnId));
}

function mapTurns(messages: readonly ContextMessageRow[]): Array<TurnContext & { _id: string; _time: number; _protected: boolean }> {
  const latestAssistant = [...messages].sort(compareNewest).find((message) => message.role === 'ASSISTANT');
  const grouped = new Map<string, ContextMessageRow[]>();
  for (const message of messages) grouped.set(message.turnId, [...(grouped.get(message.turnId) ?? []), message]);
  return [...grouped.entries()].map(([turnId, rows]) => {
    const ordered = [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || compareText(a.id, b.id));
    return {
      _id: turnId,
      _time: ordered[0]!.turn.createdAt.getTime(),
      _protected: ordered.some((row) => row.id === latestAssistant?.id),
      status: ordered[0]!.turn.status,
      timestamp: ordered[0]!.turn.createdAt.toISOString(),
      messages: ordered.map((row) => ({ role: row.role, content: row.content, source: row.source, timestamp: row.createdAt.toISOString() })),
    };
  }).sort((a, b) => compareText(a.timestamp, b.timestamp) || compareText(a._id, b._id));
}

function mapTools(rows: AssistantContextAssemblyInput['toolExecutions'], limit: number): Array<ToolExecutionContext & { _id: string; _time: number }> {
  return [...rows]
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime() || compareText(b.id, a.id))
    .slice(0, limit)
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime() || compareText(a.id, b.id))
    .map((row) => {
      const summary = row.outputSummary === null ? undefined : canonicalSafeValue(row.outputSummary);
      const hasSummary = summary !== undefined
        && (typeof summary !== 'object' || Object.keys(summary as object).length > 0);
      return {
        _id: row.id,
        _time: row.startedAt.getTime(),
        tool: row.toolId,
        status: row.status,
        timestamp: row.startedAt.toISOString(),
        ...(hasSummary ? { safeOutputSummary: summary } : {}),
      };
    });
}

export function assembleAssistantContext(
  input: AssistantContextAssemblyInput,
  limits: AssistantContextLimits = DEFAULT_ASSISTANT_CONTEXT_LIMITS,
): AssistantContext {
  validateAssistantContextLimits(limits);
  const turns = mapTurns(selectMessages(input.messages, limits));
  const tools = mapTools(input.toolExecutions, limits.toolExecutions);
  const pendingDraft = limits.pendingDrafts > 0 ? draftContext(input.pendingDraft) : undefined;

  const materialize = (): AssistantContext => ({
    system: { contextVersion: '1', locale: input.conversation.locale },
    conversation: {
      conversationId: input.conversation.id,
      createdAt: input.conversation.createdAt.toISOString(),
      updatedAt: input.conversation.updatedAt.toISOString(),
      archived: input.conversation.status === 'ARCHIVED',
    },
    turns: turns.map(({ _id, _time, _protected, ...turn }) => turn),
    toolExecutions: tools.map(({ _id, _time, ...tool }) => tool),
    ...(pendingDraft ? { pendingDraft } : {}),
    currentRequest: { role: 'USER', content: input.currentRequest, source: 'CURRENT_REQUEST' },
  });

  let context = materialize();
  while (assistantContextByteLength(context) > limits.maxSerializedBytes) {
    const oldestTurn = turns.find((turn) => !turn._protected);
    const oldestTool = tools[0];
    if (!oldestTurn && !oldestTool) {
      throw AssistantError.contextTooLarge();
    }
    if (oldestTurn && (!oldestTool || oldestTurn._time < oldestTool._time
      || (oldestTurn._time === oldestTool._time && compareText(oldestTurn._id, oldestTool._id) <= 0))) {
      turns.splice(turns.indexOf(oldestTurn), 1);
    }
    else tools.shift();
    context = materialize();
  }
  return context;
}
