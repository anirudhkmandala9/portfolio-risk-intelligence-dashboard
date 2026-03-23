"use client";

import clsx from "clsx";

interface Props {
  label: string;
  value: string;
  sub?: string;
  accent?: "default" | "positive" | "negative";
}

const colorMap = {
  default: "text-slate-100",
  positive: "text-emerald-400",
  negative: "text-rose-400",
};

export function MetricCard({ label, value, sub, accent = "default" }: Props) {
  return (
    <div className="card fade-in group">
      <p className="metric-label">{label}</p>
      <p className={clsx("metric-value", colorMap[accent])}>{value}</p>
      {sub && <p className="mt-1 text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}
