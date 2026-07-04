"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useInstallments } from "@/src/features/installments/hooks/useInstallments";
import { HeroCard } from "./components/HeroCard.tsx";
import { InstallmentList } from "./components/InstallmentList.tsx";
import { RightSidebar } from "./components/RightSidebar.tsx";

export default function CicilanPage() {
  const { data: installments, isLoading } = useInstallments();
  const all = useMemo(() => installments ?? [], [installments]);

  // Compute aggregates for hero card
  const totalActive = useMemo(() => 
    all.filter(i => i.status === "ACTIVE").reduce((s, i) => s + i.monthlyAmount, 0), [all]
  );
  
  const trendData = useMemo(() => 
    Array.from({ length: 6 }, () => totalActive), [totalActive]
  );

  // Compute stats for hero bottom row
  const activeCount = useMemo(() => all.filter(i => i.status === "ACTIVE").length, [all]);
  const totalRemaining = useMemo(() => 
    all.filter(i => i.status === "ACTIVE").reduce((s, i) => s + (i.totalAmount - i.monthlyAmount * i.currentTerm), 0), [all]
  );
  
  const nearestDue = useMemo(() => {
    const activeInstallments = all.filter(i => i.status === "ACTIVE");
    if (activeInstallments.length === 0) return null;
    return activeInstallments
      .map(i => {
        const dueDate = new Date(i.startDate);
        dueDate.setMonth(dueDate.getMonth() + i.currentTerm);
        return dueDate;
      })
      .sort((a, b) => a.getTime() - b.getTime())[0];
  }, [all]);

  // Compute status for hero bottom row
  const status = useMemo(() => {
    const active = all.filter(i => i.status === "ACTIVE");
    const overdue = active.filter(i => {
      const dueDate = new Date(i.startDate);
      dueDate.setMonth(dueDate.getMonth() + i.currentTerm);
      return dueDate < new Date();
    });
    const upcoming = active.filter(i => {
      const dueDate = new Date(i.startDate);
      dueDate.setMonth(dueDate.getMonth() + i.currentTerm);
      const daysUntilDue = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilDue > 0 && daysUntilDue <= 30;
    });
    
    if (overdue.length > 0) return { text: `${overdue.length} Terlambat`, color: "#ffb4ab" };
    if (upcoming.length > 0) return { text: `${upcoming.length} Upcoming`, color: "#facc15" };
    return { text: "Semua On-Track", color: "#4ade80" };
  }, [all]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4ade80]"></div>
      </div>
    );
  }

  return (
    <motion.div className="space-y-6" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>
      {/* Hero Card - Full Width */}
      <HeroCard 
        total={totalActive} 
        trendData={trendData} 
        activeCount={activeCount}
        totalRemaining={totalRemaining}
        nearestDue={nearestDue}
        status={status}
      />

      {/* Main Grid - Two Columns */}
      <div className="grid" style={{ gridTemplateColumns: "1fr 260px", gap: "16px" }}>
        <InstallmentList installments={all} />
        <RightSidebar activeCount={activeCount} totalRemaining={totalRemaining} nearestDue={nearestDue} />
      </div>
    </motion.div>
  );
}
