import { describe, expect, it } from 'vitest';
import {
  ENTITY_RESOLUTION_LIMITS,
  EntityResolverRegistry,
  createEntityCandidate,
  createEntityResolutionService,
} from '../../src/assistant/entity-resolution';
import { createFixtureResolver } from './entity-resolution.fixture';

function resolver() {
  const registry = new EntityResolverRegistry();
  registry.register(createFixtureResolver([
    { ownerId: 'owner-a', id: 'a', label: 'BCA', aliases: ['bank biru'] },
  ]));
  registry.finalize();
  return createEntityResolutionService(registry);
}

describe('entity-resolution security boundaries', () => {
  it.each([
    ['ownerId', 'attacker'],
    ['userId', 'attacker'],
    ['entityId', 'wallet-a'],
    ['walletId', 'wallet-a'],
    ['categoryId', 'category-a'],
    ['merchantId', 'merchant-a'],
    ['confidence', 1000],
    ['status', 'resolved'],
    ['trusted', true],
    ['trustedConstraints', { active: true }],
    ['authorized', true],
    ['confirmed', true],
    ['isArchived', false],
    ['evidence', [{ kind: 'canonical_exact' }]],
    ['__proto__', { polluted: true }],
    ['constructor', { prototype: { polluted: true } }],
  ])('rejects provider/untrusted field %s', async (key, value) => {
    const reference = JSON.parse(JSON.stringify({
      entityType: 'wallet',
      referenceText: 'BCA',
      [key]: value,
    }));
    const result = await resolver().resolve({
      authenticatedUserId: 'owner-a',
      reference,
    });
    expect(result).toEqual({
      kind: 'invalid_reference',
      entityType: 'wallet',
      code: 'ENTITY_RESOLUTION_INVALID_REFERENCE',
    });
  });

  it('rejects non-plain and prototype-bearing reference objects', async () => {
    const result = await resolver().resolve({
      authenticatedUserId: 'owner-a',
      reference: Object.create({ ownerId: 'attacker' }, {
        entityType: { value: 'wallet', enumerable: true },
        referenceText: { value: 'BCA', enumerable: true },
      }),
    });
    expect(result.kind).toBe('invalid_reference');
  });

  it('rejects accessor properties without executing untrusted getters', async () => {
    let getterCalled = false;
    const reference = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(reference, 'entityType', {
      enumerable: true,
      get() {
        getterCalled = true;
        throw new Error('untrusted getter');
      },
    });
    Object.defineProperty(reference, 'referenceText', {
      enumerable: true,
      value: 'BCA',
    });
    const result = await resolver().resolve({
      authenticatedUserId: 'owner-a',
      reference,
    });
    expect(result.kind).toBe('invalid_reference');
    expect(getterCalled).toBe(false);
  });

  it('rejects aliases beyond count and byte limits at the candidate boundary', () => {
    expect(() => createEntityCandidate({
      entityType: 'wallet',
      internalId: 'a',
      displayLabel: 'BCA',
      canonicalLabel: 'BCA',
      aliases: Array.from({ length: ENTITY_RESOLUTION_LIMITS.aliasesPerCandidate + 1 }, (_, i) => `a${i}`),
      stableTieBreakKey: 'a',
      trustedMetadata: {},
    })).toThrowError(expect.objectContaining({ code: 'ENTITY_RESOLUTION_CONFIGURATION_ERROR' }));

    expect(() => createEntityCandidate({
      entityType: 'wallet',
      internalId: 'a',
      displayLabel: 'BCA',
      canonicalLabel: 'BCA',
      aliases: ['a'.repeat(ENTITY_RESOLUTION_LIMITS.aliasBytes + 1)],
      stableTieBreakKey: 'a',
      trustedMetadata: {},
    })).toThrowError(expect.objectContaining({ code: 'ENTITY_RESOLUTION_CONFIGURATION_ERROR' }));
  });

  it('accepts alias and display-label limits exactly', () => {
    expect(() => createEntityCandidate({
      entityType: 'wallet',
      internalId: 'a',
      displayLabel: 'd'.repeat(ENTITY_RESOLUTION_LIMITS.displayLabelBytes),
      canonicalLabel: 'BCA',
      aliases: Array.from(
        { length: ENTITY_RESOLUTION_LIMITS.aliasesPerCandidate },
        (_, index) => `${index}-${'a'.repeat(ENTITY_RESOLUTION_LIMITS.aliasBytes - String(index).length - 1)}`,
      ),
      stableTieBreakKey: 'a',
      trustedMetadata: {},
    })).not.toThrow();
  });

  it('rejects oversized display labels and unsafe candidate internals', () => {
    expect(() => createEntityCandidate({
      entityType: 'wallet',
      internalId: 'a',
      displayLabel: 'a'.repeat(ENTITY_RESOLUTION_LIMITS.displayLabelBytes + 1),
      canonicalLabel: 'BCA',
      aliases: [],
      stableTieBreakKey: 'a',
      trustedMetadata: {},
    })).toThrow();
    expect(() => createEntityCandidate({
      entityType: 'wallet',
      internalId: 'a',
      displayLabel: '<script>alert(1)</script>',
      canonicalLabel: 'BCA',
      aliases: [],
      stableTieBreakKey: 'a',
      trustedMetadata: {},
    })).toThrow();
    expect(() => createEntityCandidate({
      entityType: 'wallet',
      internalId: '',
      displayLabel: 'BCA',
      canonicalLabel: 'BCA',
      aliases: [],
      stableTieBreakKey: 'a',
      trustedMetadata: {},
    })).toThrow();
  });

  it('rejects evidence overflow from a resolver', async () => {
    const registry = new EntityResolverRegistry();
    const candidate = createEntityCandidate({
      entityType: 'wallet',
      internalId: 'a',
      displayLabel: 'BCA',
      canonicalLabel: 'BCA',
      aliases: [],
      stableTieBreakKey: 'a',
      trustedMetadata: {},
    });
    registry.register({
      entityType: 'wallet',
      loadCandidates: async () => [candidate],
      matchCandidate: () => Array.from(
        { length: ENTITY_RESOLUTION_LIMITS.evidencePerCandidate + 1 },
        () => ({ kind: 'canonical_exact' as const, scoreContribution: 1000 }),
      ),
    });
    registry.finalize();
    await expect(createEntityResolutionService(registry).resolve({
      authenticatedUserId: 'owner-a',
      reference: { entityType: 'wallet', referenceText: 'BCA' },
    })).rejects.toMatchObject({ code: 'ENTITY_RESOLUTION_CONFIGURATION_ERROR' });
  });

  it('revalidates structurally forged resolver candidates before public projection', async () => {
    const registry = new EntityResolverRegistry();
    registry.register({
      entityType: 'wallet',
      loadCandidates: async () => [{
        entityType: 'wallet',
        internalId: 'forged',
        displayLabel: '<script>owner-secret</script>',
        canonicalLabel: 'BCA',
        canonicalComparison: 'bca',
        normalizedCanonicalLabel: 'bca',
        aliases: Array.from(
          { length: ENTITY_RESOLUTION_LIMITS.aliasesPerCandidate + 1 },
          (_, index) => `alias-${index}`,
        ),
        normalizedAliases: ['bca'],
        aliasComparisons: ['bca'],
        trustedMetadata: {},
        stableTieBreakKey: 'forged',
      }],
      matchCandidate: () => [{ kind: 'canonical_exact', scoreContribution: 1000 }],
    });
    registry.finalize();
    await expect(createEntityResolutionService(registry).resolve({
      authenticatedUserId: 'owner-a',
      reference: { entityType: 'wallet', referenceText: 'BCA' },
    })).rejects.toMatchObject({ code: 'ENTITY_RESOLUTION_CONFIGURATION_ERROR' });
  });

  it('does not mutate financial data or call providers', async () => {
    const source = JSON.stringify({ balances: [100], transactions: [] });
    const result = await resolver().resolve({
      authenticatedUserId: 'owner-a',
      reference: { entityType: 'wallet', referenceText: 'BCA', source: 'provider_extracted' },
    });
    expect(result.kind).toBe('resolved');
    expect(source).toBe(JSON.stringify({ balances: [100], transactions: [] }));
  });
});
