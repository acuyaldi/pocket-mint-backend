import { describe, expect, it, vi } from 'vitest';
import {
  ENTITY_RESOLUTION_LIMITS,
  EntityResolutionError,
  EntityResolverRegistry,
  createEntityCandidate,
  createEntityResolutionService,
  toPublicEntityResolutionResult,
} from '../../src/assistant/entity-resolution';
import { constraints, createFixtureResolver } from './entity-resolution.fixture';

function service(fixtures: Parameters<typeof createFixtureResolver>[0]) {
  const registry = new EntityResolverRegistry();
  registry.register(createFixtureResolver(fixtures));
  registry.finalize();
  return createEntityResolutionService(registry);
}

describe('EntityResolutionService', () => {
  it.each([
    ['BCA', 'wallet-a', 1000, 'exact'],
    ['bank biru', 'wallet-a', 950, 'strong'],
    ['BCA---Debit', 'wallet-b', 900, 'strong'],
  ])('resolves deterministic %s evidence', async (referenceText, id, score, band) => {
    const result = await service([
      { ownerId: 'owner-a', id: 'wallet-a', label: 'BCA', aliases: ['bank biru'] },
      { ownerId: 'owner-a', id: 'wallet-b', label: 'BCA Debit' },
    ]).resolve({
      authenticatedUserId: 'owner-a',
      reference: { entityType: 'wallet', referenceText },
    });

    expect(result).toMatchObject({
      kind: 'resolved',
      entityType: 'wallet',
      entity: { internalId: id },
      confidence: { score, band },
    });
  });

  it('does not treat substring containment as authoritative', async () => {
    const result = await service([
      { ownerId: 'owner-a', id: 'wallet-a', label: 'BCA' },
    ]).resolve({
      authenticatedUserId: 'owner-a',
      reference: { entityType: 'wallet', referenceText: 'transfer ke BCA sekarang' },
    });
    expect(result).toEqual({
      kind: 'not_found',
      entityType: 'wallet',
      normalizedReference: 'transfer ke bca sekarang',
    });
  });

  it('makes duplicate canonical and alias evidence ambiguous without first-row fallback', async () => {
    const resolver = service([
      { ownerId: 'owner-a', id: 'z', label: 'BCA', tieBreakKey: 'z' },
      { ownerId: 'owner-a', id: 'a', label: 'BCA', tieBreakKey: 'a' },
      { ownerId: 'owner-a', id: 'b', label: 'Other', aliases: ['BCA'], tieBreakKey: 'b' },
    ]);
    const result = await resolver.resolve({
      authenticatedUserId: 'owner-a',
      reference: { entityType: 'wallet', referenceText: 'BCA' },
    });
    expect(result.kind).toBe('ambiguous');
    if (result.kind !== 'ambiguous') return;
    expect(result.options.map((option) => option.selection.internalId)).toEqual(['a', 'z', 'b']);
    expect(result.options).toHaveLength(3);
  });

  it('is independent of candidate source order and byte-identical across repetitions', async () => {
    const fixtures = Array.from({ length: 8 }, (_, index) => ({
      ownerId: 'owner-a',
      id: `wallet-${index}`,
      label: 'BCA',
      tieBreakKey: `tie-${String(index).padStart(2, '0')}`,
    }));
    const forward = await service(fixtures).resolve({
      authenticatedUserId: 'owner-a',
      reference: { entityType: 'wallet', referenceText: 'BCA' },
    });
    const reverse = await service([...fixtures].reverse()).resolve({
      authenticatedUserId: 'owner-a',
      reference: { entityType: 'wallet', referenceText: 'BCA' },
    });
    expect(JSON.stringify(reverse)).toBe(JSON.stringify(forward));
    expect(forward.kind).toBe('ambiguous');
    if (forward.kind === 'ambiguous') {
      expect(forward.options).toHaveLength(ENTITY_RESOLUTION_LIMITS.ambiguityOptions);
    }
  });

  it('loads owner-scoped candidates exactly once and resolves the registry exactly once', async () => {
    const fixture = createFixtureResolver([{ ownerId: 'owner-a', id: 'a', label: 'BCA' }]);
    const load = vi.spyOn(fixture, 'loadCandidates');
    const registry = new EntityResolverRegistry();
    registry.register(fixture);
    registry.finalize();
    const get = vi.spyOn(registry, 'get');
    const result = await createEntityResolutionService(registry).resolve({
      authenticatedUserId: 'owner-a',
      reference: { entityType: 'wallet', referenceText: 'BCA' },
    });
    expect(result.kind).toBe('resolved');
    expect(load).toHaveBeenCalledOnce();
    expect(get).toHaveBeenCalledOnce();
  });

  it('keeps owner scopes indistinguishable and independent', async () => {
    const resolver = service([
      { ownerId: 'owner-a', id: 'a', label: 'Private Wallet' },
      { ownerId: 'owner-a', id: 'duplicate', label: 'Shared Name' },
      { ownerId: 'owner-b', id: 'b', label: 'Shared Name' },
    ]);
    const ownerBPrivate = await resolver.resolve({
      authenticatedUserId: 'owner-b',
      reference: { entityType: 'wallet', referenceText: 'Private Wallet' },
    });
    const ownerBShared = await resolver.resolve({
      authenticatedUserId: 'owner-b',
      reference: { entityType: 'wallet', referenceText: 'Shared Name' },
    });
    expect(ownerBPrivate).toEqual({
      kind: 'not_found',
      entityType: 'wallet',
      normalizedReference: 'private wallet',
    });
    expect(ownerBShared).toMatchObject({
      kind: 'resolved',
      entity: { internalId: 'b' },
    });
  });

  it('applies backend-only trusted constraints without accepting them from reference input', async () => {
    const resolver = service([
      { ownerId: 'owner-a', id: 'active', label: 'BCA', tags: ['active'] },
      { ownerId: 'owner-a', id: 'archived', label: 'BCA', tags: ['archived'] },
    ]);
    const result = await resolver.resolve({
      authenticatedUserId: 'owner-a',
      reference: { entityType: 'wallet', referenceText: 'BCA' },
      trustedConstraints: constraints('active'),
    });
    expect(result).toMatchObject({
      kind: 'resolved',
      entity: { internalId: 'active' },
      evidence: [
        { kind: 'canonical_exact', scoreContribution: 1000 },
        { kind: 'constrained_match', scoreContribution: 0 },
      ],
    });
  });

  it('fails safely when candidate limits are exceeded', async () => {
    const fixtures = Array.from(
      { length: ENTITY_RESOLUTION_LIMITS.candidates + 1 },
      (_, index) => ({ ownerId: 'owner-a', id: String(index), label: `Wallet ${index}` }),
    );
    await expect(service(fixtures).resolve({
      authenticatedUserId: 'owner-a',
      reference: { entityType: 'wallet', referenceText: 'Wallet 1' },
    })).rejects.toMatchObject({
      code: 'ENTITY_RESOLUTION_CANDIDATE_LIMIT_EXCEEDED',
      statusCode: 413,
    });
  });

  it('rejects resolver candidates whose entity type does not match the registry', async () => {
    const registry = new EntityResolverRegistry();
    const mismatched = createEntityCandidate({
      entityType: 'merchant',
      internalId: 'a',
      displayLabel: 'BCA',
      canonicalLabel: 'BCA',
      aliases: [],
      stableTieBreakKey: 'a',
      trustedMetadata: {},
    });
    registry.register({
      entityType: 'wallet',
      loadCandidates: async () => [mismatched],
      matchCandidate: () => [],
    });
    registry.finalize();
    await expect(createEntityResolutionService(registry).resolve({
      authenticatedUserId: 'owner-a',
      reference: { entityType: 'wallet', referenceText: 'BCA' },
    })).rejects.toMatchObject({ code: 'ENTITY_RESOLUTION_CONFIGURATION_ERROR' });
  });

  it('maps unexpected resolver failures to a safe operational error', async () => {
    const registry = new EntityResolverRegistry();
    registry.register({
      entityType: 'wallet',
      loadCandidates: async () => {
        throw new Error('database query with owner secret-owner');
      },
      matchCandidate: () => [],
    });
    registry.finalize();
    await expect(createEntityResolutionService(registry).resolve({
      authenticatedUserId: 'owner-a',
      reference: { entityType: 'wallet', referenceText: 'BCA' },
    })).rejects.toMatchObject({
      code: 'ENTITY_RESOLUTION_FAILED',
      message: 'Entity resolution failed safely.',
    });
  });

  it('returns safe normal outcomes for invalid references and unsupported types', async () => {
    const resolver = service([]);
    await expect(resolver.resolve({
      authenticatedUserId: 'owner-a',
      reference: { entityType: 'wallet', referenceText: '\u0000' },
    })).resolves.toEqual({
      kind: 'invalid_reference',
      entityType: 'wallet',
      code: 'ENTITY_RESOLUTION_INVALID_REFERENCE',
    });
    await expect(resolver.resolve({
      authenticatedUserId: 'owner-a',
      reference: { entityType: 'account', referenceText: 'BCA' },
    })).resolves.toEqual({
      kind: 'unsupported_entity_type',
      code: 'ENTITY_RESOLUTION_UNSUPPORTED_TYPE',
    });
  });

  it('removes internal IDs from the public clarification and resolved DTOs', async () => {
    const resolved = await service([
      { ownerId: 'owner-a', id: 'secret-id', label: 'BCA' },
    ]).resolve({
      authenticatedUserId: 'owner-a',
      reference: { entityType: 'wallet', referenceText: 'BCA' },
    });
    const serialized = JSON.stringify(toPublicEntityResolutionResult(resolved));
    expect(serialized).not.toContain('secret-id');
    expect(serialized).not.toMatch(/internalId|selection|owner/i);
  });

  it('uses operational safe errors rather than leaking candidates', () => {
    const error = EntityResolutionError.configuration();
    expect(error).toMatchObject({
      isOperational: true,
      code: 'ENTITY_RESOLUTION_CONFIGURATION_ERROR',
      statusCode: 500,
    });
    expect(error.message).not.toMatch(/candidate|owner|reference/i);
  });

  it('requires a finalized resolver registry before service construction', () => {
    const registry = new EntityResolverRegistry();
    registry.register(createFixtureResolver([]));
    expect(() => createEntityResolutionService(registry)).toThrowError(
      expect.objectContaining({ code: 'ENTITY_RESOLUTION_CONFIGURATION_ERROR' }),
    );
  });
});
