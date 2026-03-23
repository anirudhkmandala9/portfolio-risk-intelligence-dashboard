"use client";

import { useState } from "react";
import { apiGet, downloadUrl } from "../lib/api";
import { MetricCard } from "../components/MetricCard";
import { PortfolioSelector } from "../components/PortfolioSelector";
import { Spinner } from "../components/Spinner";
import { PageHeader } from "../components/PageHeader";
import {
  BarChart3,
  ShieldCheck,
  TrendingUp,
  PieChart,
  Lightbulb,
  Download,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type Metric = { key: string; value: number };
type Analytics = { portfolio_id: number; metrics: Metric[] };
type AllocationItem = { name: string; weight: number };
type Allocation = {
  portfolio_id: number;
  by_asset: AllocationItem[];
  by_sector: AllocationItem[];
  hhi: number;
  diversification_score: number;
};
type CumulativeData = { dates: string[]; portfolio: number[]; benchmark: number[] };
type InsightsData = { portfolio_id: number; insights: string[] };

const fmtPct = (v: number) => `${(v * 100).toFixed(2)}%`;
const fmtDec = (v: number) => v.toFixed(4);
const highlight = ["annualized_return", "annualized_volatility", "sharpe_ratio", "max_drawdown", "beta", "alpha"];

const accentFor = (key: string, val: number) => {
  if (key === "max_drawdown") return val < -0.1 ? ("negative" as const) : ("default" as const);
  if (key === "sharpe_ratio") return val > 0.5 ? ("positive" as const) : val < 0 ? ("negative" as const) : ("default" as const);
  if (key === "alpha") return val > 0 ? ("positive" as const) : val < 0 ? ("negative" as const) : ("default" as const);
  if (key === "annualized_return") return val > 0 ? ("positive" as const) : ("negative" as const);
  return "default" as const;
};

const isPct = (k: string) => k.includes("return") || k.includes("volatility") || k.includes("drawdown") || k.includes("error");

export default function HomePage() {
  const [portfolioId, setPortfolioId] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [allocation, setAllocation] = useState<Allocation | null>(null);
  const [cumData, setCumData] = useState<{ date: string; Portfolio: number; Benchmark: number }[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    if (!portfolioId) return;
    setLoading(true);
    setError("");
    try {
      const [perf, alloc, cum, ins] = await Promise.all([
        apiGet<Analytics>(`/analytics/${portfolioId}/performance`),
        apiGet<Allocation>(`/analytics/${portfolioId}/allocation`),
        apiGet<CumulativeData>(`/charts/${portfolioId}/cumulative`),
        apiGet<InsightsData>(`/charts/${portfolioId}/insights`),
      ]);
      setMetrics(perf.metrics);
      setAllocation(alloc);
      setInsights(ins.insights);
      setCumData(
        cum.dates.map((d, i) => ({
          date: d,
          Portfolio: +(cum.portfolio[i] * 100).toFixed(2),
          Benchmark: +(cum.benchmark[i] * 100).toFixed(2),
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analytics failed.");
    } finally {
      setLoading(false);
    }
  };

  const heroMetrics = metrics.filter((m) => highlight.includes(m.key));
  const otherMetrics = metrics.filter((m) => !highlight.includes(m.key));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Portfolio overview"
        subtitle="Load a portfolio and run institutional-grade performance, allocation, and risk analytics."
        actions={
          <div className="flex items-end gap-3">
            <PortfolioSelector value={portfolioId} onChange={setPortfolioId} />
            <button onClick={run} disabled={!portfolioId} className="btn-primary disabled:opacity-40">
              Run analytics
            </button>
          </div>
        }
      />

      {loading && <Spinner />}
      {error && <p className="text-xs text-rose-400">{error}</p>}

      {metrics.length > 0 && portfolioId && (
        <div className="flex items-center gap-3 fade-in">
          <a
            href={downloadUrl(`/export/${portfolioId}/csv`)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface/60 px-3 py-1.5 text-[11px] font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <Download size={12} /> Export analytics CSV
          </a>
          <a
            href={downloadUrl(`/export/${portfolioId}/holdings-csv`)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface/60 px-3 py-1.5 text-[11px] font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <Download size={12} /> Export holdings CSV
          </a>
        </div>
      )}

      {heroMetrics.length > 0 && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 fade-in">
          {heroMetrics.map((m) => (
            <MetricCard
              key={m.key}
              label={m.key.replaceAll("_", " ")}
              value={isPct(m.key) ? fmtPct(m.value) : fmtDec(m.value)}
              accent={accentFor(m.key, m.value)}
            />
          ))}
        </section>
      )}

      {/* Cumulative returns chart */}
      {cumData.length > 0 && (
        <div className="card fade-in">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-accent" />
            <h3 className="section-title">Cumulative returns — Portfolio vs Benchmark</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={cumData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <defs>
                <linearGradient id="gradPort" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradBench" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#64748b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11, color: "#e2e8f0" }} formatter={(v: number) => [`${v}%`]} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
              <Area type="monotone" dataKey="Portfolio" stroke="#38bdf8" strokeWidth={2} fill="url(#gradPort)" />
              <Area type="monotone" dataKey="Benchmark" stroke="#64748b" strokeWidth={1.5} fill="url(#gradBench)" strokeDasharray="4 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sector allocation */}
        {allocation && (
          <div className="card fade-in space-y-4">
            <div className="flex items-center gap-2">
              <PieChart size={14} className="text-accent" />
              <h3 className="section-title">Sector allocation</h3>
            </div>
            <div className="space-y-2">
              {allocation.by_sector.map((s) => (
                <div key={s.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">{s.name}</span>
                    <span className="tabular-nums text-slate-400">{(s.weight * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent/60" style={{ width: `${Math.min(s.weight * 100, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-6 border-t border-border pt-3">
              <div>
                <p className="metric-label">HHI</p>
                <p className="metric-value-sm">{allocation.hhi.toFixed(4)}</p>
              </div>
              <div>
                <p className="metric-label">Diversification</p>
                <p className="metric-value-sm">{(allocation.diversification_score * 100).toFixed(1)}%</p>
              </div>
            </div>
          </div>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <div className="card fade-in space-y-4">
            <div className="flex items-center gap-2">
              <Lightbulb size={14} className="text-amber-400" />
              <h3 className="section-title">Portfolio insights</h3>
            </div>
            <div className="space-y-2">
              {insights.map((text, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-lg border border-border bg-background/50 px-3 py-2.5">
                  <span className="mt-0.5 status-dot bg-amber-400/70" />
                  <p className="text-xs leading-relaxed text-slate-300">{text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Extended metrics + holdings table */}
      <div className="grid gap-6 lg:grid-cols-2">
        {otherMetrics.length > 0 && (
          <div className="card fade-in space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 size={14} className="text-accent" />
              <h3 className="section-title">Extended metrics</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {otherMetrics.map((m) => (
                <div key={m.key} className="rounded-lg border border-border bg-background/60 px-3 py-2.5">
                  <p className="metric-label">{m.key.replaceAll("_", " ")}</p>
                  <p className="metric-value-sm">{isPct(m.key) ? fmtPct(m.value) : fmtDec(m.value)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {allocation && allocation.by_asset.length > 0 && (
          <div className="card fade-in">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={14} className="text-accent" />
              <h3 className="section-title">Holdings breakdown</h3>
            </div>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-[0.15em] text-slate-500">
                  <th className="pb-2 pr-4">Asset</th>
                  <th className="pb-2 pr-4 text-right">Weight</th>
                  <th className="pb-2">Allocation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allocation.by_asset.map((a) => (
                  <tr key={a.name} className="text-slate-300">
                    <td className="py-2.5 pr-4 font-medium">{a.name}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{(a.weight * 100).toFixed(2)}%</td>
                    <td className="py-2.5">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full rounded-full bg-accent/70" style={{ width: `${Math.min(a.weight * 100, 100)}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {metrics.length === 0 && !loading && (
        <div className="empty-state">
          <BarChart3 size={28} className="mb-2 text-slate-600" />
          <p>Select a portfolio above and click Run analytics</p>
        </div>
      )}
    </div>
  );
}
