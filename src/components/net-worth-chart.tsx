"use client";

import { useRef, useState, type PointerEvent } from "react";
import { formatMoney } from "@/lib/format";

export interface NetWorthPointData {
  monthLabel: string;
  value: number;
}

const WIDTH = 320;
const HEIGHT = 140;
const PADDING = 8;

export function NetWorthChart({ points }: { points: NetWorthPointData[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (points.length === 0) {
    return <p className="text-sm text-ink-soft">Sem dados suficientes ainda.</p>;
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const stepX = (WIDTH - PADDING * 2) / Math.max(points.length - 1, 1);
  const coords = points.map((point, index) => {
    const x = PADDING + index * stepX;
    const y = HEIGHT - PADDING - ((point.value - min) / range) * (HEIGHT - PADDING * 2);
    return { x, y };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const areaPath = `${linePath} L${coords[coords.length - 1].x},${HEIGHT - PADDING} L${coords[0].x},${HEIGHT - PADDING} Z`;

  function handlePointer(event: PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const index = Math.round((relativeX - PADDING) / stepX);
    setHoverIndex(Math.min(Math.max(index, 0), points.length - 1));
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const hoveredCoord = hoverIndex !== null ? coords[hoverIndex] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full touch-none"
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        onPointerLeave={() => setHoverIndex(null)}
      >
        <path d={areaPath} fill="var(--primary)" fillOpacity={0.1} stroke="none" />
        <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hoveredCoord ? (
          <>
            <line
              x1={hoveredCoord.x}
              x2={hoveredCoord.x}
              y1={PADDING}
              y2={HEIGHT - PADDING}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <circle
              cx={hoveredCoord.x}
              cy={hoveredCoord.y}
              r={5}
              fill="var(--primary)"
              stroke="var(--surface)"
              strokeWidth={2}
            />
          </>
        ) : null}
      </svg>

      {hovered ? (
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-md border border-border bg-surface px-3 py-1.5 text-center shadow-sm">
          <p className="text-xs text-ink-soft">{hovered.monthLabel}</p>
          <p className="font-amount text-sm text-ink">{formatMoney(hovered.value)}</p>
        </div>
      ) : (
        <div className="flex justify-between text-xs text-ink-soft">
          <span>{points[0].monthLabel}</span>
          <span>{points[points.length - 1].monthLabel}</span>
        </div>
      )}
    </div>
  );
}
