import { AssistantError } from './errors';
import type { TransactionCreateInput } from './tools';

export const ASSISTANT_FINANCIAL_DRAFT_TTL_MS = 15 * 60 * 1000;
const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9_.:-]{1,128}$/;

export function validateIdempotencyKey(value: unknown): string {
  if (typeof value !== 'string' || !IDEMPOTENCY_KEY_RE.test(value)) {
    throw AssistantError.invalidIdempotencyKey();
  }
  return value;
}

export function renderTransactionDraftPreview(input: TransactionCreateInput): string {
  const note = input.description === undefined ? '' : `, catatan: ${input.description}`;
  return `Draft transaksi ${input.type} sebesar ${input.amount} pada ${input.date} (wallet ${input.walletId}, kategori ${input.categoryId}${note}). Konfirmasi eksplisit diperlukan sebelum transaksi dibuat.`;
}
