"use client";

import { PlusCircle, ArrowLeftRight, Download, Scan } from "lucide-react";

interface QuickActionsCardProps {
  onAddTransaction?: () => void;
  onExport?: () => void;
}

const actions = [
  { icon: PlusCircle, label: "Add Transaction", key: "add", color: "#10B981" },
  { icon: ArrowLeftRight, label: "Transfer", key: "transfer", color: "#38BDF8" },
  { icon: Download, label: "Export", key: "export", color: "#F59E0B" },
  { icon: Scan, label: "Scan Receipt", key: "scan", color: "#8b5cf6" },
] as const;

export function QuickActionsCard({ onAddTransaction, onExport }: QuickActionsCardProps) {
  const handleClick = (key: string) => {
    if (key === "add") onAddTransaction?.();
    else if (key === "export") onExport?.();
  };

  return (
    <div
      style={{
        backgroundColor: "#1E293B",
        border: "1px solid #334155",
        borderRadius: "8px",
        padding: "16px",
      }}
      className="transition-all duration-300 hover:border-[#38BDF8]"
    >
      <div className="flex items-center gap-2" style={{ marginBottom: "16px" }}>
        <span
          className="uppercase font-semibold"
          style={{
            fontFamily: "var(--font-inter)",
            fontSize: "11px",
            fontWeight: 600,
            color: "#64748B",
            letterSpacing: "0.05em",
          }}
        >
          Quick Actions
        </span>
      </div>
      <div className="grid grid-cols-2" style={{ gap: "8px" }}>
        {actions.map(({ icon: Icon, label, key, color }) => (
          <button
            key={key}
            onClick={() => handleClick(key)}
            className="flex flex-col items-center gap-2 transition-all duration-200 cursor-pointer group"
            style={{
              padding: "12px 8px",
              borderRadius: "8px",
              backgroundColor: "#334155",
              border: "1px solid #334155",
            }}
          >
            <Icon className="size-5 group-hover:scale-110 transition-transform" style={{ color }} />
            <span
              className="text-center leading-tight transition-colors group-hover:text-[#F8FAFC]"
              style={{ fontFamily: "var(--font-inter)", fontSize: "11px", color: "#94A3B8" }}
            >
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
