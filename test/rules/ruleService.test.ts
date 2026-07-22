import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/lib/prisma', () => ({ default: {} }));

import { createRuleService } from '../../src/services/rule.service';
import { RuleError } from '../../src/services/rule.errors';

const USER = 'user-1';
const OTHER_USER = 'user-2';

function makeRule(over: Record<string, unknown> = {}) {
  return {
    id: 'rule-1',
    userId: USER,
    name: 'Gopay → Transport',
    enabled: true,
    priority: 0,
    matchType: 'DESCRIPTION',
    operator: 'CONTAINS',
    value: 'GOPAY',
    categoryId: 'cat-1',
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    ...over,
  };
}

function makeCategory(over: Record<string, unknown> = {}) {
  return { id: 'cat-1', userId: USER, name: 'Transportasi', type: 'EXPENSE', ...over };
}

function makeDb(over: {
  ruleFindFirst?: unknown;
  categoryFindFirst?: unknown;
  ruleFindMany?: unknown[];
  ruleFindManyPriorityDesc?: unknown;
  ruleCreate?: (args: unknown) => unknown;
  ruleUpdate?: (args: unknown) => unknown;
} = {}) {
  return {
    rule: {
      findFirst: vi.fn(async (args: { orderBy?: { priority?: string } }) => {
        if (args?.orderBy?.priority === 'desc') return over.ruleFindManyPriorityDesc ?? null;
        return over.ruleFindFirst ?? null;
      }),
      findMany: vi.fn(async () => over.ruleFindMany ?? []),
      create: vi.fn(async (args: unknown) => (over.ruleCreate ? over.ruleCreate(args) : { id: 'new-rule', ...(args as { data: object }).data })),
      update: vi.fn(async (args: unknown) => (over.ruleUpdate ? over.ruleUpdate(args) : { ...makeRule(), ...(args as { data: object }).data })),
      delete: vi.fn(async () => makeRule()),
    },
    category: {
      findFirst: vi.fn(async () => over.categoryFindFirst ?? null),
    },
  };
}

