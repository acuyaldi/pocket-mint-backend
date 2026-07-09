"use client";

import { Pencil, Trash2, CalendarDays, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  useDeleteGoal,
  goalProgress,
  isGoalComplete,
  type Goal,
} from "@/src/features/goals/hooks/useGoals";

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
}

export function GoalCard({ goal, onEdit }: GoalCardProps) {
  const deleteGoal = useDeleteGoal();
  const progress = goalProgress(goal);
  const complete = isGoalComplete(goal);

  const handleDelete = () => {
    // ponytail: native confirm; swap for a styled Dialog if UX polish is requested
    if (window.confirm(`Delete goal "${goal.name}"?`)) {
      deleteGoal.mutate(goal.id);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
      {/* Top row: name + actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-base font-semibold truncate text-foreground font-heading">
            {goal.name}
          </p>
          {goal.deadline && (
            <p className="flex items-center gap-1.5 text-[12px] mt-1 text-muted-foreground">
              <CalendarDays className="size-3.5 shrink-0" />
              {new Date(goal.deadline).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(goal)}
            aria-label={`Edit goal ${goal.name}`}
            className="p-2 rounded-lg transition-colors hover:bg-muted text-muted-foreground cursor-pointer"
          >
            <Pencil className="size-4" />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteGoal.isPending}
            aria-label={`Delete goal ${goal.name}`}
            className="p-2 rounded-lg transition-colors hover:bg-muted text-destructive disabled:opacity-50 cursor-pointer"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {/* Amounts */}
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xl font-bold font-mono text-primary">
          {formatCurrency(goal.savedAmount)}
        </span>
        <span className="text-[12px] font-mono text-muted-foreground">
          / {formatCurrency(goal.targetAmount)}
        </span>
      </div>

      {/* Progress */}
      <div>
        <div className="h-1.5 rounded-full overflow-hidden bg-border">
          <div
            className="h-full rounded-full transition-all duration-700 bg-primary"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[12px] font-mono text-muted-foreground">{progress}%</span>
          {complete && (
            <span className="flex items-center gap-1 text-[12px] font-semibold text-primary">
              <CheckCircle2 className="size-3.5" />
              Reached
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
