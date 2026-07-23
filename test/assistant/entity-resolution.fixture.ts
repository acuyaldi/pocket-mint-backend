import {
  createEntityCandidate,
  matchEntityCandidate,
  type EntityCandidate,
  type EntityResolver,
  type EntityType,
  type TrustedEntityConstraints,
} from '../../src/assistant/entity-resolution';

export interface CandidateFixture {
  readonly ownerId: string;
  readonly id: string;
  readonly label: string;
  readonly aliases?: readonly string[];
  readonly discriminator?: string;
  readonly tieBreakKey?: string;
  readonly tags?: readonly string[];
}

export function createFixtureResolver(
  fixtures: readonly CandidateFixture[],
  entityType: EntityType = 'wallet',
): EntityResolver {
  const byOwner = new Map<string, readonly EntityCandidate[]>();
  for (const ownerId of new Set(fixtures.map((fixture) => fixture.ownerId))) {
    byOwner.set(
      ownerId,
      fixtures
        .filter((fixture) => fixture.ownerId === ownerId)
        .map((fixture) => createEntityCandidate({
          entityType,
          internalId: fixture.id,
          displayLabel: fixture.label,
          canonicalLabel: fixture.label,
          aliases: fixture.aliases ?? [],
          discriminator: fixture.discriminator,
          stableTieBreakKey: fixture.tieBreakKey ?? fixture.id,
          trustedMetadata: { tags: fixture.tags ?? [] },
        })),
    );
  }

  return {
    entityType,
    async loadCandidates({ authenticatedUserId }) {
      return byOwner.get(authenticatedUserId) ?? [];
    },
    matchCandidate({ candidate, reference, trustedConstraints }) {
      const requiredTag = (trustedConstraints as { requiredTag?: unknown } | undefined)?.requiredTag;
      if (
        typeof requiredTag === 'string'
        && !(candidate.trustedMetadata.tags as readonly string[]).includes(requiredTag)
      ) {
        return [];
      }
      return matchEntityCandidate(candidate, reference, {
        constrained: typeof requiredTag === 'string',
      });
    },
  };
}

export function constraints(value?: string): TrustedEntityConstraints | undefined {
  return value === undefined ? undefined : Object.freeze({ requiredTag: value });
}
