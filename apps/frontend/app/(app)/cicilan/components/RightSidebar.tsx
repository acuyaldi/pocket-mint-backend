"use client";

import { JatuhTempoCard } from "./JatuhTempoCard.tsx";
import { OutstandingLiabilityCard } from "./OutstandingLiabilityCard.tsx";
import { ActiveInstallmentsWidget } from "./ActiveInstallmentsWidget.tsx";

interface RightSidebarProps {
  activeCount: number;
  totalRemaining: number;
  nearestDue: Date | null;
}

export function RightSidebar({ activeCount, totalRemaining, nearestDue }: RightSidebarProps) {
  return (
    <div className="flex flex-col gap-4">
      <ActiveInstallmentsWidget total={activeCount} remaining={totalRemaining} />
      <OutstandingLiabilityCard total={totalRemaining} />
      <JatuhTempoCard
        nearestDue={nearestDue
          ? nearestDue.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
          : "—"}
      />
    </div>
  );
}
