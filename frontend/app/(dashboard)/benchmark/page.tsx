"use client";

import { useState } from "react";
import { apiGet } from "../../../lib/api";
import { PageHeader } from "../../../components/PageHeader";
import { MetricCard } from "../../../components/MetricCard";
import { PortfolioSelector } from "../../../components/PortfolioSelector";
import { Spinner } from "../../../components/Spinner";
import { GitCompareArrows, ArrowUpRight, ArrowDownRight } from "lucide-react";

type BenchmarkData = {
  portfolio_id: number;
  benchmark: string;
  active_return_annualized: number;
  active_risk_annualized: number;
  upside_capture: number;
  downside_capture: number;
};

const fmtPct = (v: number) => `${(v * 100).toFixed(2)}%`;
const fmtDec = (v: number) => v.toFixed(4);

export default function BenchmarkPage() {
  const [portfolioId, setPortfolioId] = useState<number | null>(null);
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadBenchmark = async () => {
    if (!portfolioId) return;
    setLoading(true);
    setError("");
    try {
      const response = await apiGet<BenchmarkData>(
        `/benchmark/${portfolioId}`
      );
      setData(response);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Benchmark request failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Benchmark Comparison"
        subtitle="Measure portfolio performance relative to a market benchmark."
        actions={
          <div className="flex items-center gap-3">
            <PortfolioSelector value={portfolioId} onChange={setPortfolioId} />
            <button
              onClick={loadBenchmark}
              disabled={!portfolioId}
              className="btn-primary disabled:opacity-40"
            >
              Compare vs benchmark
            </button>
          </div>
        }
      />

      {loading && <Spinner />}
      {error && <p className="text-xs text-rose-400">{error}</p>}

      {data && (
        <div className="fade-in space-y-6">
          <div className="card flex items-center gap-3">
            <GitCompareArrows size={16} className="text-accent" />
            <span className="text-sm text-slate-300">
              Comparing against{" "}
              <span className="font-semibold text-slate-100">
                {data.benchmark}
              </span>
            </span>
          </div>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Active return (ann.)"
              value={fmtPct(data.active_return_annualized)}
              accent={
                data.active_return_annualized > 0 ? "positive" : "negative"
              }
            />
            <MetricCard
              label="Active risk (ann.)"
              value={fmtPct(data.active_risk_annualized)}
            />
            <MetricCard
              label="Upside capture"
              value={fmtDec(data.upside_capture)}
              sub={
                data.upside_capture > 1
                  ? "Captures more upside than benchmark"
                  : "Captures less upside"
              }
              accent={data.upside_capture > 1 ? "positive" : "default"}
            />
            <MetricCard
              label="Downside capture"
              value={fmtDec(data.downside_capture)}
              sub={
                data.downside_capture < 1
                  ? "Less exposed to downside"
                  : "More exposed to downside"
              }
              accent={data.downside_capture < 1 ? "positive" : "negative"}
            />
          </section>

          {/* Insight cards */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card-raised flex items-start gap-3">
              {data.active_return_annualized > 0 ? (
                <ArrowUpRight size={20} className="mt-0.5 text-emerald-400" />
              ) : (
                <ArrowDownRight size={20} className="mt-0.5 text-rose-400" />
              )}
              <div>
                <p className="text-sm font-medium text-slate-200">
                  Active return insight
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  {data.active_return_annualized > 0
                    ? `Your portfolio outperformed ${data.benchmark} by ${fmtPct(data.active_return_annualized)} on an annualized basis.`
                    : `Your portfolio underperformed ${data.benchmark} by ${fmtPct(Math.abs(data.active_return_annualized))} on an annualized basis.`}
                </p>
              </div>
            </div>
            <div className="card-raised flex items-start gap-3">
              <GitCompareArrows size={20} className="mt-0.5 text-accent" />
              <div>
                <p className="text-sm font-medium text-slate-200">
                  Capture ratio insight
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  {data.upside_capture > data.downside_capture
                    ? "Favorable capture profile — the portfolio participates more in upside moves than downside."
                    : "The portfolio captures more downside than upside relative to the benchmark."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!data && !loading && (
        <div className="empty-state">
          <GitCompareArrows size={28} className="mb-2 text-slate-600" />
          <p>Select a portfolio and click Compare vs benchmark</p>
        </div>
      )}
    </div>
  );
}
