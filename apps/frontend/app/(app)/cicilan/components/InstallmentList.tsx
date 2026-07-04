"use client";

import { useMemo } from "react";
import { InstallmentCard, type Installment } from "./InstallmentCard";

interface InstallmentListProps {
  installments: Installment[];
}

export function InstallmentList({ installments }: InstallmentListProps) {
  const visibleInstallments = useMemo(() => {
    return installments.slice(0, 10); // Show first 10 installments
  }, [installments]);

  return (
    <div className="space-y-4">
      {visibleInstallments.map((installment) => (
        <InstallmentCard key={installment.id} installment={installment} />
      ))}
    </div>
  );
}