describe('rule service — create', () => {
  it('creates a rule appended after the last priority', async () => {
    const db = makeDb({ categoryFindFirst: makeCategory(), ruleFindManyPriorityDesc: { priority: 2 } });
    const service = createRuleService(db as any);

    await service.create({ userId: USER, name: 'Gopay', matchType: 'DESCRIPTION', operator: 'CONTAINS', value: 'GOPAY', categoryId: 'cat-1' });

    expect(db.rule.create).toHaveBeenCalledWith({
      data: { userId: USER, name: 'Gopay', enabled: true, priority: 3, matchType: 'DESCRIPTION', operator: 'CONTAINS', value: 'GOPAY', categoryId: 'cat-1' },
    });
  });

  it('starts priority at 0 for a user\'s first rule', async () => {
    const db = makeDb({ categoryFindFirst: makeCategory(), ruleFindManyPriorityDesc: null });
    const service = createRuleService(db as any);
    await service.create({ userId: USER, name: 'Gopay', matchType: 'DESCRIPTION', operator: 'CONTAINS', value: 'GOPAY', categoryId: 'cat-1' });
    expect(db.rule.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ priority: 0 }) }));
  });

  it('rejects an empty name', async () => {
    const db = makeDb({ categoryFindFirst: makeCategory() });
    const service = createRuleService(db as any);
    await expect(service.create({ userId: USER, name: '  ', matchType: 'DESCRIPTION', operator: 'CONTAINS', value: 'GOPAY', categoryId: 'cat-1' })).rejects.toThrow(RuleError);
  });

  it('rejects an empty value', async () => {
    const db = makeDb({ categoryFindFirst: makeCategory() });
    const service = createRuleService(db as any);
    await expect(service.create({ userId: USER, name: 'x', matchType: 'DESCRIPTION', operator: 'CONTAINS', value: '  ', categoryId: 'cat-1' })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('rejects a TRANSACTION_TYPE rule whose value is not INCOME/EXPENSE/TRANSFER', async () => {
    const db = makeDb({ categoryFindFirst: makeCategory() });
    const service = createRuleService(db as any);
    await expect(service.create({ userId: USER, name: 'x', matchType: 'TRANSACTION_TYPE', operator: 'EQUALS', value: 'BOGUS', categoryId: 'cat-1' })).rejects.toMatchObject({ code: 'INVALID_RULE_VALUE' });
  });

  it('rejects an invalid matchType', async () => {
    const db = makeDb({ categoryFindFirst: makeCategory() });
    const service = createRuleService(db as any);
    await expect(service.create({ userId: USER, name: 'x', matchType: 'BOGUS' as any, operator: 'EQUALS', value: 'x', categoryId: 'cat-1' })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('rejects when the category does not exist or is not owned by the user', async () => {
    const db = makeDb({ categoryFindFirst: null });
    const service = createRuleService(db as any);
    await expect(service.create({ userId: USER, name: 'x', matchType: 'DESCRIPTION', operator: 'CONTAINS', value: 'GOPAY', categoryId: 'cat-x' })).rejects.toMatchObject({ code: 'CATEGORY_NOT_FOUND', statusCode: 404 });
  });
});

describe('rule service — update', () => {
  it('updates enabled without touching other fields', async () => {
    const db = makeDb({ ruleFindFirst: makeRule() });
    const service = createRuleService(db as any);
    await service.update({ userId: USER, ruleId: 'rule-1', enabled: false });
    expect(db.rule.update).toHaveBeenCalledWith({ where: { id: 'rule-1' }, data: { enabled: false } });
  });

  it('re-validates value against the new matchType when both change', async () => {
    const db = makeDb({ ruleFindFirst: makeRule() });
    const service = createRuleService(db as any);
    await expect(service.update({ userId: USER, ruleId: 'rule-1', matchType: 'TRANSACTION_TYPE', value: 'NOT_A_TYPE' })).rejects.toMatchObject({ code: 'INVALID_RULE_VALUE' });
  });

  it('re-validates the existing value when only matchType changes', async () => {
    const db = makeDb({ ruleFindFirst: makeRule({ value: 'GOPAY' }) });
    const service = createRuleService(db as any);
    await expect(service.update({ userId: USER, ruleId: 'rule-1', matchType: 'TRANSACTION_TYPE' })).rejects.toMatchObject({ code: 'INVALID_RULE_VALUE' });
  });

  it('validates category ownership when categoryId changes', async () => {
    const db = makeDb({ ruleFindFirst: makeRule(), categoryFindFirst: null });
    const service = createRuleService(db as any);
    await expect(service.update({ userId: USER, ruleId: 'rule-1', categoryId: 'cat-x' })).rejects.toMatchObject({ code: 'CATEGORY_NOT_FOUND' });
  });

  it('rejects updating a rule owned by another user (404, indistinguishable from missing)', async () => {
    const db = makeDb({ ruleFindFirst: null });
    const service = createRuleService(db as any);
    await expect(service.update({ userId: OTHER_USER, ruleId: 'rule-1', enabled: false })).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });
});

describe('rule service — delete', () => {
  it('deletes an owned rule', async () => {
    const db = makeDb({ ruleFindFirst: makeRule() });
    const service = createRuleService(db as any);
    await service.remove({ userId: USER, ruleId: 'rule-1' });
    expect(db.rule.delete).toHaveBeenCalledWith({ where: { id: 'rule-1' } });
  });

  it('rejects deleting a rule owned by another user', async () => {
    const db = makeDb({ ruleFindFirst: null });
    const service = createRuleService(db as any);
    await expect(service.remove({ userId: OTHER_USER, ruleId: 'rule-1' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(db.rule.delete).not.toHaveBeenCalled();
  });
});

describe('rule service — list', () => {
  it('lists rules scoped to the user, ordered by priority', async () => {
    const db = makeDb({ ruleFindMany: [makeRule()] });
    const service = createRuleService(db as any);
    await service.list({ userId: USER });
    expect(db.rule.findMany).toHaveBeenCalledWith({ where: { userId: USER }, orderBy: { priority: 'asc' } });
  });
});

describe('rule service — reorder', () => {
  it('rewrites priorities to match the given order', async () => {
    const db = makeDb({ ruleFindMany: [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }] });
    const service = createRuleService(db as any);
    await service.reorder({ userId: USER, ruleIds: ['r3', 'r1', 'r2'] });
    expect(db.rule.update).toHaveBeenCalledWith({ where: { id: 'r3' }, data: { priority: 0 } });
    expect(db.rule.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: { priority: 1 } });
    expect(db.rule.update).toHaveBeenCalledWith({ where: { id: 'r2' }, data: { priority: 2 } });
  });

  it('rejects a list with duplicate ids', async () => {
    const db = makeDb({ ruleFindMany: [{ id: 'r1' }, { id: 'r2' }] });
    const service = createRuleService(db as any);
    await expect(service.reorder({ userId: USER, ruleIds: ['r1', 'r1'] })).rejects.toMatchObject({ code: 'INVALID_PRIORITY_ORDER' });
  });

  it('rejects a list missing one of the user\'s rules', async () => {
    const db = makeDb({ ruleFindMany: [{ id: 'r1' }, { id: 'r2' }] });
    const service = createRuleService(db as any);
    await expect(service.reorder({ userId: USER, ruleIds: ['r1'] })).rejects.toMatchObject({ code: 'INVALID_PRIORITY_ORDER' });
  });

  it('rejects a list containing an id not owned by the user', async () => {
    const db = makeDb({ ruleFindMany: [{ id: 'r1' }] });
    const service = createRuleService(db as any);
    await expect(service.reorder({ userId: USER, ruleIds: ['r1', 'foreign-rule'] })).rejects.toMatchObject({ code: 'INVALID_PRIORITY_ORDER' });
  });
});
