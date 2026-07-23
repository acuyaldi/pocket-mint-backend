import type { PrismaClient } from '../../generated/prisma/client';
import { createEntityCandidate } from './candidate';
import { EntityResolutionError } from './errors';
import { matchEntityCandidate } from './matching';
import {
  ENTITY_RESOLUTION_LIMITS,
  type EntityResolver,
  type TrustedEntityConstraints,
} from './types';

export type CategoryTransactionType = 'INCOME' | 'EXPENSE';

interface CategoryTransactionCreateConstraints extends TrustedEntityConstraints {
  readonly eligibleFor: 'transaction.create';
  readonly transactionType: CategoryTransactionType;
}

export function createCategoryTransactionCreateConstraints(
  transactionType: CategoryTransactionType,
): Readonly<CategoryTransactionCreateConstraints> {
  return Object.freeze({
    eligibleFor: 'transaction.create',
    transactionType,
  });
}

function isTransactionCreateConstraints(
  value: TrustedEntityConstraints | undefined,
): value is CategoryTransactionCreateConstraints {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const keys = Object.keys(value).sort();
  return keys.length === 2
    && keys[0] === 'eligibleFor'
    && keys[1] === 'transactionType'
    && value.eligibleFor === 'transaction.create'
    && (value.transactionType === 'INCOME' || value.transactionType === 'EXPENSE');
}

export function createCategoryResolver(
  db: Pick<PrismaClient, 'category'>,
): EntityResolver {
  const resolver: EntityResolver = {
    entityType: 'category' as const,
    async loadCandidates(scope) {
      const { authenticatedUserId, trustedConstraints } = scope;
      if (!isTransactionCreateConstraints(trustedConstraints)) {
        throw EntityResolutionError.configuration();
      }
      const categories = await db.category.findMany({
        where: {
          userId: authenticatedUserId,
          type: trustedConstraints.transactionType,
        },
        select: {
          id: true,
          name: true,
          type: true,
        },
        take: ENTITY_RESOLUTION_LIMITS.candidates + 1,
      });
      return categories.map((category) => {
        if (category.type !== trustedConstraints.transactionType) {
          throw EntityResolutionError.configuration();
        }
        return createEntityCandidate({
          entityType: 'category',
          internalId: category.id,
          displayLabel: category.name,
          canonicalLabel: category.name,
          aliases: [],
          discriminator: category.type,
          trustedMetadata: {
            type: category.type,
            eligibleFor: trustedConstraints.eligibleFor,
          },
          stableTieBreakKey: category.id,
        });
      });
    },
    matchCandidate(input) {
      const { candidate, reference, trustedConstraints } = input;
      if (
        !isTransactionCreateConstraints(trustedConstraints)
        || candidate.trustedMetadata.eligibleFor !== trustedConstraints.eligibleFor
        || candidate.trustedMetadata.type !== trustedConstraints.transactionType
        || candidate.aliases.length !== 0
      ) {
        throw EntityResolutionError.configuration();
      }
      return matchEntityCandidate(candidate, reference, { constrained: true });
    },
  };
  return Object.freeze(resolver);
}
