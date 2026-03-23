"use client";

import { useState } from "react";
import { apiGet } from "../../lib/api";
import { PageHeader } from "../../components/PageHeader";
import { MetricCard } from "../../components/MetricCard";
import { PortfolioSelector } from "../../components/PortfolioSelector";
import { Spinner } from "../../components/Spinner";
import { ShieldAlert, Activity, Grid3X3, BarChart3 } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

type RiskData = {
  portfolio_id: number;
  historical_var_95: number;
  parametric_var_95: number;
  expected_shortfall_95: number;
  downside_deviation: number;
  max_drawdown: number;
  worst_days: number[];
};
type DrawdownData = { dates: string[]; drawdown: number[] };
type RollingData = {
  volatility: { dates: string[]; values: number[] };
  beta: { dates: string[]; values: number[] };
};
type CorrelationData = { tickers: string[]; matrix: number[][] };
type RiskContribData = { tickers: string[]; contributions: number[] };

const fmtPct = (v: number) => `${(v * 100).toFixed(2)}%`;

export default function RiskPage() {
  const [portfolioId, setPortfolioId] = useState<number | null>(null);
  const [data, setData] = useState<RiskData | null>(null);
  const [dd, setDd] = useState<{ date: string; Drawdown: number }[]>([]);
  const [rolling, setRolling] = useState<{ vol: { date: string; Volatility: number }[]; beta: { date: string; Beta: number }[] }>({ vol: [], beta: [] });
  const [corr, setCorr] = useState<CorrelationData | null>(null);
  const [rc, setRc] = useState<{ ticker: string; contribution: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadRisk = async () => {
    if (!portfolioId) return;
    setLoading(true);
    setError("");
    try {
      const [risk, drawdown, roll, correlation, contrib] = await Promise.all([
        apiGet<RiskData>(`/risk/${portfolioId}`),
        apiGet<DrawdownData>(`/charts/${portfolioId}/drawdown`),
        apiGet<RollingData>(`/charts/${portfolioId}/rolling?window=30`),
        apiGet<CorrelationData>(`/charts/${portfolioId}/correlation`),
        apiGet<RiskContribData>(`/charts/${portfolioId}/risk-contribution`),
      ]);
      setData(risk);
      setDd(drawdown.dates.map((d, i) => ({ date: d, Drawdown: +(drawdown.drawdown[i] * 100).toFixed(2) })));
      setRolling({
        vol: roll.volatility.dates.map((d, i) => ({ date: d, Volatility: +(roll.volatility.values[i] * 100).toFixed(2) })),
        beta: roll.beta.dates.map((d, i) => ({ date: d, Beta: +roll.beta.values[i].toFixed(3) })),
      });
      setCorr(correlation);
      setRc(contrib.tickers.map((t, i) => ({ ticker: t, contribution: +(contrib.contributions[i] * 100).toFixed(1) })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Risk request failed.");
    } finally {
      setLoading(false);
    }
  };

  const worstDays = data ? data.worst_days.map((v, i) => ({ name: `Day ${i + 1}`, return: +(v * 100).toFixed(2) })) : [];
  const COLORS = ["#f87171", "#fb923c", "#fbbf24", "#38bdf8", "#34d399", "#a78bfa", "#f472b6"];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Risk Analytics"
        subtitle="VaR, drawdowns, rolling risk metrics, correlations, and risk contribution by holding."
        actions={
          <div className="flex items-center gap-3">
            <PortfolioSelector value={portfolioId} onChange={setPortfolioId} />
            <button onClick={loadRisk} disabled={!portfolioId} className="btn-primary disabled:opacity-40">Load risk snapshot</button>
          </div>
        }
      />

      {loading && <Spinner />}
      {error && <p className="text-xs text-rose-400">{error}</p>}

      {data && (
        <div className="fade-in space-y-6">
          {/* KPI strip */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <MetricCard label="Historical VaR (95%)" value={fmtPct(data.historical_var_95)} accent="negative" />
            <MetricCard label="Parametric VaR (95%)" value={fmtPct(data.parametric_var_95)} accent="negative" />
            <MetricCard label="Expected Shortfall" value={fmtPct(data.expected_shortfall_95)} accent="negative" />
            <MetricCard label="Max Drawdown" value={fmtPct(data.max_drawdown)} accent="negative" />
            <MetricCard label="Downside Deviation" value={fmtPct(data.downside_deviation)} />
          </section>

          {/* Drawdown chart */}
          {dd.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={14} className="text-rose-400" />
                <h3 className="section-title">Drawdown curve</h3>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={dd}>
                  <defs>
                    <linearGradient id="gradDD" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11, color: "#e2e8f0" }} formatter={(v: number) => [`${v}%`]} />
                  <Area type="monotone" dataKey="Drawdown" stroke="#f87171" strokeWidth={1.5} fill="url(#gradDD)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Rolling volatility */}
            {rolling.vol.length > 0 && (
              <div className="card">
                <h3 className="section-title mb-4">Rolling 30-day volatility (annualized)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={rolling.vol}>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
                    <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11, color: "#e2e8f0" }} formatter={(v: number) => [`${v}%`]} />
                    <Line type="monotone" dataKey="Volatility" stroke="#38bdf8" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Rolling beta */}
            {rolling.beta.length > 0 && (
              <div className="card">
                <h3 className="section-title mb-4">Rolling 30-day beta</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={rolling.beta}>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11, color: "#e2e8f0" }} />
                    <Line type="monotone" dataKey="Beta" stroke="#a78bfa" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Risk contribution */}
            {rc.length > 0 && (
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 size={14} className="text-accent" />
                  <h3 className="section-title">Risk contribution by holding</h3>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={rc}>
                    <XAxis dataKey="ticker" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
                    <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11, color: "#e2e8f0" }} formatter={(v: number) => [`${v}%`, "Contribution"]} />
                    <Bar dataKey="contribution" radius={[4, 4, 0, 0]}>
                      {rc.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Correlation heatmap */}
            {corr && corr.matrix.length > 0 && (
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <Grid3X3 size={14} className="text-accent" />
                  <h3 className="section-title">Correlation matrix</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <th className="pb-2 pr-2 text-left text-[10px] uppercase tracking-wider text-slate-500" />
                        {corr.tickers.map((t) => (
                          <th key={t} className="pb-2 px-2 text-center text-[10px] uppercase tracking-wider text-slate-500">{t}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {corr.tickers.map((t, i) => (
                        <tr key={t}>
                          <td className="py-1.5 pr-2 font-medium text-slate-400">{t}</td>
                          {corr.matrix[i].map((val, j) => {
                            const intensity = Math.abs(val);
                            const bg = val >= 0
                              ? `rgba(56, 189, 248, ${intensity * 0.5})`
                              : `rgba(248, 113, 113, ${intensity * 0.5})`;
                            return (
                              <td key={j} className="py-1.5 px-2 text-center tabular-nums" style={{ backgroundColor: bg }}>
                                {val.toFixed(2)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Worst days */}
          {worstDays.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert size={14} className="text-rose-400" />
                <h3 className="section-title">Worst return days</h3>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={worstDays}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11, color: "#e2e8f0" }} formatter={(v: number) => [`${v}%`, "Return"]} />
                  <Bar dataKey="return" radius={[4, 4, 0, 0]}>
                    {worstDays.map((_, i) => <Cell key={i} fill="#f87171" fillOpacity={0.85 - i * 0.1} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {!data && !loading && (
        <div className="empty-state">
          <ShieldAlert size={28} className="mb-2 text-slate-600" />
          <p>Select a portfolio and click Load risk snapshot</p>
        </div>
      )}
    </div>
  );
}
