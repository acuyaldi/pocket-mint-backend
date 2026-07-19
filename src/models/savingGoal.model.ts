export type SavingGoalStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

// Payload untuk membuat target tabungan (POST /api/v1/saving-goals)
export interface CreateSavingGoalDto {
  name: string;
  targetAmount: number;
  /** Optional; defaults to zero when omitted. */
  currentAmount?: number;
  targetDate?: string;
  notes?: string;
}

// Payload untuk memperbarui metadata target tabungan (PATCH /api/v1/saving-goals/:id)
// Semua field opsional — hanya field yang dikirim yang akan diperbarui
export interface UpdateSavingGoalDto {
  name?: string;
  targetAmount?: number;
  targetDate?: string | null;
  notes?: string | null;
}

// Payload untuk memperbarui progres (PATCH /api/v1/saving-goals/:id/progress)
export interface UpdateSavingGoalProgressDto {
  currentAmount: number;
}
