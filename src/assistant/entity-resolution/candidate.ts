import { EntityResolutionError } from './errors';
import { normalizeEntityReference } from './normalization';
import {
  ENTITY_RESOLUTION_LIMITS,
  isEntityType,
  type EntityCandidate,
  type EntityType,
} from './types';

export interface CreateEntityCandidateInput {
  readonly entityType: EntityType;
  readonly internalId: string;
  readonly displayLabel: string;
  readonly canonicalLabel: string;
  readonly aliases: readonly string[];
  readonly discriminator?: string;
  readonly trustedMetadata: Readonly<Record<string, unknown>>;
  readonly stableTieBreakKey: string;
}

function boundedNonEmpty(value: unknown, maxBytes: number): value is string {
  return typeof value === 'string'
    && value.length > 0
    && Buffer.byteLength(value, 'utf8') <= maxBytes
    && !/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(value);
}

function safeDisplay(value: unknown, maxBytes: number): value is string {
  return boundedNonEmpty(value, maxBytes) && !/[<>]/u.test(value);
}

export function createEntityCandidate(input: CreateEntityCandidateInput): EntityCandidate {
  if (
    !isEntityType(input.entityType)
    || !boundedNonEmpty(input.internalId, 191)
    || !boundedNonEmpty(input.stableTieBreakKey, 191)
    || !safeDisplay(input.displayLabel, ENTITY_RESOLUTION_LIMITS.displayLabelBytes)
    || input.aliases.length > ENTITY_RESOLUTION_LIMITS.aliasesPerCandidate
    || typeof input.trustedMetadata !== 'object'
    || input.trustedMetadata === null
    || Array.isArray(input.trustedMetadata)
  ) {
    throw EntityResolutionError.configuration();
  }

  const canonical = normalizeEntityReference(input.canonicalLabel);
  if (!canonical.ok) throw EntityResolutionError.configuration();

  const aliases = input.aliases.map((alias) => {
    if (Buffer.byteLength(alias, 'utf8') > ENTITY_RESOLUTION_LIMITS.aliasBytes) {
      throw EntityResolutionError.configuration();
    }
    const normalized = normalizeEntityReference(alias);
    if (!normalized.ok) throw EntityResolutionError.configuration();
    return normalized;
  });
  const orderedAliases = [...aliases].sort(
    (left, right) =>
      compareText(left.normalized, right.normalized)
      || compareText(left.comparison, right.comparison),
  );

  if (
    input.discriminator !== undefined
    && !safeDisplay(input.discriminator, ENTITY_RESOLUTION_LIMITS.displayLabelBytes)
  ) {
    throw EntityResolutionError.configuration();
  }

  return Object.freeze({
    entityType: input.entityType,
    internalId: input.internalId,
    displayLabel: input.displayLabel,
    canonicalLabel: input.canonicalLabel,
    canonicalComparison: canonical.comparison,
    normalizedCanonicalLabel: canonical.normalized,
    aliases: Object.freeze(orderedAliases.map((alias) => alias.sourceText)),
    normalizedAliases: Object.freeze(orderedAliases.map((alias) => alias.normalized)),
    aliasComparisons: Object.freeze(orderedAliases.map((alias) => alias.comparison)),
    ...(input.discriminator === undefined ? {} : { discriminator: input.discriminator }),
    trustedMetadata: Object.freeze({ ...input.trustedMetadata }),
    stableTieBreakKey: input.stableTieBreakKey,
  });
}

export function revalidateEntityCandidate(value: EntityCandidate): EntityCandidate {
  try {
    return createEntityCandidate({
      entityType: value.entityType,
      internalId: value.internalId,
      displayLabel: value.displayLabel,
      canonicalLabel: value.canonicalLabel,
      aliases: value.aliases,
      ...(value.discriminator === undefined ? {} : { discriminator: value.discriminator }),
      trustedMetadata: value.trustedMetadata,
      stableTieBreakKey: value.stableTieBreakKey,
    });
  } catch {
    throw EntityResolutionError.configuration();
  }
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
