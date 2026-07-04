"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "settled", label: "Settled" },
  { key: "cancelled", label: "Cancelled" },
];

export function FilterBar({ onFilter }: { onFilter: (key: string) => void }) {
  const [selected, setSelected] = useState("all");
  const handleClick = (key: string) => {
    setSelected(key);
    onFilter(key);
  };
  return (
    <div className="flex gap-2 mb-4">
      {FILTERS.map(f => (
        <Button
          key={f.key}
          variant={selected === f.key ? "default" : "outline"}
          onClick={() => handleClick(f.key)}
        >
          {f.label}
        </Button>
      ))}
    </div>
  );
}
