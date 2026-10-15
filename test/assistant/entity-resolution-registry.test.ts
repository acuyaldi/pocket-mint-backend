import { describe, expect, it } from 'vitest';
import {
  EntityResolverRegistry,
  EntityResolutionError,
  type EntityResolver,
} from '../../src/assistant/entity-resolution';

function resolver(entityType: 'wallet' | 'merchant' | 'category'): EntityResolver {
  return {
    entityType,
    loadCandidates: async () => [],
    matchCandidate: () => [],
  };
}

describe('EntityResolverRegistry', () => {
  it('registers exactly one wallet, merchant, and category resolver in production bootstrap', async () => {
    const { entityResolverRegistry } = await import('../../src/assistant/bootstrap');
    expect(entityResolverRegistry.isFinalized).toBe(true);
    expect(entityResolverRegistry.registeredTypes()).toEqual(['category', 'merchant', 'wallet']);
    expect(entityResolverRegistry.get('category')?.entityType).toBe('category');
    expect(entityResolverRegistry.get('merchant')?.entityType).toBe('merchant');
    expect(entityResolverRegistry.get('wallet')?.entityType).toBe('wallet');
  });

  it('registers, looks up, and lists closed entity types stably', () => {
    const registry = new EntityResolverRegistry();
    registry.register(resolver('wallet'));
    registry.register(resolver('category'));
    registry.register(resolver('merchant'));

    expect(registry.get('wallet')?.entityType).toBe('wallet');
    expect(registry.registeredTypes()).toEqual(['category', 'merchant', 'wallet']);
  });

  it('rejects duplicate registration', () => {
    const registry = new EntityResolverRegistry();
    registry.register(resolver('wallet'));
    expect(() => registry.register(resolver('wallet'))).toThrowError(
      expect.objectContaining({ code: 'ENTITY_RESOLUTION_CONFIGURATION_ERROR' }),
    );
  });

  it('returns undefined for unsupported runtime values without dynamic dispatch', () => {
    const registry = new EntityResolverRegistry();
    registry.register(resolver('wallet'));
    expect(registry.get('constructor')).toBeUndefined();
    expect(registry.get('__proto__')).toBeUndefined();
    expect(registry.get('wallet.resolve')).toBeUndefined();
  });

  it('becomes immutable after finalization', () => {
    const registry = new EntityResolverRegistry();
    registry.register(resolver('wallet'));
    registry.finalize();
    expect(registry.isFinalized).toBe(true);
    expect(() => registry.register(resolver('merchant'))).toThrow(EntityResolutionError);
    expect(() => registry.finalize()).not.toThrow();
  });

  it('rejects a resolver whose declared type changes after registration', () => {
    const mutable = resolver('wallet') as { entityType: 'wallet' | 'merchant' };
    const registry = new EntityResolverRegistry();
    registry.register(mutable);
    mutable.entityType = 'merchant';
    expect(registry.get('wallet')?.entityType).toBe('wallet');
  });
});
