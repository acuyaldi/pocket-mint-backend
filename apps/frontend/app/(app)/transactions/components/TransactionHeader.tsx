"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fadeUp } from "./constants";

interface TransactionHeaderProps {
  onAddClick: () => void;
}

export function TransactionHeader({ onAddClick }: TransactionHeaderProps) {
  return (
    <motion.div variants={fadeUp}>
      <div className="flex items-end justify-between">
        <div>
          <h2
            className="tracking-tight"
            style={{ fontSize: 28, fontWeight: 700, color: "#F8FAFC", fontFamily: "var(--font-hanken)" }}
          >
            Transactions History
          </h2>
          <p className="mt-1" style={{ fontSize: 14, color: "#94A3B8", fontFamily: "var(--font-inter)" }}>
            Track every cent of your growth.
          </p>
        </div>
        <Button
          onClick={onAddClick}
          className="font-semibold gap-2"
          style={{
            backgroundColor: "#38BDF8",
            color: "#0F172A",
            padding: "9px 16px",
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <Plus className="size-4" /> Add Transaction
        </Button>
      </div>
    </motion.div>
  );
}
