import type { PrismaClient } from '../../generated/prisma/client';
import { createEntityCandidate } from './candidate';
import { EntityResolutionError } from './errors';
import { matchEntityCandidate } from './matching';
import {
  ENTITY_RESOLUTION_LIMITS,
  type EntityResolver,
  type TrustedEntityConstraints,
} from './types';

interface MerchantTransactionCreateConstraints extends TrustedEntityConstraints {
  readonly eligibleFor: 'transaction.create';
}

export const MERCHANT_TRANSACTION_CREATE_CONSTRAINTS:
Readonly<MerchantTransactionCreateConstraints> = Object.freeze({
  eligibleFor: 'transaction.create',
});

function isTransactionCreateConstraints(
  value: TrustedEntityConstraints | undefined,
): value is MerchantTransactionCreateConstraints {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length === 1
    && keys[0] === 'eligibleFor'
    && value.eligibleFor === 'transaction.create';
}

function trustedNormalizedAlias(
  normalizedMerchant: string,
): readonly string[] {
  if (
    typeof normalizedMerchant !== 'string'
    || normalizedMerchant.length === 0
    || Buffer.byteLength(normalizedMerchant, 'utf8')
      > ENTITY_RESOLUTION_LIMITS.aliasBytes
  ) {
    throw EntityResolutionError.configuration();
  }
  return Object.freeze([normalizedMerchant]);
}

export function createMerchantResolver(
  db: Pick<PrismaClient, 'merchantMapping'>,
): EntityResolver {
  const resolver: EntityResolver = {
    entityType: 'merchant' as const,
    async loadCandidates(scope) {
      const { authenticatedUserId, trustedConstraints } = scope;
      if (!isTransactionCreateConstraints(trustedConstraints)) {
        throw EntityResolutionError.configuration();
      }
      const mappings = await db.merchantMapping.findMany({
        where: { userId: authenticatedUserId },
        select: {
          id: true,
          merchantName: true,
          normalizedMerchant: true,
        },
        take: ENTITY_RESOLUTION_LIMITS.candidates + 1,
      });
      return mappings.map((mapping) => createEntityCandidate({
        entityType: 'merchant',
        internalId: mapping.id,
        displayLabel: mapping.merchantName,
        canonicalLabel: mapping.merchantName,
        aliases: trustedNormalizedAlias(mapping.normalizedMerchant),
        trustedMetadata: {
          normalizedMerchant: mapping.normalizedMerchant,
          eligibleFor: trustedConstraints.eligibleFor,
        },
        stableTieBreakKey: mapping.id,
      }));
    },
    matchCandidate(input) {
      const { candidate, reference, trustedConstraints } = input;
      if (
        !isTransactionCreateConstraints(trustedConstraints)
        || candidate.trustedMetadata.eligibleFor !== trustedConstraints.eligibleFor
        || typeof candidate.trustedMetadata.normalizedMerchant !== 'string'
      ) {
        throw EntityResolutionError.configuration();
      }
      return matchEntityCandidate(candidate, reference, { constrained: true });
    },
  };
  return Object.freeze(resolver);
}
