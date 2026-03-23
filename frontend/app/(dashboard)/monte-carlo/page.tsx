"use client";

import { useState } from "react";
import { apiGet } from "../../../lib/api";
import { PageHeader } from "../../../components/PageHeader";
import { MetricCard } from "../../../components/MetricCard";
import { PortfolioSelector } from "../../../components/PortfolioSelector";
import { Spinner } from "../../../components/Spinner";
import { Dice5, TrendingUp, TrendingDown, Target } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

type MCPaths = Record<string, number[]>;
type MCStats = {
  expected_return: number;
  median_return: number;
  best_case: number;
  worst_case: number;
  mc_var_95: number;
  mc_cvar_95: number;
  prob_loss: number;
  prob_gain_10: number;
  prob_gain_20: number;
  std_final: number;
};
type MCResult = {
  n_simulations: number;
  horizon_days: number;
  paths: MCPaths;
  statistics: MCStats;
  distribution: { bins: { x: number; count: number }[] };
};

const fmtPct = (v: number) => `${(v * 100).toFixed(2)}%`;

export default function MonteCarloPage() {
  const [portfolioId, setPortfolioId] = useState<number | null>(null);
  const [data, setData] = useState<MCResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sims, setSims] = useState(5000);
  const [horizon, setHorizon] = useState(252);

  const run = async () => {
    if (!portfolioId) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiGet<MCResult>(
        `/charts/${portfolioId}/monte-carlo?n_simulations=${sims}&horizon_days=${horizon}`
      );
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed.");
    } finally {
      setLoading(false);
    }
  };

  const pathChart = data
    ? data.paths.mean.map((_, i) => ({
        day: i + 1,
        "95th": +((data.paths.p95[i] - 1) * 100).toFixed(2),
        "75th": +((data.paths.p75[i] - 1) * 100).toFixed(2),
        Median: +((data.paths.p50[i] - 1) * 100).toFixed(2),
        Mean: +((data.paths.mean[i] - 1) * 100).toFixed(2),
        "25th": +((data.paths.p25[i] - 1) * 100).toFixed(2),
        "5th": +((data.paths.p5[i] - 1) * 100).toFixed(2),
      }))
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monte Carlo Simulation"
        subtitle="Forward-looking risk analysis: simulate thousands of possible portfolio paths to estimate future return distributions."
        actions={
          <div className="flex items-center gap-3">
            <PortfolioSelector value={portfolioId} onChange={setPortfolioId} />
            <div className="flex items-center gap-2">
              <label className="text-[10px] uppercase tracking-wider text-slate-500">Sims</label>
              <input
                type="number"
                value={sims}
                onChange={(e) => setSims(+e.target.value)}
                className="input-field w-20 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] uppercase tracking-wider text-slate-500">Days</label>
              <input
                type="number"
                value={horizon}
                onChange={(e) => setHorizon(+e.target.value)}
                className="input-field w-20 text-xs"
              />
            </div>
            <button onClick={run} disabled={!portfolioId} className="btn-primary disabled:opacity-40">
              Run simulation
            </button>
          </div>
        }
      />

      {loading && <Spinner />}
      {error && <p className="text-xs text-rose-400">{error}</p>}

      {data && (
        <div className="fade-in space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <MetricCard label="Expected Return" value={fmtPct(data.statistics.expected_return)} accent="positive" />
            <MetricCard label="MC VaR (95%)" value={fmtPct(data.statistics.mc_var_95)} accent="negative" />
            <MetricCard label="MC CVaR (95%)" value={fmtPct(data.statistics.mc_cvar_95)} accent="negative" />
            <MetricCard label="Prob of Loss" value={fmtPct(data.statistics.prob_loss)} accent={data.statistics.prob_loss > 0.5 ? "negative" : "default"} />
            <MetricCard label="Prob of 10%+ Gain" value={fmtPct(data.statistics.prob_gain_10)} accent="positive" />
          </section>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Median Return" value={fmtPct(data.statistics.median_return)} />
            <MetricCard label="Best Case" value={fmtPct(data.statistics.best_case)} accent="positive" />
            <MetricCard label="Worst Case" value={fmtPct(data.statistics.worst_case)} accent="negative" />
            <MetricCard label="Prob of 20%+ Gain" value={fmtPct(data.statistics.prob_gain_20)} accent="positive" />
          </div>

          {/* Fan chart */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} className="text-accent" />
              <h3 className="section-title">Simulated return paths (percentile fan)</h3>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              {data.n_simulations.toLocaleString()} simulations over {data.horizon_days} trading days
            </p>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={pathChart}>
                <defs>
                  <linearGradient id="gradFan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} label={{ value: "Trading days", position: "insideBottom", offset: -2, fontSize: 10, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11, color: "#e2e8f0" }} formatter={(v: number) => [`${v}%`]} />
                <Area type="monotone" dataKey="95th" stroke="transparent" fill="#34d399" fillOpacity={0.08} />
                <Area type="monotone" dataKey="75th" stroke="transparent" fill="#34d399" fillOpacity={0.12} />
                <Area type="monotone" dataKey="Median" stroke="#a78bfa" strokeWidth={1.5} fill="transparent" dot={false} />
                <Area type="monotone" dataKey="Mean" stroke="#38bdf8" strokeWidth={2} strokeDasharray="6 3" fill="url(#gradFan)" dot={false} />
                <Area type="monotone" dataKey="25th" stroke="transparent" fill="#f87171" fillOpacity={0.08} />
                <Area type="monotone" dataKey="5th" stroke="transparent" fill="#f87171" fillOpacity={0.12} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Distribution histogram */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Target size={14} className="text-accent" />
              <h3 className="section-title">Final return distribution</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.distribution.bins}>
                <XAxis dataKey="x" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11, color: "#e2e8f0" }} formatter={(v: number) => [v, "Paths"]} labelFormatter={(l: number) => `Return: ${l}%`} />
                <Bar dataKey="count" radius={[2, 2, 0, 0]} fill="#38bdf8" fillOpacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!data && !loading && (
        <div className="empty-state">
          <Dice5 size={28} className="mb-2 text-slate-600" />
          <p>Select a portfolio and run Monte Carlo simulation</p>
        </div>
      )}
    </div>
  );
}
