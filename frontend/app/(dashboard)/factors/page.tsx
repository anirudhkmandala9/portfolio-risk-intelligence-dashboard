"use client";

import { useState } from "react";
import { apiGet } from "../../../lib/api";
import { PageHeader } from "../../../components/PageHeader";
import { MetricCard } from "../../../components/MetricCard";
import { PortfolioSelector } from "../../../components/PortfolioSelector";
import { Spinner } from "../../../components/Spinner";
import { FlaskRound, BookOpen } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";

type FactorResult = {
  alpha_annualized: number;
  beta_market: number;
  beta_smb: number;
  beta_hml: number;
  r_squared: number;
  adj_r_squared: number;
  residual_volatility: number;
  factor_contributions: {
    market: number;
    smb: number;
    hml: number;
    alpha: number;
    risk_free: number;
    total_explained: number;
    actual_return: number;
  };
  observations: number;
  p_values: { alpha: number; market: number; smb: number; hml: number };
  error?: string;
};

const fmtPct = (v: number) => `${(v * 100).toFixed(2)}%`;

const COLORS: Record<string, string> = {
  Market: "#38bdf8",
  SMB: "#a78bfa",
  HML: "#fbbf24",
  Alpha: "#34d399",
  "Risk-Free": "#64748b",
};

export default function FactorsPage() {
  const [portfolioId, setPortfolioId] = useState<number | null>(null);
  const [data, setData] = useState<FactorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    if (!portfolioId) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiGet<FactorResult>(`/charts/${portfolioId}/factor-analysis`);
      if (res.error) {
        setError(res.error);
        setData(null);
      } else {
        setData(res);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Factor analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const loadingBars = data
    ? [
        { name: "Market (β)", value: data.beta_market, color: "#38bdf8" },
        { name: "SMB (β)", value: data.beta_smb, color: "#a78bfa" },
        { name: "HML (β)", value: data.beta_hml, color: "#fbbf24" },
      ]
    : [];

  const contribBars = data
    ? [
        { name: "Market", value: +(data.factor_contributions.market * 100).toFixed(2) },
        { name: "SMB", value: +(data.factor_contributions.smb * 100).toFixed(2) },
        { name: "HML", value: +(data.factor_contributions.hml * 100).toFixed(2) },
        { name: "Alpha", value: +(data.factor_contributions.alpha * 100).toFixed(2) },
        { name: "Risk-Free", value: +(data.factor_contributions.risk_free * 100).toFixed(2) },
      ]
    : [];

  const sig = (p: number) =>
    p < 0.01 ? "***" : p < 0.05 ? "**" : p < 0.1 ? "*" : "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fama-French Factor Analysis"
        subtitle="Decompose portfolio returns into market, size (SMB), and value (HML) risk factors using the Fama-French 3-factor model."
        actions={
          <div className="flex items-center gap-3">
            <PortfolioSelector value={portfolioId} onChange={setPortfolioId} />
            <button onClick={run} disabled={!portfolioId} className="btn-primary disabled:opacity-40">
              Run regression
            </button>
          </div>
        }
      />

      {loading && <Spinner />}
      {error && <p className="text-xs text-rose-400">{error}</p>}

      {data && (
        <div className="fade-in space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <MetricCard label="Annualized Alpha" value={fmtPct(data.alpha_annualized)} accent={data.alpha_annualized > 0 ? "positive" : "negative"} />
            <MetricCard label="Market Beta" value={data.beta_market.toFixed(3)} />
            <MetricCard label="SMB Beta (Size)" value={data.beta_smb.toFixed(3)} />
            <MetricCard label="HML Beta (Value)" value={data.beta_hml.toFixed(3)} />
            <MetricCard label="R-squared" value={(data.r_squared * 100).toFixed(1) + "%"} />
          </section>

          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="Adj. R-squared" value={(data.adj_r_squared * 100).toFixed(1) + "%"} />
            <MetricCard label="Residual Volatility" value={fmtPct(data.residual_volatility)} />
            <MetricCard label="Observations" value={data.observations.toString()} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Factor loadings */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <FlaskRound size={14} className="text-accent" />
                <h3 className="section-title">Factor loadings (betas)</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={loadingBars} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11, color: "#e2e8f0" }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {loadingBars.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Return attribution */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen size={14} className="text-accent" />
                <h3 className="section-title">Return attribution (annualized)</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={contribBars}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11, color: "#e2e8f0" }} formatter={(v: number) => [`${v}%`]} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {contribBars.map((entry, i) => (
                      <Cell key={i} fill={COLORS[entry.name] ?? "#38bdf8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Regression table */}
          <div className="card">
            <h3 className="section-title mb-4">Regression coefficients</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 text-left text-[10px] uppercase tracking-wider text-slate-500">Factor</th>
                    <th className="pb-2 text-right text-[10px] uppercase tracking-wider text-slate-500">Coefficient</th>
                    <th className="pb-2 text-right text-[10px] uppercase tracking-wider text-slate-500">p-value</th>
                    <th className="pb-2 text-right text-[10px] uppercase tracking-wider text-slate-500">Significance</th>
                    <th className="pb-2 text-right text-[10px] uppercase tracking-wider text-slate-500">Ann. contribution</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: "Alpha (const)", coeff: data.alpha_annualized, pval: data.p_values.alpha, contrib: data.factor_contributions.alpha },
                    { name: "Market (Mkt-RF)", coeff: data.beta_market, pval: data.p_values.market, contrib: data.factor_contributions.market },
                    { name: "SMB (Size)", coeff: data.beta_smb, pval: data.p_values.smb, contrib: data.factor_contributions.smb },
                    { name: "HML (Value)", coeff: data.beta_hml, pval: data.p_values.hml, contrib: data.factor_contributions.hml },
                  ].map((row) => (
                    <tr key={row.name} className="border-b border-border/50">
                      <td className="py-2 font-medium text-slate-300">{row.name}</td>
                      <td className="py-2 text-right tabular-nums">{row.coeff.toFixed(4)}</td>
                      <td className="py-2 text-right tabular-nums text-slate-400">{row.pval.toFixed(4)}</td>
                      <td className="py-2 text-right">
                        <span className={row.pval < 0.05 ? "text-emerald-400" : "text-slate-500"}>
                          {row.pval < 0.01 ? "Highly significant" : row.pval < 0.05 ? "Significant" : row.pval < 0.1 ? "Marginal" : "Not significant"}
                          {" "}{sig(row.pval)}
                        </span>
                      </td>
                      <td className="py-2 text-right tabular-nums">{fmtPct(row.contrib)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex gap-6 text-[11px] text-slate-500">
              <span>Actual return (ann.): <strong className="text-slate-300">{fmtPct(data.factor_contributions.actual_return)}</strong></span>
              <span>Model explained: <strong className="text-slate-300">{fmtPct(data.factor_contributions.total_explained)}</strong></span>
            </div>
          </div>
        </div>
      )}

      {!data && !loading && (
        <div className="empty-state">
          <FlaskRound size={28} className="mb-2 text-slate-600" />
          <p>Select a portfolio and run Fama-French factor regression</p>
        </div>
      )}
    </div>
  );
}
