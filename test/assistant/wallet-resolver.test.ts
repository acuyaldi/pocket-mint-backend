import { describe, expect, it, vi } from 'vitest';
import {
  EntityResolverRegistry,
  WALLET_TRANSACTION_CREATE_CONSTRAINTS,
  createEntityResolutionService,
  createWalletResolver,
} from '../../src/assistant/entity-resolution';

function setup(rows: readonly {
  id: string;
  name: string;
  type: 'CASH' | 'BANK' | 'E_WALLET' | 'CREDIT_CARD' | 'PAYLATER' | 'LOAN';
  isArchived: boolean;
}[]) {
  const findMany = vi.fn().mockResolvedValue(rows);
  const registry = new EntityResolverRegistry();
  registry.register(createWalletResolver({
    wallet: { findMany },
  } as never));
  registry.finalize();
  return {
    findMany,
    service: createEntityResolutionService(registry),
  };
}

describe('production WalletResolver', () => {
  it('loads only active wallets for the authenticated owner at the database boundary', async () => {
    const { findMany, service } = setup([
      { id: 'wallet-a', name: 'BCA', type: 'BANK', isArchived: false },
    ]);

    await service.resolve({
      authenticatedUserId: 'owner-a',
      reference: {
        entityType: 'wallet',
        referenceText: 'BCA',
        source: 'provider_extracted',
      },
      trustedConstraints: WALLET_TRANSACTION_CREATE_CONSTRAINTS,
    });

    expect(findMany).toHaveBeenCalledOnce();
    expect(findMany).toHaveBeenCalledWith({
      where: { userId: 'owner-a', isArchived: false },
      select: {
        id: true,
        name: true,
        type: true,
        isArchived: true,
      },
      take: 101,
    });
  });

  it('resolves canonical and normalized wallet names deterministically', async () => {
    const { service } = setup([
      { id: 'wallet-a', name: 'BCA-Debit', type: 'BANK', isArchived: false },
    ]);

    await expect(service.resolve({
      authenticatedUserId: 'owner-a',
      reference: { entityType: 'wallet', referenceText: 'BCA-Debit' },
      trustedConstraints: WALLET_TRANSACTION_CREATE_CONSTRAINTS,
    })).resolves.toMatchObject({
      kind: 'resolved',
      entity: { internalId: 'wallet-a' },
      confidence: { score: 1000, band: 'exact' },
    });

    await expect(service.resolve({
      authenticatedUserId: 'owner-a',
      reference: { entityType: 'wallet', referenceText: 'bca debit' },
      trustedConstraints: WALLET_TRANSACTION_CREATE_CONSTRAINTS,
    })).resolves.toMatchObject({
      kind: 'resolved',
      entity: { internalId: 'wallet-a' },
      confidence: { score: 900, band: 'strong' },
    });
  });

  it('derives bounded exact aliases from trusted wallet names and returns ambiguity safely', async () => {
    const { service } = setup([
      { id: 'wallet-payroll', name: 'BCA Payroll', type: 'BANK', isArchived: false },
      { id: 'wallet-debit', name: 'BCA Debit', type: 'BANK', isArchived: false },
    ]);

    const result = await service.resolve({
      authenticatedUserId: 'owner-a',
      reference: { entityType: 'wallet', referenceText: 'BCA' },
      trustedConstraints: WALLET_TRANSACTION_CREATE_CONSTRAINTS,
    });

    expect(result.kind).toBe('ambiguous');
    if (result.kind !== 'ambiguous') return;
    expect(result.options.map((option) => option.displayLabel)).toEqual([
      'BCA Debit',
      'BCA Payroll',
    ]);
    expect(result.options.every((option) =>
      option.evidence.some((evidence) => evidence.kind === 'alias_exact'),
    )).toBe(true);
  });

  it('does not resolve substrings or wallets absent from the owner-scoped query', async () => {
    const { service } = setup([
      { id: 'wallet-a', name: 'BCA', type: 'BANK', isArchived: false },
    ]);

    await expect(service.resolve({
      authenticatedUserId: 'owner-a',
      reference: { entityType: 'wallet', referenceText: 'pakai BCA sekarang' },
      trustedConstraints: WALLET_TRANSACTION_CREATE_CONSTRAINTS,
    })).resolves.toEqual({
      kind: 'not_found',
      entityType: 'wallet',
      normalizedReference: 'pakai bca sekarang',
    });
  });

  it('rejects missing or caller-invented wallet eligibility constraints', async () => {
    const { service, findMany } = setup([]);

    await expect(service.resolve({
      authenticatedUserId: 'owner-a',
      reference: { entityType: 'wallet', referenceText: 'BCA' },
    })).rejects.toMatchObject({ code: 'ENTITY_RESOLUTION_CONFIGURATION_ERROR' });
    await expect(service.resolve({
      authenticatedUserId: 'owner-a',
      reference: { entityType: 'wallet', referenceText: 'BCA' },
      trustedConstraints: { eligibleFor: 'archived-wallets' },
    })).rejects.toMatchObject({ code: 'ENTITY_RESOLUTION_CONFIGURATION_ERROR' });
    expect(findMany).not.toHaveBeenCalled();
  });
});
