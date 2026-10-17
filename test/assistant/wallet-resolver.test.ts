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
  aliases?: readonly { aliasDisplay: string }[];
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
        aliases: { select: { aliasDisplay: true } },
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

  // ────────────────────────────── Phase 37: explicit aliases ──────────────────────────────

  it('resolves exactly through a stored explicit alias (no fuzzy matching)', async () => {
    const { service } = setup([
      { id: 'wallet-a', name: 'BCA Debit', type: 'BANK', isArchived: false, aliases: [{ aliasDisplay: 'rekening utama' }] },
    ]);

    const result = await service.resolve({
      authenticatedUserId: 'owner-a',
      reference: { entityType: 'wallet', referenceText: 'Rekening Utama' },
      trustedConstraints: WALLET_TRANSACTION_CREATE_CONSTRAINTS,
    });

    expect(result).toMatchObject({
      kind: 'resolved',
      entity: { internalId: 'wallet-a' },
      confidence: { score: 950, band: 'strong' },
    });
    if (result.kind === 'resolved') {
      expect(result.evidence.some((e) => e.kind === 'alias_exact')).toBe(true);
    }

    // A near-miss (substring/partial) of the explicit alias still does not match —
    // explicit aliases add exact candidates only, never fuzzy ones.
    await expect(service.resolve({
      authenticatedUserId: 'owner-a',
      reference: { entityType: 'wallet', referenceText: 'rekening' },
      trustedConstraints: WALLET_TRANSACTION_CREATE_CONSTRAINTS,
    })).resolves.toMatchObject({ kind: 'not_found' });
  });

  it('keeps existing derived-token behavior available alongside explicit aliases', async () => {
    const { service } = setup([
      { id: 'wallet-a', name: 'BCA Debit', type: 'BANK', isArchived: false, aliases: [{ aliasDisplay: 'rekening utama' }] },
    ]);

    // The name-derived token "debit" still resolves, unaffected by the explicit alias.
    await expect(service.resolve({
      authenticatedUserId: 'owner-a',
      reference: { entityType: 'wallet', referenceText: 'debit' },
      trustedConstraints: WALLET_TRANSACTION_CREATE_CONSTRAINTS,
    })).resolves.toMatchObject({ kind: 'resolved', entity: { internalId: 'wallet-a' } });
  });

  it('never silently selects on ambiguity even when an explicit alias is involved', async () => {
    const { service } = setup([
      { id: 'wallet-payroll', name: 'BCA Payroll', type: 'BANK', isArchived: false },
      { id: 'wallet-debit', name: 'BCA Debit', type: 'BANK', isArchived: false, aliases: [{ aliasDisplay: 'BCA' }] },
    ]);

    // "BCA" is both wallet-payroll's canonical-derived alias token AND
    // wallet-debit's explicit alias — still surfaces as ambiguous, never a
    // silent pick, exactly like the existing derived-token ambiguity case.
    const result = await service.resolve({
      authenticatedUserId: 'owner-a',
      reference: { entityType: 'wallet', referenceText: 'BCA' },
      trustedConstraints: WALLET_TRANSACTION_CREATE_CONSTRAINTS,
    });
    expect(result.kind).toBe('ambiguous');
  });

  it("isolates a wallet's explicit aliases to resolution scoped by that owner", async () => {
    const { findMany, service } = setup([
      { id: 'wallet-a', name: 'Cash', type: 'CASH', isArchived: false, aliases: [{ aliasDisplay: 'dompet kecil' }] },
    ]);

    await service.resolve({
      authenticatedUserId: 'owner-a',
      reference: { entityType: 'wallet', referenceText: 'dompet kecil' },
      trustedConstraints: WALLET_TRANSACTION_CREATE_CONSTRAINTS,
    });

    // The owner scope is enforced entirely at the query boundary (userId in `where`);
    // there is no separate alias query to leak across owners.
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'owner-a', isArchived: false } }));
  });
});
