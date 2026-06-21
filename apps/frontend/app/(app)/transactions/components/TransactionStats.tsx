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
    <motion.div variants={fadeUp}>
      <div
        className="flex items-center gap-0"
        style={{
          backgroundColor: "#1E293B",
          border: "1px solid #334155",
          borderRadius: 8,
          padding: "20px 24px",
        }}
      >
        {/* Total Income */}
        <div className="flex-1">
          <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            TOTAL INCOME
          </div>
          <div className="mt-1" style={{ fontSize: 18, fontWeight: 700, color: "#10B981", fontFamily: "var(--font-hanken)" }}>
            {formatSignedCurrency(income, "+")}
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 40, backgroundColor: "#334155", alignSelf: "center" }} />

        {/* Total Expense */}
        <div className="flex-1 text-center">
          <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            TOTAL EXPENSE
          </div>
          <div className="mt-1" style={{ fontSize: 18, fontWeight: 700, color: "#EF4444", fontFamily: "var(--font-hanken)" }}>
            {formatSignedCurrency(expense, "-")}
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 40, backgroundColor: "#334155", alignSelf: "center" }} />

        {/* Net Change */}
        <div className="flex-1 text-right">
          <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            NET CHANGE
          </div>
          <div className="mt-1" style={{ fontSize: 18, fontWeight: 700, color: net >= 0 ? "#10B981" : "#EF4444", fontFamily: "var(--font-hanken)" }}>
            {formatSignedCurrency(Math.abs(net), net >= 0 ? "+" : "-")}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
