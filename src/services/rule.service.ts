// ============================================================
// Rule command service (Phase 20)
// ------------------------------------------------------------
// Owns Rule CRUD business rules: ownership checks, priority
// assignment/reordering, and value validation. No Express
// dependency; returns the raw persisted Rule or throws a typed
// RuleError. Mirrors merchantMapping.service.ts's shape.
// ============================================================

import prisma from '../lib/prisma';
import { RuleError } from './rule.errors';
import type {
  CreateRuleInput,
  DeleteRuleInput,
  ListRulesInput,
  ReorderRulesInput,
  RuleMatchType,
  RuleOperator,
  RulePrismaClient,
  RuleRecord,
  UpdateRuleInput,
} from './rule.types';

const VALID_MATCH_TYPES: RuleMatchType[] = ['DESCRIPTION', 'MERCHANT', 'TRANSACTION_TYPE'];
const VALID_OPERATORS: RuleOperator[] = ['CONTAINS', 'EQUALS', 'STARTS_WITH', 'ENDS_WITH'];
const VALID_TRANSACTION_TYPES = ['INCOME', 'EXPENSE', 'TRANSFER'];

/** Trim and validate a rule name. */
function parseName(value: string | undefined): string {
  const name = value?.trim() ?? '';
  if (name.length === 0) {
    throw new RuleError('name is required', 400, 'BAD_REQUEST');
  }
  return name;
}

/** Trim and validate a rule value, checking TRANSACTION_TYPE against the closed enum. */
function parseValue(matchType: RuleMatchType, value: string | undefined): string {
  const trimmed = value?.trim() ?? '';
  if (trimmed.length === 0) {
    throw new RuleError('value is required', 400, 'BAD_REQUEST');
  }
  if (matchType === 'TRANSACTION_TYPE' && !VALID_TRANSACTION_TYPES.includes(trimmed.toUpperCase())) {
    throw new RuleError('value must be INCOME, EXPENSE, or TRANSFER for a TRANSACTION_TYPE rule', 422, 'INVALID_RULE_VALUE');
  }
  return trimmed;
}

function assertMatchType(matchType: string): asserts matchType is RuleMatchType {
  if (!VALID_MATCH_TYPES.includes(matchType as RuleMatchType)) {
    throw new RuleError('matchType must be DESCRIPTION, MERCHANT, or TRANSACTION_TYPE', 400, 'BAD_REQUEST');
  }
}

function assertOperator(operator: string): asserts operator is RuleOperator {
  if (!VALID_OPERATORS.includes(operator as RuleOperator)) {
    throw new RuleError('operator must be CONTAINS, EQUALS, STARTS_WITH, or ENDS_WITH', 400, 'BAD_REQUEST');
  }
}

export function createRuleService(db: RulePrismaClient) {
  /** Ownership-scoped lookup; a missing or another user's rule is one indistinguishable 404. */
  async function findOwned(userId: string, id: string): Promise<RuleRecord> {
    const rule = await db.rule.findFirst({ where: { id, userId } });
    if (!rule) {
      throw new RuleError('Rule tidak ditemukan', 404, 'NOT_FOUND');
    }
    return rule;
  }

  async function assertCategoryOwnership(userId: string, categoryId: string): Promise<void> {
    const category = await db.category.findFirst({ where: { id: categoryId, userId } });
    if (!category) {
      throw new RuleError('Kategori tidak ditemukan', 404, 'CATEGORY_NOT_FOUND');
    }
  }

  async function list(input: ListRulesInput): Promise<RuleRecord[]> {
    return db.rule.findMany({
      where: { userId: input.userId },
      orderBy: { priority: 'asc' },
    });
  }

  /** New rules are appended after the user's current lowest-priority (last-evaluated) rule. */
  async function nextPriority(userId: string): Promise<number> {
    const last = await db.rule.findFirst({
      where: { userId },
      orderBy: { priority: 'desc' },
      select: { priority: true },
    });
    return (last?.priority ?? -1) + 1;
  }

  async function create(input: CreateRuleInput): Promise<RuleRecord> {
    const { userId, categoryId } = input;
    assertMatchType(input.matchType);
    assertOperator(input.operator);
    const name = parseName(input.name);
    const value = parseValue(input.matchType, input.value);

    await assertCategoryOwnership(userId, categoryId);
    const priority = await nextPriority(userId);

    return db.rule.create({
      data: {
        userId,
        name,
        enabled: input.enabled ?? true,
        priority,
        matchType: input.matchType,
        operator: input.operator,
        value,
        categoryId,
      },
    });
  }

  async function update(input: UpdateRuleInput): Promise<RuleRecord> {
    const { userId, ruleId } = input;
    const existing = await findOwned(userId, ruleId);

    const matchType = input.matchType !== undefined ? (assertMatchType(input.matchType), input.matchType) : existing.matchType;
    if (input.operator !== undefined) assertOperator(input.operator);

    const data: {
      name?: string;
      enabled?: boolean;
      matchType?: RuleMatchType;
      operator?: RuleOperator;
      value?: string;
      categoryId?: string;
    } = {};

    if (input.name !== undefined) data.name = parseName(input.name);
    if (input.enabled !== undefined) data.enabled = input.enabled;
    if (input.matchType !== undefined) data.matchType = input.matchType;
    if (input.operator !== undefined) data.operator = input.operator;
    if (input.value !== undefined || input.matchType !== undefined) {
      data.value = parseValue(matchType, input.value ?? existing.value);
    }
    if (input.categoryId !== undefined) {
      await assertCategoryOwnership(userId, input.categoryId);
      data.categoryId = input.categoryId;
    }

    return db.rule.update({ where: { id: ruleId }, data });
  }

  async function remove(input: DeleteRuleInput): Promise<void> {
    const { userId, ruleId } = input;
    await findOwned(userId, ruleId);
    await db.rule.delete({ where: { id: ruleId } });
  }

  /**
   * Rewrite priorities from an explicit, complete ordering of the user's
   * rule ids. Rejected if any id is missing, duplicated, or not owned by
   * the user — a partial or foreign list would silently corrupt ordering.
   */
  async function reorder(input: ReorderRulesInput): Promise<RuleRecord[]> {
    const { userId, ruleIds } = input;
    const uniqueIds = new Set(ruleIds);
    if (uniqueIds.size !== ruleIds.length) {
      throw new RuleError('ruleIds must not contain duplicates', 400, 'INVALID_PRIORITY_ORDER');
    }

    const owned = await db.rule.findMany({ where: { userId }, select: { id: true } });
    const ownedIds = new Set(owned.map((r) => r.id));
    if (ownedIds.size !== uniqueIds.size || [...ownedIds].some((id) => !uniqueIds.has(id))) {
      throw new RuleError('ruleIds must contain exactly the user\'s current rules', 400, 'INVALID_PRIORITY_ORDER');
    }

    // ponytail: not wrapped in a DB transaction (RulePrismaClient only picks
    // `rule`/`category`, not $transaction) — a crash mid-reorder can leave
    // priorities interleaved. Upgrade to db.$transaction if concurrent
    // reordering from multiple tabs becomes a real complaint.
    await Promise.all(ruleIds.map((id, index) => db.rule.update({ where: { id }, data: { priority: index } })));
    return list({ userId });
  }

  return { list, create, update, remove, reorder };
}

/** Production instance bound to the shared Prisma singleton. */
export const ruleService = createRuleService(prisma);
