"use client";

import { motion } from "framer-motion";

interface FullWidthSparklineProps {
  data: number[];
  color?: string;
}

export function FullWidthSparkline({ data, color = "#10B981" }: FullWidthSparklineProps) {
  if (data.length < 2) return null;
  const width = 200;
  const height = 26;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data.map((v, i) => ({
    x: i * step,
    y: height - ((v - min) / range) * (height - 4) - 2,
  }));

  const pathD = points
    .map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`))
    .join(" ");

  const areaD = `${pathD} L${width},${height} L0,${height} Z`;
  const gradId = `fw-spark-${color.replace("#", "")}`;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="overflow-visible block"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <motion.path
        d={areaD}
        fill={`url(#${gradId})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
      <motion.path
        d={pathD}
        stroke={color}
        strokeWidth="2"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
      />
    </svg>
  );
}
