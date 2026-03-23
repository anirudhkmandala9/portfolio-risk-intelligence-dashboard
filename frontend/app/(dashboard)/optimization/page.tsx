"use client";

import { useState } from "react";
import { apiGet } from "../../../lib/api";
import { PageHeader } from "../../../components/PageHeader";
import { PortfolioSelector } from "../../../components/PortfolioSelector";
import { Spinner } from "../../../components/Spinner";
import { Sparkles, Target } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  ScatterChart, Scatter, ZAxis, Cell,
} from "recharts";

type Recommendation = {
  ticker: string;
  current_weight: number;
  min_vol_weight: number;
  max_sharpe_weight: number;
};
type OptimizationResponse = { portfolio_id: number; recommendations: Recommendation[] };
type FrontierPoint = { volatility: number; return: number };
type FrontierData = {
  frontier: FrontierPoint[];
  current: FrontierPoint;
  min_vol: FrontierPoint;
  max_sharpe: FrontierPoint;
};

export default function OptimizationPage() {
  const [portfolioId, setPortfolioId] = useState<number | null>(null);
  const [data, setData] = useState<OptimizationResponse | null>(null);
  const [frontier, setFrontier] = useState<FrontierData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const optimize = async () => {
    if (!portfolioId) return;
    setLoading(true);
    setError("");
    try {
      const [opt, fr] = await Promise.all([
        apiGet<OptimizationResponse>(`/optimization/${portfolioId}`),
        apiGet<FrontierData>(`/charts/${portfolioId}/efficient-frontier`),
      ]);
      setData(opt);
      setFrontier(fr);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Optimization request failed.");
    } finally {
      setLoading(false);
    }
  };

  const chartData = data
    ? data.recommendations.map((r) => ({
        ticker: r.ticker,
        Current: +(r.current_weight * 100).toFixed(1),
        "Min Vol": +(r.min_vol_weight * 100).toFixed(1),
        "Max Sharpe": +(r.max_sharpe_weight * 100).toFixed(1),
      }))
    : [];

  const frontierScatter = frontier
    ? frontier.frontier.map((p) => ({
        x: +(p.volatility * 100).toFixed(2),
        y: +(p.return * 100).toFixed(2),
      }))
    : [];

  const specialPoints = frontier
    ? [
        { x: +(frontier.current.volatility * 100).toFixed(2), y: +(frontier.current.return * 100).toFixed(2), label: "Current" },
        { x: +(frontier.min_vol.volatility * 100).toFixed(2), y: +(frontier.min_vol.return * 100).toFixed(2), label: "Min Vol" },
        { x: +(frontier.max_sharpe.volatility * 100).toFixed(2), y: +(frontier.max_sharpe.return * 100).toFixed(2), label: "Max Sharpe" },
      ]
    : [];

  const SPECIAL_COLORS = ["#f87171", "#38bdf8", "#34d399"];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portfolio Optimization"
        subtitle="Compare current allocation against minimum-volatility and maximum-Sharpe optimized portfolios."
        actions={
          <div className="flex items-center gap-3">
            <PortfolioSelector value={portfolioId} onChange={setPortfolioId} />
            <button onClick={optimize} disabled={!portfolioId} className="btn-primary disabled:opacity-40">
              <Sparkles size={13} /> Run optimizer
            </button>
          </div>
        }
      />

      {loading && <Spinner />}
      {error && <p className="text-xs text-rose-400">{error}</p>}

      {data && (
        <div className="fade-in space-y-6">
          {/* Efficient frontier */}
          {frontier && frontierScatter.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Target size={14} className="text-accent" />
                <h3 className="section-title">Efficient frontier</h3>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                  <XAxis dataKey="x" name="Volatility" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} label={{ value: "Volatility (ann.)", position: "insideBottom", offset: -5, fontSize: 10, fill: "#64748b" }} />
                  <YAxis dataKey="y" name="Return" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} label={{ value: "Return (ann.)", angle: -90, position: "insideLeft", fontSize: 10, fill: "#64748b" }} />
                  <ZAxis range={[30, 30]} />
                  <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11, color: "#e2e8f0" }} formatter={(v: number) => [`${v}%`]} />
                  <Scatter name="Frontier" data={frontierScatter} fill="#1e293b" stroke="#38bdf8" strokeWidth={1} />
                  <Scatter name="Key Portfolios" data={specialPoints.map((p) => ({ x: p.x, y: p.y }))} shape="diamond">
                    {specialPoints.map((_, i) => <Cell key={i} fill={SPECIAL_COLORS[i]} r={6} />)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              <div className="flex gap-6 mt-3 text-[11px]">
                <div className="flex items-center gap-1.5"><span className="status-dot bg-rose-400" /> Current</div>
                <div className="flex items-center gap-1.5"><span className="status-dot bg-accent" /> Min Volatility</div>
                <div className="flex items-center gap-1.5"><span className="status-dot bg-emerald-400" /> Max Sharpe</div>
              </div>
            </div>
          )}

          {/* Grouped bar chart */}
          <div className="card">
            <h3 className="section-title mb-4">Current vs. optimized weights</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <XAxis dataKey="ticker" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11, color: "#e2e8f0" }} formatter={(v: number) => [`${v}%`]} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
                <Bar dataKey="Current" fill="#64748b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Min Vol" fill="#38bdf8" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Max Sharpe" fill="#34d399" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Data table */}
          <div className="card">
            <h3 className="section-title mb-3">Weight details</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-[0.15em] text-slate-500">
                    <th className="pb-2 pr-4">Ticker</th>
                    <th className="pb-2 pr-4 text-right">Current</th>
                    <th className="pb-2 pr-4 text-right">Min Vol</th>
                    <th className="pb-2 pr-4 text-right">Max Sharpe</th>
                    <th className="pb-2 text-right">Shift (Sharpe)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.recommendations.map((r) => {
                    const shift = r.max_sharpe_weight - r.current_weight;
                    return (
                      <tr key={r.ticker} className="text-slate-300">
                        <td className="py-2.5 pr-4 font-semibold text-slate-100">{r.ticker}</td>
                        <td className="py-2.5 pr-4 text-right tabular-nums">{(r.current_weight * 100).toFixed(2)}%</td>
                        <td className="py-2.5 pr-4 text-right tabular-nums text-accent">{(r.min_vol_weight * 100).toFixed(2)}%</td>
                        <td className="py-2.5 pr-4 text-right tabular-nums text-emerald-400">{(r.max_sharpe_weight * 100).toFixed(2)}%</td>
                        <td className={`py-2.5 text-right tabular-nums font-medium ${shift > 0 ? "text-emerald-400" : shift < 0 ? "text-rose-400" : "text-slate-500"}`}>
                          {shift > 0 ? "+" : ""}{(shift * 100).toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!data && !loading && (
        <div className="empty-state">
          <Sparkles size={28} className="mb-2 text-slate-600" />
          <p>Select a portfolio and click Run optimizer</p>
        </div>
      )}
    </div>
  );
}
