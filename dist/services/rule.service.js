"use strict";
// ============================================================
// Rule command service (Phase 20)
// ------------------------------------------------------------
// Owns Rule CRUD business rules: ownership checks, priority
// assignment/reordering, and value validation. No Express
// dependency; returns the raw persisted Rule or throws a typed
// RuleError. Mirrors merchantMapping.service.ts's shape.
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ruleService = void 0;
exports.createRuleService = createRuleService;
const prisma_1 = __importDefault(require("../lib/prisma"));
const rule_errors_1 = require("./rule.errors");
const VALID_MATCH_TYPES = ['DESCRIPTION', 'MERCHANT', 'TRANSACTION_TYPE'];
const VALID_OPERATORS = ['CONTAINS', 'EQUALS', 'STARTS_WITH', 'ENDS_WITH'];
const VALID_TRANSACTION_TYPES = ['INCOME', 'EXPENSE', 'TRANSFER'];
/** Trim and validate a rule name. */
function parseName(value) {
    const name = value?.trim() ?? '';
    if (name.length === 0) {
        throw new rule_errors_1.RuleError('name is required', 400, 'BAD_REQUEST');
    }
    return name;
}
/** Trim and validate a rule value, checking TRANSACTION_TYPE against the closed enum. */
function parseValue(matchType, value) {
    const trimmed = value?.trim() ?? '';
    if (trimmed.length === 0) {
        throw new rule_errors_1.RuleError('value is required', 400, 'BAD_REQUEST');
    }
    if (matchType === 'TRANSACTION_TYPE' && !VALID_TRANSACTION_TYPES.includes(trimmed.toUpperCase())) {
        throw new rule_errors_1.RuleError('value must be INCOME, EXPENSE, or TRANSFER for a TRANSACTION_TYPE rule', 422, 'INVALID_RULE_VALUE');
    }
    return trimmed;
}
function assertMatchType(matchType) {
    if (!VALID_MATCH_TYPES.includes(matchType)) {
        throw new rule_errors_1.RuleError('matchType must be DESCRIPTION, MERCHANT, or TRANSACTION_TYPE', 400, 'BAD_REQUEST');
    }
}
function assertOperator(operator) {
    if (!VALID_OPERATORS.includes(operator)) {
        throw new rule_errors_1.RuleError('operator must be CONTAINS, EQUALS, STARTS_WITH, or ENDS_WITH', 400, 'BAD_REQUEST');
    }
}
function createRuleService(db) {
    /** Ownership-scoped lookup; a missing or another user's rule is one indistinguishable 404. */
    async function findOwned(userId, id) {
        const rule = await db.rule.findFirst({ where: { id, userId } });
        if (!rule) {
            throw new rule_errors_1.RuleError('Rule tidak ditemukan', 404, 'NOT_FOUND');
        }
        return rule;
    }
    async function assertCategoryOwnership(userId, categoryId) {
        const category = await db.category.findFirst({ where: { id: categoryId, userId } });
        if (!category) {
            throw new rule_errors_1.RuleError('Kategori tidak ditemukan', 404, 'CATEGORY_NOT_FOUND');
        }
    }
    async function list(input) {
        return db.rule.findMany({
            where: { userId: input.userId },
            orderBy: { priority: 'asc' },
        });
    }
    /** New rules are appended after the user's current lowest-priority (last-evaluated) rule. */
    async function nextPriority(userId) {
        const last = await db.rule.findFirst({
            where: { userId },
            orderBy: { priority: 'desc' },
            select: { priority: true },
        });
        return (last?.priority ?? -1) + 1;
    }
    async function create(input) {
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
    async function update(input) {
        const { userId, ruleId } = input;
        const existing = await findOwned(userId, ruleId);
        const matchType = input.matchType !== undefined ? (assertMatchType(input.matchType), input.matchType) : existing.matchType;
        if (input.operator !== undefined)
            assertOperator(input.operator);
        const data = {};
        if (input.name !== undefined)
            data.name = parseName(input.name);
        if (input.enabled !== undefined)
            data.enabled = input.enabled;
        if (input.matchType !== undefined)
            data.matchType = input.matchType;
        if (input.operator !== undefined)
            data.operator = input.operator;
        if (input.value !== undefined || input.matchType !== undefined) {
            data.value = parseValue(matchType, input.value ?? existing.value);
        }
        if (input.categoryId !== undefined) {
            await assertCategoryOwnership(userId, input.categoryId);
            data.categoryId = input.categoryId;
        }
        return db.rule.update({ where: { id: ruleId }, data });
    }
    async function remove(input) {
        const { userId, ruleId } = input;
        await findOwned(userId, ruleId);
        await db.rule.delete({ where: { id: ruleId } });
    }
    /**
     * Rewrite priorities from an explicit, complete ordering of the user's
     * rule ids. Rejected if any id is missing, duplicated, or not owned by
     * the user — a partial or foreign list would silently corrupt ordering.
     */
    async function reorder(input) {
        const { userId, ruleIds } = input;
        const uniqueIds = new Set(ruleIds);
        if (uniqueIds.size !== ruleIds.length) {
            throw new rule_errors_1.RuleError('ruleIds must not contain duplicates', 400, 'INVALID_PRIORITY_ORDER');
        }
        const owned = await db.rule.findMany({ where: { userId }, select: { id: true } });
        const ownedIds = new Set(owned.map((r) => r.id));
        if (ownedIds.size !== uniqueIds.size || [...ownedIds].some((id) => !uniqueIds.has(id))) {
            throw new rule_errors_1.RuleError('ruleIds must contain exactly the user\'s current rules', 400, 'INVALID_PRIORITY_ORDER');
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
exports.ruleService = createRuleService(prisma_1.default);
//# sourceMappingURL=rule.service.js.map