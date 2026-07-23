import { describe, expect, it, vi } from 'vitest';
import {
  EntityResolverRegistry,
  MERCHANT_TRANSACTION_CREATE_CONSTRAINTS,
  createEntityResolutionService,
  createMerchantResolver,
  toPublicEntityResolutionResult,
} from '../../src/assistant/entity-resolution';

interface MappingRow {
  id: string;
  merchantName: string;
  normalizedMerchant: string;
}

function setup(rows: readonly MappingRow[]) {
  const findMany = vi.fn().mockResolvedValue(rows);
  const registry = new EntityResolverRegistry();
  registry.register(createMerchantResolver({
    merchantMapping: { findMany },
  } as never));
  registry.finalize();
  return {
    findMany,
    service: createEntityResolutionService(registry),
  };
}

function resolve(
  service: ReturnType<typeof setup>['service'],
  referenceText: string,
  userId = 'owner-a',
) {
  return service.resolve({
    authenticatedUserId: userId,
    reference: {
      entityType: 'merchant',
      referenceText,
      source: 'provider_extracted',
    },
    trustedConstraints: MERCHANT_TRANSACTION_CREATE_CONSTRAINTS,
  });
}

describe('production MerchantResolver', () => {
  it('loads only the authenticated owner mappings at the database boundary', async () => {
    const { findMany, service } = setup([
      { id: 'mapping-a', merchantName: 'Starbucks', normalizedMerchant: 'starbucks' },
    ]);

    await resolve(service, 'Starbucks', 'owner-a');

    expect(findMany).toHaveBeenCalledOnce();
    expect(findMany).toHaveBeenCalledWith({
      where: { userId: 'owner-a' },
      select: {
        id: true,
        merchantName: true,
        normalizedMerchant: true,
      },
      take: 101,
    });
  });

  it('resolves canonical, generic-normalized, and trusted persisted-normalized matches', async () => {
    const canonical = setup([
      { id: 'mapping-a', merchantName: 'Starbucks', normalizedMerchant: 'starbucks' },
    ]);
    await expect(resolve(canonical.service, 'Starbucks')).resolves.toMatchObject({
      kind: 'resolved',
      entity: { internalId: 'mapping-a' },
      displayLabel: 'Starbucks',
      confidence: { score: 1000, band: 'exact' },
    });

    const normalized = setup([
      { id: 'mapping-b', merchantName: 'Grab-Food', normalizedMerchant: 'grab food' },
    ]);
    await expect(resolve(normalized.service, 'grab food')).resolves.toMatchObject({
      kind: 'resolved',
      entity: { internalId: 'mapping-b' },
      confidence: { score: 950, band: 'strong' },
      evidence: expect.arrayContaining([
        { kind: 'alias_exact', scoreContribution: 950 },
      ]),
    });

    const genericNormalized = setup([
      { id: 'mapping-c', merchantName: 'Cafe.Meru', normalizedMerchant: 'cafe meru' },
    ]);
    await expect(resolve(genericNormalized.service, 'cafe-meru')).resolves.toMatchObject({
      kind: 'resolved',
      entity: { internalId: 'mapping-c' },
      confidence: { score: 900, band: 'strong' },
    });
  });

  it('returns not_found without substring, fuzzy, popularity, or first-row fallback', async () => {
    const { service } = setup([
      { id: 'mapping-a', merchantName: 'Starbucks', normalizedMerchant: 'starbucks' },
    ]);

    await expect(resolve(service, 'Starbuck')).resolves.toEqual({
      kind: 'not_found',
      entityType: 'merchant',
      normalizedReference: 'starbuck',
    });
    await expect(resolve(service, 'kopi Starbucks')).resolves.toEqual({
      kind: 'not_found',
      entityType: 'merchant',
      normalizedReference: 'kopi starbucks',
    });
  });

  it('returns stable ambiguity independent of database order and hides mapping IDs publicly', async () => {
    const rows = [
      { id: 'mapping-z', merchantName: 'ＢＣＡ', normalizedMerchant: 'ｂｃａ' },
      { id: 'mapping-a', merchantName: 'BCA', normalizedMerchant: 'bca' },
    ] as const;
    const first = await resolve(setup(rows).service, 'bca');
    const second = await resolve(setup([...rows].reverse()).service, 'bca');

    expect(first).toEqual(second);
    expect(first.kind).toBe('ambiguous');
    const publicResult = toPublicEntityResolutionResult(first);
    expect(JSON.stringify(publicResult)).not.toMatch(/mapping-[az]/);
    if (publicResult.kind !== 'ambiguous') return;
    expect(publicResult.options).toHaveLength(2);
    expect(publicResult.options.every((option) => option.discriminator === undefined)).toBe(true);
  });

  it('enforces candidate, alias, trusted-data, and reference limits through the foundation', async () => {
    const overflow = Array.from({ length: 101 }, (_, index) => ({
      id: `mapping-${index}`,
      merchantName: `Merchant ${index}`,
      normalizedMerchant: `merchant ${index}`,
    }));
    await expect(resolve(setup(overflow).service, 'merchant 1')).rejects.toMatchObject({
      code: 'ENTITY_RESOLUTION_CANDIDATE_LIMIT_EXCEEDED',
    });

    await expect(resolve(setup([{
      id: 'mapping-bad',
      merchantName: '<private>',
      normalizedMerchant: 'private',
    }]).service, 'private')).rejects.toMatchObject({
      code: 'ENTITY_RESOLUTION_CONFIGURATION_ERROR',
    });

    await expect(resolve(setup([]).service, '\u0000')).resolves.toMatchObject({
      kind: 'invalid_reference',
      entityType: 'merchant',
    });
  });

  it('rejects missing or caller-invented merchant eligibility constraints', async () => {
    const { service, findMany } = setup([]);
    await expect(service.resolve({
      authenticatedUserId: 'owner-a',
      reference: { entityType: 'merchant', referenceText: 'Starbucks' },
    })).rejects.toMatchObject({ code: 'ENTITY_RESOLUTION_CONFIGURATION_ERROR' });
    await expect(service.resolve({
      authenticatedUserId: 'owner-a',
      reference: { entityType: 'merchant', referenceText: 'Starbucks' },
      trustedConstraints: { eligibleFor: 'category.override' },
    })).rejects.toMatchObject({ code: 'ENTITY_RESOLUTION_CONFIGURATION_ERROR' });
    expect(findMany).not.toHaveBeenCalled();
  });
});
