// Payload untuk membuat anggaran (POST /api/v1/budgets)
export interface CreateBudgetDto {
  categoryId: string;
  amount: number;
}

// Payload untuk memperbarui jumlah anggaran (PATCH /api/v1/budgets/:id)
// categoryId is intentionally not part of this type — a request that sends it
// is rejected with CATEGORY_NOT_EDITABLE before it ever reaches the service.
export interface UpdateBudgetAmountDto {
  amount: number;
}

export type BudgetListStatus = 'active' | 'archived';
