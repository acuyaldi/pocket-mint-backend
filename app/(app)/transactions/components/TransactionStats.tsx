"use client";

import { motion } from "framer-motion";
import { fadeUp, formatSignedCurrency } from "./constants";

interface TransactionStatsProps {
  income: number;
  expense: number;
  net: number;
}

export function TransactionStats({ income, expense, net }: TransactionStatsProps) {
  return (
    <motion.div variants={fadeUp} className="w-full">
      <div
        className="flex flex-col overflow-hidden sm:flex-row sm:items-stretch"
        style={{
          backgroundColor: "var(--color-card)",
          border: "1px solid var(--color-border)",
          borderRadius: 8,
        }}
      >
        {/* Total Income */}
        <div
          className="flex-1 border-b px-5 py-4 sm:border-b-0"
          style={{
            borderLeft: "2px solid var(--color-primary)",
            borderBottomColor: "rgba(188,202,187,0.5)",
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-muted-foreground)", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
            Total Income
          </div>
          <div className="mt-1" style={{ fontSize: 16, fontWeight: 700, color: "var(--color-primary)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
            {formatSignedCurrency(income, "+")}
          </div>
        </div>

        <div
          className="hidden self-center sm:block"
          style={{ width: 1, height: 40, backgroundColor: "rgba(188,202,187,0.5)" }}
        />

        {/* Total Expense */}
        <div
          className="flex-1 border-b px-5 py-4 sm:border-b-0"
          style={{
            borderLeft: "2px solid var(--color-destructive)",
            borderBottomColor: "rgba(188,202,187,0.5)",
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-muted-foreground)", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
            Total Expense
          </div>
          <div className="mt-1" style={{ fontSize: 16, fontWeight: 700, color: "var(--color-destructive)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
            {formatSignedCurrency(expense, "-")}
          </div>
        </div>

        <div
          className="hidden self-center sm:block"
          style={{ width: 1, height: 40, backgroundColor: "rgba(188,202,187,0.5)" }}
        />

        {/* Net Change */}
        <div
          className="flex-1 px-5 py-4"
          style={{ borderLeft: `2px solid ${net >= 0 ? "var(--color-primary)" : "var(--color-destructive)"}` }}
        >
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-muted-foreground)", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
            Net Change
          </div>
          <div className="mt-1" style={{ fontSize: 16, fontWeight: 700, color: net >= 0 ? "var(--color-primary)" : "var(--color-destructive)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
            {formatSignedCurrency(Math.abs(net), net >= 0 ? "+" : "-")}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
