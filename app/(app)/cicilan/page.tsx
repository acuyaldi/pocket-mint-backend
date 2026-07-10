"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { LoaderCircle } from "lucide-react";
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
    
    if (overdue.length > 0) return { text: `${overdue.length} Overdue`, color: "#ba1a1a" };
    if (upcoming.length > 0) return { text: `${upcoming.length} Upcoming`, color: "#895024" };
    return { text: "All on track", color: "#006d36" };
  }, [all]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" aria-label="Loading installments" />
      </div>
    );
  }

  return (
    <motion.div className="space-y-6" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>
      <section className="surface-card rounded-2xl border border-white/80 px-6 py-5">
        <p className="font-mono text-[11px] tracking-[0.08em] text-primary">
          INSTALLMENTS
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold tracking-[-0.02em] text-foreground">
          Keep every cicilan honest and readable
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Monitor monthly obligation, remaining burden, nearest due date, and
          account health from one route.
        </p>
      </section>

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
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <InstallmentList installments={all} />
        <RightSidebar activeCount={activeCount} totalRemaining={totalRemaining} nearestDue={nearestDue} />
      </div>
    </motion.div>
  );
}
