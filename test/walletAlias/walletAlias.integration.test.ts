// ============================================================
// Tests: Wallet alias namespace (disposable PostgreSQL) — Phase 37, PD-027
// ------------------------------------------------------------
// Proves the alias/canonical-name namespace guarantee holds against a real
// database and real concurrency, not just a mocked Prisma client:
// - the user-scoped advisory lock serializes a concurrent alias create and
//   wallet rename so neither can slip past the other's collision check;
// - the @@unique([userId, aliasNormalized]) constraint is the final
//   guarantee even when two alias creates race each other directly;
// - wallet deletion cascades its aliases.
// ============================================================
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { createPrismaResources } from '../../src/lib/prismaFactory';
import { assertTestDatabaseUrl } from '../../src/lib/assertTestDatabaseUrl';
import { createWalletAliasService } from '../../src/services/walletAlias.service';
import { createWalletService } from '../../src/services/wallet.service';
import { WalletAliasError } from '../../src/services/walletAlias.errors';
import { WalletError } from '../../src/services/wallet.errors';

const url = process.env.TEST_DATABASE_URL;
if (url) assertTestDatabaseUrl(url);
const resources = url ? createPrismaResources(url, { max: 12 }) : undefined;
const users: string[] = [];
afterAll(() => resources?.close());
afterEach(async () => { if (resources && users.length) await resources.prisma.user.deleteMany({ where: { id: { in: users.splice(0) } } }); });

describe.skipIf(!url)('Wallet alias namespace (disposable PostgreSQL)', () => {
  const db = () => resources!.prisma;
  const aliases = () => createWalletAliasService(db());
  const wallets = () => createWalletService(db());

  async function makeUserWithWallet(label: string) {
    const user = await db().user.create({ data: { email: `${label}-${Date.now()}-${Math.random()}@test.local`, name: label } });
    users.push(user.id);
    const wallet = await db().wallet.create({ data: { userId: user.id, name: 'BCA Debit', type: 'BANK', balance: 0 } });
    return { user, wallet };
  }

  it('creates an alias and cascades its deletion when the wallet is deleted', async () => {
    const { user, wallet } = await makeUserWithWallet('cascade');
    const created = await aliases().create({ userId: user.id, walletId: wallet.id, aliasDisplay: 'Rekening Utama' });
    expect(created.aliasNormalized).toBe('rekening utama');

    await db().wallet.delete({ where: { id: wallet.id } });
    const remaining = await db().walletAlias.findMany({ where: { walletId: wallet.id } });
    expect(remaining).toHaveLength(0);
  });

  it('isolates aliases per user: the same alias text is free for a different owner', async () => {
    const a = await makeUserWithWallet('isolation-a');
    const b = await makeUserWithWallet('isolation-b');
    await aliases().create({ userId: a.user.id, walletId: a.wallet.id, aliasDisplay: 'Dompet Utama' });
    // Same normalized text, different owner — must succeed, no cross-user collision.
    await expect(aliases().create({ userId: b.user.id, walletId: b.wallet.id, aliasDisplay: 'Dompet Utama' }))
      .resolves.toMatchObject({ aliasNormalized: 'dompet utama' });
  });

  it("404s deleting another user's alias, indistinguishable from missing", async () => {
    const a = await makeUserWithWallet('cross-user-a');
    const b = await makeUserWithWallet('cross-user-b');
    const alias = await aliases().create({ userId: a.user.id, walletId: a.wallet.id, aliasDisplay: 'Nickname' });
    await expect(aliases().remove({ userId: b.user.id, walletId: a.wallet.id, aliasId: alias.id }))
      .rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });

  it('rejects a wallet rename that collides with an existing alias of the same user', async () => {
    const { user, wallet } = await makeUserWithWallet('rename-collision');
    const other = await db().wallet.create({ data: { userId: user.id, name: 'Cash', type: 'CASH', balance: 0 } });
    await aliases().create({ userId: user.id, walletId: wallet.id, aliasDisplay: 'Dompet Harian' });

    await expect(wallets().updateWallet({ userId: user.id, walletId: other.id, name: 'Dompet Harian' }))
      .rejects.toMatchObject({ code: 'CONFLICT', statusCode: 409 });
    await expect(wallets().updateWallet({ userId: user.id, walletId: other.id, name: 'dompet   harian' }))
      .rejects.toBeInstanceOf(WalletError);
  });

  it('rejects creating a new wallet whose canonical name collides with an existing alias', async () => {
    const { user, wallet } = await makeUserWithWallet('create-collision');
    await aliases().create({ userId: user.id, walletId: wallet.id, aliasDisplay: 'Dana Darurat' });

    await expect(wallets().createWallet({ userId: user.id, name: 'Dana Darurat' }))
      .rejects.toMatchObject({ code: 'CONFLICT', statusCode: 409 });
  });

  it('serializes a concurrent alias create and wallet rename targeting the same name: exactly one wins', async () => {
    const { user, wallet } = await makeUserWithWallet('race-rename');
    const other = await db().wallet.create({ data: { userId: user.id, name: 'Cash', type: 'CASH', balance: 0 } });

    const results = await Promise.allSettled([
      aliases().create({ userId: user.id, walletId: wallet.id, aliasDisplay: 'Shared Name' }),
      wallets().updateWallet({ userId: user.id, walletId: other.id, name: 'Shared Name' }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    // The namespace itself stays consistent regardless of which write won:
    // the alias row count and the renamed-wallet's actual name must agree.
    const aliasRows = await db().walletAlias.findMany({ where: { userId: user.id, aliasNormalized: 'shared name' } });
    const renamed = await db().wallet.findUnique({ where: { id: other.id } });
    if (aliasRows.length === 1) {
      expect(renamed?.name).not.toBe('Shared Name');
    } else {
      expect(renamed?.name).toBe('Shared Name');
    }
  });

  it('serializes two concurrent alias creates for the same normalized text: exactly one wins', async () => {
    const { user, wallet } = await makeUserWithWallet('race-alias');
    const other = await db().wallet.create({ data: { userId: user.id, name: 'Cash', type: 'CASH', balance: 0 } });

    const results = await Promise.allSettled([
      aliases().create({ userId: user.id, walletId: wallet.id, aliasDisplay: 'Same Alias' }),
      aliases().create({ userId: user.id, walletId: other.id, aliasDisplay: 'Same Alias' }),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejectedOne = results.find((r) => r.status === 'rejected');
    expect(rejectedOne && (rejectedOne as PromiseRejectedResult).reason).toBeInstanceOf(WalletAliasError);

    const rows = await db().walletAlias.findMany({ where: { userId: user.id, aliasNormalized: 'same alias' } });
    expect(rows).toHaveLength(1);
  });
});
