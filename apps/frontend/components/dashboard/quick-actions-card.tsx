"use client";

import { Card, CardContent } from "@/components/ui/card";
import { PlusCircle, ArrowLeftRight, Download, Scan } from "lucide-react";

interface QuickActionsCardProps {
  onAddTransaction?: () => void;
  onExport?: () => void;
}

const actions = [
  { icon: PlusCircle, label: "Add Transaction", key: "add", color: "text-emerald-400" },
  { icon: ArrowLeftRight, label: "Transfer", key: "transfer", color: "text-blue-400" },
  { icon: Download, label: "Export", key: "export", color: "text-amber-400" },
  { icon: Scan, label: "Scan Receipt", key: "scan", color: "text-purple-400" },
] as const;

export function QuickActionsCard({ onAddTransaction, onExport }: QuickActionsCardProps) {
  const handleClick = (key: string) => {
    if (key === "add") onAddTransaction?.();
    else if (key === "export") onExport?.();
  };

  return (
    <Card className="border border-[#1a1a1a] bg-[#0a0a0a] hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/[0.02] transition-all duration-300">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Quick Actions
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {actions.map(({ icon: Icon, label, key, color }) => (
            <button
              key={key}
              onClick={() => handleClick(key)}
              className="flex flex-col items-center gap-2 py-3 px-2 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-emerald-500/20 hover:bg-zinc-800/60 transition-all duration-200 cursor-pointer group"
            >
              <Icon className={`size-5 ${color} group-hover:scale-110 transition-transform`} />
              <span className="text-[10px] text-zinc-400 group-hover:text-zinc-200 transition-colors text-center leading-tight">
                {label}
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
