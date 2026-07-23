import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { createPrismaResources } from '../../src/lib/prismaFactory';
import { assertTestDatabaseUrl } from '../../src/lib/assertTestDatabaseUrl';
import {
  EntityResolverRegistry,
  MERCHANT_TRANSACTION_CREATE_CONSTRAINTS,
  createEntityResolutionService,
  createMerchantResolver,
} from '../../src/assistant/entity-resolution';

const url = process.env.TEST_DATABASE_URL;
if (url) assertTestDatabaseUrl(url);
const resources = url ? createPrismaResources(url, { max: 4 }) : undefined;
const users: string[] = [];

afterAll(() => resources?.close());
afterEach(async () => {
  if (resources && users.length) {
    await resources.prisma.user.deleteMany({ where: { id: { in: users.splice(0) } } });
  }
});

async function user(label: string) {
  const row = await resources!.prisma.user.create({
    data: {
      email: `${label}-${Date.now()}-${Math.random()}@test.local`,
      name: label,
    },
  });
  users.push(row.id);
  const category = await resources!.prisma.category.create({
    data: {
      userId: row.id,
      name: `${label} category`,
      type: 'EXPENSE',
      icon: 'test',
      color: '#000000',
    },
  });
  return { row, category };
}

function service() {
  const registry = new EntityResolverRegistry();
  registry.register(createMerchantResolver(resources!.prisma));
  registry.finalize();
  return createEntityResolutionService(registry);
}

function resolve(userId: string, referenceText: string) {
  return service().resolve({
    authenticatedUserId: userId,
    reference: {
      entityType: 'merchant',
      referenceText,
      source: 'provider_extracted',
    },
    trustedConstraints: MERCHANT_TRANSACTION_CREATE_CONSTRAINTS,
  });
}

describe.skipIf(!url)('MerchantResolver (disposable PostgreSQL)', () => {
  it('enforces owner scope in SQL and makes a cross-user-only match not_found', async () => {
    const owner = await user('owner');
    const other = await user('other');
    await resources!.prisma.merchantMapping.create({
      data: {
        userId: owner.row.id,
        merchantName: 'Private Merchant',
        normalizedMerchant: 'private merchant',
        categoryId: owner.category.id,
      },
    });

    await expect(resolve(other.row.id, 'Private Merchant')).resolves.toEqual({
      kind: 'not_found',
      entityType: 'merchant',
      normalizedReference: 'private merchant',
    });
  });

  it('resolves only the caller mapping and cross-user rows cannot affect ambiguity', async () => {
    const owner = await user('owner-match');
    const other = await user('other-match');
    const owned = await resources!.prisma.merchantMapping.create({
      data: {
        userId: owner.row.id,
        merchantName: 'Starbucks',
        normalizedMerchant: 'starbucks',
        categoryId: owner.category.id,
      },
    });
    await resources!.prisma.merchantMapping.create({
      data: {
        userId: other.row.id,
        merchantName: 'Starbucks',
        normalizedMerchant: 'starbucks',
        categoryId: other.category.id,
      },
    });

    await expect(resolve(owner.row.id, 'starbucks')).resolves.toMatchObject({
      kind: 'resolved',
      entity: { internalId: owned.id },
      displayLabel: 'Starbucks',
    });
  });
});
