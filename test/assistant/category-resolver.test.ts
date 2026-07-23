import { describe, expect, it, vi } from 'vitest';
import {
  EntityResolverRegistry,
  createCategoryResolver,
  createCategoryTransactionCreateConstraints,
  createEntityResolutionService,
  toPublicEntityResolutionResult,
} from '../../src/assistant/entity-resolution';

interface CategoryRow {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
}

function setup(rows: readonly CategoryRow[]) {
  const findMany = vi.fn().mockResolvedValue(rows);
  const category = {
    findMany,
    create: vi.fn(),
    createMany: vi.fn(),
    upsert: vi.fn(),
  };
  const registry = new EntityResolverRegistry();
  registry.register(createCategoryResolver({ category } as never));
  registry.finalize();
  return {
    category,
    findMany,
    service: createEntityResolutionService(registry),
  };
}

function resolve(
  service: ReturnType<typeof setup>['service'],
  referenceText: unknown,
  transactionType: 'INCOME' | 'EXPENSE' = 'EXPENSE',
  userId = 'owner-a',
) {
  return service.resolve({
    authenticatedUserId: userId,
    reference: {
      entityType: 'category',
      referenceText,
      source: 'provider_extracted',
    },
    trustedConstraints: createCategoryTransactionCreateConstraints(transactionType),
  });
}

describe('production CategoryResolver', () => {
  it('scopes the candidate query by authenticated owner and trusted transaction type', async () => {
    const { findMany, service } = setup([
      { id: 'category-a', name: 'Food', type: 'EXPENSE' },
    ]);

    await resolve(service, 'Food', 'EXPENSE', 'owner-a');

    expect(findMany).toHaveBeenCalledOnce();
    expect(findMany).toHaveBeenCalledWith({
      where: { userId: 'owner-a', type: 'EXPENSE' },
      select: { id: true, name: true, type: true },
      take: 101,
    });
  });

  it('resolves canonical and generic-normalized exact names with no aliases', async () => {
    const { service } = setup([
      { id: 'category-a', name: 'Food-Drink', type: 'EXPENSE' },
    ]);

    await expect(resolve(service, 'Food-Drink')).resolves.toMatchObject({
      kind: 'resolved',
      entity: { internalId: 'category-a' },
      displayLabel: 'Food-Drink',
      discriminator: 'EXPENSE',
      confidence: { score: 1000, band: 'exact' },
      evidence: expect.arrayContaining([
        { kind: 'canonical_exact', scoreContribution: 1000 },
      ]),
    });
    await expect(resolve(service, 'food drink')).resolves.toMatchObject({
      kind: 'resolved',
      entity: { internalId: 'category-a' },
      confidence: { score: 900, band: 'strong' },
      evidence: expect.arrayContaining([
        { kind: 'normalized_exact', scoreContribution: 900 },
      ]),
    });
  });

  it('returns stable ambiguity for normalized collisions independent of database order', async () => {
    const rows = [
      { id: 'category-z', name: 'Food-Drink', type: 'EXPENSE' },
      { id: 'category-a', name: 'Food Drink', type: 'EXPENSE' },
    ] as const;

    const first = await resolve(setup(rows).service, 'food.drink');
    const second = await resolve(setup([...rows].reverse()).service, 'food.drink');

    expect(first).toEqual(second);
    expect(first.kind).toBe('ambiguous');
    if (first.kind !== 'ambiguous') return;
    expect(first.options.map((option) => option.displayLabel)).toEqual([
      'Food Drink',
      'Food-Drink',
    ]);
  });

  it('relies on the trusted type query so opposite-type and cross-owner-only names are not_found', async () => {
    const { service } = setup([]);

    await expect(resolve(service, 'Salary', 'EXPENSE')).resolves.toEqual({
      kind: 'not_found',
      entityType: 'category',
      normalizedReference: 'salary',
    });
    await expect(resolve(service, 'Private', 'EXPENSE', 'owner-b')).resolves.toEqual({
      kind: 'not_found',
      entityType: 'category',
      normalizedReference: 'private',
    });
  });

  it('does not add aliases, contains matching, substring matching, or first-row fallback', async () => {
    const { service } = setup([
      { id: 'category-a', name: 'Food and Drink', type: 'EXPENSE' },
    ]);

    await expect(resolve(service, 'Food')).resolves.toEqual({
      kind: 'not_found',
      entityType: 'category',
      normalizedReference: 'food',
    });
    await expect(resolve(service, 'daily Food and Drink')).resolves.toEqual({
      kind: 'not_found',
      entityType: 'category',
      normalizedReference: 'daily food and drink',
    });
  });

  it('fails closed on candidate overflow and malformed database candidates', async () => {
    const overflow = Array.from({ length: 101 }, (_, index) => ({
      id: `category-${index}`,
      name: `Category ${index}`,
      type: 'EXPENSE' as const,
    }));
    await expect(resolve(setup(overflow).service, 'Category 1')).rejects.toMatchObject({
      code: 'ENTITY_RESOLUTION_CANDIDATE_LIMIT_EXCEEDED',
    });

    await expect(resolve(setup([{
      id: 'category-bad',
      name: '<private>',
      type: 'EXPENSE',
    }]).service, 'private')).rejects.toMatchObject({
      code: 'ENTITY_RESOLUTION_CONFIGURATION_ERROR',
    });
  });

  it('returns safe invalid-reference behavior and removes internal IDs publicly', async () => {
    const invalid = await resolve(setup([]).service, '\u0000');
    expect(invalid).toEqual({
      kind: 'invalid_reference',
      entityType: 'category',
      code: 'ENTITY_RESOLUTION_INVALID_REFERENCE',
    });

    const resolved = await resolve(setup([{
      id: 'category-secret',
      name: 'Food',
      type: 'EXPENSE',
    }]).service, 'Food');
    expect(JSON.stringify(toPublicEntityResolutionResult(resolved)))
      .not.toContain('category-secret');
  });

  it('rejects missing, malformed, extra, or unsupported trusted constraints before querying', async () => {
    const { service, findMany } = setup([]);
    const invalidConstraints = [
      undefined,
      { eligibleFor: 'transaction.create' },
      { eligibleFor: 'transaction.create', transactionType: 'TRANSFER' },
      { eligibleFor: 'budget.create', transactionType: 'EXPENSE' },
      { eligibleFor: 'transaction.create', transactionType: 'EXPENSE', ownerId: 'owner-a' },
    ];

    for (const trustedConstraints of invalidConstraints) {
      await expect(service.resolve({
        authenticatedUserId: 'owner-a',
        reference: { entityType: 'category', referenceText: 'Food' },
        ...(trustedConstraints === undefined ? {} : { trustedConstraints }),
      })).rejects.toMatchObject({ code: 'ENTITY_RESOLUTION_CONFIGURATION_ERROR' });
    }
    expect(findMany).not.toHaveBeenCalled();
  });

  it('never invokes category creation or default-category seeding behavior', async () => {
    const { service, category } = setup([]);

    await resolve(service, 'Food');

    expect(category.create).not.toHaveBeenCalled();
    expect(category.createMany).not.toHaveBeenCalled();
    expect(category.upsert).not.toHaveBeenCalled();
  });
});
