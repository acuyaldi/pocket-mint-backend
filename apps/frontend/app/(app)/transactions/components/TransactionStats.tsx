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
        className="flex items-stretch"
        style={{
          backgroundColor: "#0e0e0e",
          border: "1px solid #262626",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {/* Total Income */}
        <div
          className="px-5 py-3"
          style={{ borderLeft: "2px solid #4ade80" }}
        >
          <div style={{ fontSize: 10, fontWeight: 600, color: "#bccabb", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
            Total Income
          </div>
          <div className="mt-1" style={{ fontSize: 16, fontWeight: 700, color: "#4ade80", fontFamily: "var(--font-heading)", whiteSpace: "nowrap" }}>
            {formatSignedCurrency(income, "+")}
          </div>
        </div>

        <div style={{ width: 1, backgroundColor: "#262626", alignSelf: "stretch" }} />

        {/* Total Expense */}
        <div
          className="px-5 py-3"
          style={{ borderLeft: "2px solid #ffb4ab" }}
        >
          <div style={{ fontSize: 10, fontWeight: 600, color: "#bccabb", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
            Total Expense
          </div>
          <div className="mt-1" style={{ fontSize: 16, fontWeight: 700, color: "#ffb4ab", fontFamily: "var(--font-heading)", whiteSpace: "nowrap" }}>
            {formatSignedCurrency(expense, "-")}
          </div>
        </div>

        <div style={{ width: 1, backgroundColor: "#262626", alignSelf: "stretch" }} />

        {/* Net Change */}
        <div
          className="px-5 py-3"
          style={{ borderLeft: `2px solid ${net >= 0 ? "#4ade80" : "#ffb4ab"}` }}
        >
          <div style={{ fontSize: 10, fontWeight: 600, color: "#bccabb", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
            Net Change
          </div>
          <div className="mt-1" style={{ fontSize: 16, fontWeight: 700, color: net >= 0 ? "#4ade80" : "#ffb4ab", fontFamily: "var(--font-heading)", whiteSpace: "nowrap" }}>
            {formatSignedCurrency(Math.abs(net), net >= 0 ? "+" : "-")}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
