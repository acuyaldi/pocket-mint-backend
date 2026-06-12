import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { TransactionType } from '../generated/prisma/enums';
import { sendSuccess, sendError } from '../utils/response';
import { CreateTransactionDto, ListTransactionQuery } from '../models/transaction.model';

const VALID_TYPES = Object.values(TransactionType) as string[];

// Decimal (Prisma) → number agar JSON-nya bersih buat frontend
const serialize = <T extends { amount: unknown }>(tx: T) => ({
  ...tx,
  amount: Number(tx.amount),
});

export class TransactionController {
  // GET /api/v1/transactions
  static async getAll(
    req: Request<unknown, unknown, unknown, ListTransactionQuery>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId, accountId, type, limit } = req.query;

      if (type && !VALID_TYPES.includes(type)) {
        return sendError(res, `Invalid type. Allowed: ${VALID_TYPES.join(', ')}`, 400);
      }

      const take = limit ? Math.min(Math.max(parseInt(limit, 10) || 0, 0), 200) : undefined;

      const transactions = await prisma.transaction.findMany({
        where: {
          ...(userId && { userId }),
          ...(accountId && { accountId }),
          ...(type && { type: type as TransactionType }),
        },
        include: {
          account: { select: { id: true, name: true, type: true } },
          category: { select: { id: true, name: true, type: true } },
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        ...(take && { take }),
      });

      sendSuccess(res, transactions.map(serialize), 'Retrieved all transactions');
    } catch (err) {
      next(err);
    }
  }

  // POST /api/v1/transactions
  static async create(
    req: Request<unknown, unknown, CreateTransactionDto>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId, accountId, categoryId, type, amount, description, note, date } = req.body;

      // ---- Validasi field wajib ----
      if (!userId || !accountId) {
        return sendError(res, 'userId and accountId are required', 400);
      }
      if (!type || !VALID_TYPES.includes(type)) {
        return sendError(res, `type is required and must be one of: ${VALID_TYPES.join(', ')}`, 400);
      }
      if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
        return sendError(res, 'amount is required and must be a positive number', 400);
      }

      let parsedDate = new Date();
      if (date) {
        parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
          return sendError(res, 'date must be a valid date (e.g. YYYY-MM-DD)', 400);
        }
      }

      const transaction = await prisma.transaction.create({
        data: {
          userId,
          accountId,
          categoryId: categoryId ?? null,
          type: type as TransactionType,
          amount: Number(amount),
          description: description ?? null,
          note: note ?? null,
          date: parsedDate,
        },
        include: {
          account: { select: { id: true, name: true, type: true } },
          category: { select: { id: true, name: true, type: true } },
        },
      });

      sendSuccess(res, serialize(transaction), 'Transaction created successfully', 201);
    } catch (err) {
      // FK tidak valid (userId/accountId/categoryId tidak ada di DB)
      if ((err as { code?: string }).code === 'P2003') {
        return sendError(res, 'Invalid userId, accountId, or categoryId (related record not found)', 400);
      }
      next(err);
    }
  }

  // DELETE /api/v1/transactions/:id
  static async delete(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      await prisma.transaction.delete({ where: { id } });

      sendSuccess(res, { id }, `Transaction ${id} deleted successfully`);
    } catch (err) {
      // Record tidak ditemukan
      if ((err as { code?: string }).code === 'P2025') {
        return sendError(res, `Transaction with id ${req.params.id} not found`, 404);
      }
      next(err);
    }
  }
}
