"use client";

import { useState } from "react";
import { Plus, Target } from "lucide-react";
import { useGoals, type Goal } from "@/src/features/goals/hooks/useGoals";
import { GoalCard } from "./components/GoalCard";
import GoalModal from "./components/GoalModal";

export default function GoalsPage() {
  const { data: goals, isLoading } = useGoals();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const openCreate = () => {
    setEditingGoal(null);
    setIsModalOpen(true);
  };
  const openEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setIsModalOpen(true);
  };

  return (
    <div className="w-full min-h-full flex flex-col gap-6 text-foreground">
      {/* Header */}
      <div className="surface-card flex flex-col gap-4 rounded-2xl border border-white/80 px-5 py-5 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[11px] tracking-[0.08em] text-primary">
            GOALS
          </p>
          <h1 className="mt-2 text-2xl font-bold font-heading text-foreground">
            Savings targets with real progress
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tetapkan target, pantau nominal tersimpan, dan lihat progres tanpa
            noise tambahan.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex w-full cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-105 active:scale-95 md:w-auto"
        >
          <Plus className="size-4" />
          Add Goal
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl h-[180px] bg-card border border-border" />
          ))}
        </div>
      ) : goals && goals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onEdit={openEdit} />
          ))}
        </div>
      ) : (
        <button
          onClick={openCreate}
          className="flex flex-col items-center justify-center gap-3 rounded-xl py-16 border border-dashed border-border bg-card transition-opacity hover:opacity-75 cursor-pointer"
        >
          <Target className="size-8 text-primary" />
          <p className="text-sm font-semibold text-foreground">No goals yet</p>
          <p className="text-[12px] text-muted-foreground">
            Create your first savings target
          </p>
        </button>
      )}

      <GoalModal
        isOpen={isModalOpen}
        goal={editingGoal}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
