// ============================================================
// Installment query service
// ------------------------------------------------------------
// Read-only service backing `GET /installments`. It owns the ownership-scoped
// installment list and its status-filter validation; it has no Express dependency
// and writes no HTTP responses, returning typed rows with Decimal money fields
// intact (serialization is the controller's job). It performs NO mutations and
// opens NO write transactions — installment writes belong to the transaction
// command service (create inside a transaction's atomic write, delete on reversal).
//
// The list reports the installment's *stored contract* values verbatim; there is
// no paid-terms field in the schema, so no progress/remaining is computed. Status
// is a persisted column, so no date-based classification (and thus no reporting
// timezone) is involved on this path.
//
// Dependency injection mirrors the other services: a narrow read Prisma `Pick` is
// passed to the factory; the default `installmentQueryService` binds the shared
// singleton for production.
// ============================================================

import prisma from '../lib/prisma';
import { InstallmentStatus } from '../generated/prisma/client';
import { InstallmentError } from './installment.errors';
import type {
  InstallmentListItem,
  InstallmentQueryPrismaClient,
  ListInstallmentsInput,
} from './installment-query.types';

/** The allowed status filter values (the persisted enum), for the 400 message. */
const VALID_STATUSES = Object.values(InstallmentStatus);

/** True when `value` is one of the persisted installment statuses. */
function isInstallmentStatus(value: string): value is InstallmentStatus {
  return (VALID_STATUSES as string[]).includes(value);
}

export function createInstallmentQueryService(db: InstallmentQueryPrismaClient) {
  /**
   * List every installment the caller owns, newest first (`startDate desc`),
   * ownership-scoped so cross-user rows are impossible. An optional `status`
   * narrows the result: a falsy value (absent / empty string) means "no filter"
   * exactly as before, while a non-empty value that is not a valid status throws a
   * typed 400 (`BAD_REQUEST`) — the same status/code/message the old controller
   * sent, now raised before any database read. Returns rows with Decimal money
   * fields and the wallet's `id/name/type` (via relation include) intact; the
   * controller serializes at the response boundary. Unexpected database failures
   * propagate untyped to the central error handler.
   */
  async function listInstallments(input: ListInstallmentsInput): Promise<InstallmentListItem[]> {
    const { userId, status } = input;

    if (status && !isInstallmentStatus(status)) {
      throw new InstallmentError(
        `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}`,
        400,
        'BAD_REQUEST',
      );
    }

    return db.installment.findMany({
      where: {
        userId,
        ...(status && isInstallmentStatus(status) ? { status } : {}),
      },
      include: {
        wallet: { select: { id: true, name: true, type: true } },
        transactions: { select: { id: true, type: true, createdAt: true } },
      },
      orderBy: { nextDueDate: 'asc' },
    });
  }

  return { listInstallments };
}

/** Production instance bound to the shared Prisma singleton. */
export const installmentQueryService = createInstallmentQueryService(prisma);
