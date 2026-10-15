import { EntityResolutionError } from './errors';
import {
  isEntityType,
  type EntityResolver,
  type EntityType,
} from './types';

export class EntityResolverRegistry {
  private readonly resolvers = new Map<EntityType, EntityResolver>();
  private finalized = false;

  register(resolver: EntityResolver): void {
    if (
      this.finalized
      || !resolver
      || !isEntityType(resolver.entityType)
      || typeof resolver.loadCandidates !== 'function'
      || typeof resolver.matchCandidate !== 'function'
      || this.resolvers.has(resolver.entityType)
    ) {
      throw EntityResolutionError.configuration();
    }
    const stored: EntityResolver = Object.freeze({
      entityType: resolver.entityType,
      loadCandidates: resolver.loadCandidates.bind(resolver),
      matchCandidate: resolver.matchCandidate.bind(resolver),
    });
    this.resolvers.set(stored.entityType, stored);
  }

  get(entityType: unknown): EntityResolver | undefined {
    return isEntityType(entityType) ? this.resolvers.get(entityType) : undefined;
  }

  registeredTypes(): readonly EntityType[] {
    return Object.freeze([...this.resolvers.keys()].sort(compareText));
  }

  finalize(): void {
    this.finalized = true;
  }

  get isFinalized(): boolean {
    return this.finalized;
  }
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
