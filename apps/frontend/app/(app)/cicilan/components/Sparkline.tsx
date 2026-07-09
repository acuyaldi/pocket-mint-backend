"use client";

interface SparklineProps {
  data: number[];
  color?: string;
}

export function Sparkline({ data, color = "var(--color-primary)" }: SparklineProps) {
  if (!data || data.length === 0) {
    // No data: render a flat line at 0
    return (
      <svg width="180" height="48" preserveAspectRatio="none">
        <defs>
          <linearGradient id="grad-empty" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points="0,48 180,48 180,0 0,0" fill="url(#grad-empty)" />
        <polyline points="0,24 180,24" fill="none" stroke={color} strokeWidth="1.5" />
      </svg>
    );
  }

  if (data.length === 1) {
    // Only one data point: render a flat line at that value
    const value = data[0];
    return (
      <svg width="180" height="48" preserveAspectRatio="none">
        <defs>
          <linearGradient id="grad-single" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,48 180,48 180,${48 - value} 0,${48 - value}`} fill="url(#grad-single)" />
        <polyline points={`0,${48 - value} 180,${48 - value}`} fill="none" stroke={color} strokeWidth="1.5" />
      </svg>
    );
  }

  // Multiple data points: compute min and max for scaling
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  const width = 180;
  const height = 48;

  const getY = (val: number) => {
    if (range === 0) {
      return height / 2;
    }
    // Invert y because SVG y increases downward
    return height - ((val - min) / range) * height;
  };

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = getY(val);
      return `${x},${y}`;
    })
    .join(" ");

  // Area under the line: from last point to bottom right, to bottom left, to first point
  const areaPoints = `
    0,${height}
    ${points}
    ${width},${height}
  `.trim();

  return (
    <svg width={width} height={height} preserveAspectRatio="none">
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area under the line */}
      <polygon points={areaPoints} fill="url(#grad)" />
      {/* Line */}
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}
