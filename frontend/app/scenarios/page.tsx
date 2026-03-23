"use client";

import { useState } from "react";
import { apiPost } from "../../lib/api";
import { PageHeader } from "../../components/PageHeader";
import { PortfolioSelector } from "../../components/PortfolioSelector";
import { Spinner } from "../../components/Spinner";
import { FlaskConical, Plus, Trash2, Zap } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type Impact = { label: string; impact_pct: number };
type ScenarioResponse = { portfolio_id: number; impacts: Impact[] };

type ShockInput = {
  label: string;
  ticker: string;
  sector: string;
  shock_pct: string;
};

const presets: ShockInput[] = [
  { label: "Tech down 10%", ticker: "", sector: "Technology", shock_pct: "-0.10" },
  { label: "Market down 15%", ticker: "", sector: "", shock_pct: "-0.15" },
  { label: "Top holding down 20%", ticker: "AAPL", sector: "", shock_pct: "-0.20" },
];

export default function ScenariosPage() {
  const [portfolioId, setPortfolioId] = useState<number | null>(null);
  const [shocks, setShocks] = useState<ShockInput[]>(presets);
  const [data, setData] = useState<ScenarioResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addShock = () =>
    setShocks((prev) => [
      ...prev,
      { label: "", ticker: "", sector: "", shock_pct: "-0.10" },
    ]);

  const removeShock = (idx: number) =>
    setShocks((prev) => prev.filter((_, i) => i !== idx));

  const updateShock = (idx: number, field: keyof ShockInput, val: string) =>
    setShocks((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: val } : s))
    );

  const runScenarios = async () => {
    if (!portfolioId) return;
    setLoading(true);
    setError("");
    try {
      const payload = {
        shocks: shocks
          .filter((s) => s.label.trim())
          .map((s) => ({
            label: s.label,
            ticker: s.ticker || undefined,
            sector: s.sector || undefined,
            shock_pct: parseFloat(s.shock_pct) || -0.1,
          })),
      };
      const response = await apiPost<ScenarioResponse>(
        `/scenarios/${portfolioId}`,
        payload
      );
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scenario failed.");
    } finally {
      setLoading(false);
    }
  };

  const chartData = data
    ? data.impacts.map((im) => ({
        name: im.label,
        impact: +(im.impact_pct * 100).toFixed(2),
      }))
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scenario & Stress Testing"
        subtitle="Apply sector shocks, single-name drops, or macro events to see estimated portfolio impact."
        actions={
          <div className="flex items-center gap-3">
            <PortfolioSelector value={portfolioId} onChange={setPortfolioId} />
            <button
              onClick={runScenarios}
              disabled={!portfolioId}
              className="btn-primary disabled:opacity-40"
            >
              <Zap size={13} /> Run scenarios
            </button>
          </div>
        }
      />

      {/* Shock builder */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="section-title">Scenario shocks</h3>
          <button onClick={addShock} className="btn-outline text-[11px]">
            <Plus size={12} /> Add shock
          </button>
        </div>
        <div className="space-y-2">
          {shocks.map((s, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[1fr_0.7fr_0.7fr_0.5fr_auto] gap-2 items-center"
            >
              <input
                className="input-field text-xs"
                value={s.label}
                onChange={(e) => updateShock(idx, "label", e.target.value)}
                placeholder="Label"
              />
              <input
                className="input-field text-xs"
                value={s.ticker}
                onChange={(e) => updateShock(idx, "ticker", e.target.value)}
                placeholder="Ticker (opt)"
              />
              <input
                className="input-field text-xs"
                value={s.sector}
                onChange={(e) => updateShock(idx, "sector", e.target.value)}
                placeholder="Sector (opt)"
              />
              <input
                className="input-field text-xs"
                value={s.shock_pct}
                onChange={(e) => updateShock(idx, "shock_pct", e.target.value)}
                placeholder="Shock %"
                type="number"
                step="0.01"
              />
              <button
                onClick={() => removeShock(idx)}
                className="text-slate-600 hover:text-rose-400"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {loading && <Spinner />}
      {error && <p className="text-xs text-rose-400">{error}</p>}

      {data && (
        <div className="fade-in space-y-6">
          {/* Impact cards */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.impacts.map((im) => (
              <div
                key={im.label}
                className="card-raised flex items-start gap-3"
              >
                <FlaskConical size={16} className="mt-0.5 text-rose-400" />
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    {im.label}
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-rose-400">
                    {(im.impact_pct * 100).toFixed(2)}%
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Estimated portfolio loss
                  </p>
                </div>
              </div>
            ))}
          </section>

          {/* Bar chart */}
          <div className="card">
            <h3 className="section-title mb-4">Scenario impact comparison</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ left: 20 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  width={130}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111827",
                    border: "1px solid #1e293b",
                    borderRadius: 8,
                    fontSize: 11,
                    color: "#e2e8f0",
                  }}
                  formatter={(v: number) => [`${v}%`, "Impact"]}
                />
                <Bar dataKey="impact" radius={[0, 4, 4, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill="#f87171" fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!data && !loading && (
        <div className="empty-state">
          <FlaskConical size={28} className="mb-2 text-slate-600" />
          <p>Configure shocks above and click Run scenarios</p>
        </div>
      )}
    </div>
  );
}
