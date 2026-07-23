"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ASSISTANT_FINANCIAL_DRAFT_TTL_MS = void 0;
exports.validateIdempotencyKey = validateIdempotencyKey;
exports.renderTransactionDraftPreview = renderTransactionDraftPreview;
const errors_1 = require("./errors");
exports.ASSISTANT_FINANCIAL_DRAFT_TTL_MS = 15 * 60 * 1000;
const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9_.:-]{1,128}$/;
function validateIdempotencyKey(value) {
    if (typeof value !== 'string' || !IDEMPOTENCY_KEY_RE.test(value)) {
        throw errors_1.AssistantError.invalidIdempotencyKey();
    }
    return value;
}
function renderTransactionDraftPreview(input, walletDisplayLabel = input.walletId) {
    const note = input.description === undefined ? '' : `, catatan: ${input.description}`;
    return `Draft transaksi ${input.type} sebesar ${input.amount} pada ${input.date} (wallet ${walletDisplayLabel}, kategori ${input.categoryId}${note}). Konfirmasi eksplisit diperlukan sebelum transaksi dibuat.`;
}
//# sourceMappingURL=financial-draft.js.map