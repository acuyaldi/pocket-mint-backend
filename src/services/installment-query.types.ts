// ============================================================
// Installment query service contracts (input/output/dependency types)
// ------------------------------------------------------------
// Explicit, Express-free inputs and outputs for the installment *query* service.
// The installment HTTP surface is read-only (list + a static rates endpoint that
// touches neither identity nor the database), so there is no command counterpart:
// installment mutations live entirely inside the transaction command service
// (create as part of a transaction's atomic write, delete on reversal). The
// controller maps the authenticated request into these types and serializes the
// typed Decimal result back out (one clear boundary). No `any`, no raw request
// objects, and a narrow Prisma dependency (reads only) so tests can inject a fake
// without a DI framework or a repository layer.
//
// Scope note: the live list endpoint reports the installment's *stored contract*
// values (principal, interest, grandTotal, monthlyAmount, term, status) exactly as
// persisted. There is no paid-terms / payment-lifecycle field in the schema, so no
// progress or remaining-amount is computed here — modelling those would invent
// behaviour the endpoint does not have.
// ============================================================

import type { PrismaClient, Prisma, InstallmentStatus } from '../generated/prisma/client';

export type { InstallmentStatus };

/**
 * The slice of the Prisma client the query service needs: read access to the
 * `installment` model only (`findMany`, with the wallet fields pulled through a
 * relation `include` — no direct `wallet` model access). Ownership is enforced by
 * scoping every query on `userId`, so no write surface and no other model is
 * required or exposed.
 */
export type InstallmentQueryPrismaClient = Pick<PrismaClient, 'installment'>;

/**
 * Input for the installment list (`GET /installments`). `userId` is the
 * authenticated caller, injected by `requireUser` — never taken from the query
 * string or body. `status` is the raw, client-supplied scalar filter (already
 * reduced to a single string by the controller's `scalarString`); it is left
 * unvalidated here on purpose — the service is the one place that classifies it
 * against the allowed set and throws a typed 400 for an unknown value, preserving
 * the existing lenient rule that a falsy value (absent / empty) means "no filter".
 */
export interface ListInstallmentsInput {
  userId: string;
  status?: string;
}

/**
 * One installment row as read for the list, carrying exact `Decimal` money fields
 * plus the wallet's display fields via the relation `include`. Serialization to
 * numbers is the controller's job (the single response boundary); the service
 * never calls `.toNumber()` / `parseFloat`. Shape is the Prisma payload for the
 * exact `include` the service issues, so it stays in lockstep with the query.
 */
export type InstallmentListItem = Prisma.InstallmentGetPayload<{
  include: { wallet: { select: { id: true; name: true; type: true } } };
}>;
