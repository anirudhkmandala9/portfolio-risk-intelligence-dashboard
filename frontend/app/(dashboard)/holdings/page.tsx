"use client";

import { useCallback, useRef, useState } from "react";
import { apiPost, apiUpload } from "../../../lib/api";
import { PageHeader } from "../../../components/PageHeader";
import { Spinner } from "../../../components/Spinner";
import { Upload, Plus, Trash2, Save, FileSpreadsheet } from "lucide-react";

type Holding = {
  ticker: string;
  shares: number;
  purchase_price: number;
  asset_class: string;
  sector: string;
  weight: number;
};

type PortfolioResponse = {
  id: number;
  name: string;
  benchmark_ticker: string;
  holdings: Array<{
    id: number;
    ticker: string;
    shares: number;
    purchase_price: number;
    sector: string;
  }>;
};

export default function HoldingsPage() {
  const [name, setName] = useState("Internship Showcase Portfolio");
  const [benchmark, setBenchmark] = useState("SPY");
  const [ticker, setTicker] = useState("");
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState("");
  const [sector, setSector] = useState("");
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [created, setCreated] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addHolding = () => {
    if (!ticker.trim()) return;
    setHoldings((prev) => [
      ...prev,
      {
        ticker: ticker.trim().toUpperCase(),
        shares: Number(shares) || 0,
        purchase_price: Number(price) || 0,
        asset_class: "Equity",
        sector: sector || "Unknown",
        weight: 0,
      },
    ]);
    setTicker("");
    setShares("");
    setPrice("");
    setSector("");
  };

  const removeHolding = (idx: number) =>
    setHoldings((prev) => prev.filter((_, i) => i !== idx));

  const createPortfolio = async () => {
    setError("");
    setLoading(true);
    try {
      const response = await apiPost<PortfolioResponse>("/portfolios", {
        name,
        benchmark_ticker: benchmark,
        holdings,
      });
      setCreated(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleCSV = useCallback(
    async (file: File) => {
      if (!file.name.endsWith(".csv")) {
        setError("Please upload a .csv file.");
        return;
      }
      setError("");
      setLoading(true);
      try {
        let portfolioId = created?.id;
        if (!portfolioId) {
          const portfolio = await apiPost<PortfolioResponse>("/portfolios", {
            name,
            benchmark_ticker: benchmark,
            holdings: [],
          });
          portfolioId = portfolio.id;
        }
        const uploaded = await apiUpload<PortfolioResponse["holdings"]>(
          `/portfolios/${portfolioId}/holdings/upload`,
          file
        );
        setCreated((prev) =>
          prev
            ? { ...prev, holdings: uploaded }
            : {
                id: portfolioId!,
                name,
                benchmark_ticker: benchmark,
                holdings: uploaded,
              }
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setLoading(false);
      }
    },
    [created, name, benchmark]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleCSV(file);
    },
    [handleCSV]
  );

  const totalValue = holdings.reduce(
    (sum, h) => sum + h.shares * h.purchase_price,
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Holdings Builder"
        subtitle="Build a portfolio manually or upload a CSV with your positions."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Portfolio details */}
        <div className="card space-y-3">
          <h3 className="section-title">Portfolio details</h3>
          <input
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Portfolio name"
          />
          <input
            className="input-field"
            value={benchmark}
            onChange={(e) => setBenchmark(e.target.value.toUpperCase())}
            placeholder="Benchmark ticker (e.g. SPY)"
          />
        </div>

        {/* CSV Upload */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          className={`card flex cursor-pointer flex-col items-center justify-center gap-3 border-dashed transition-colors ${
            dragActive
              ? "border-accent bg-accent/5"
              : "hover:border-slate-600"
          }`}
          onClick={() => fileRef.current?.click()}
        >
          <Upload
            size={24}
            className={dragActive ? "text-accent" : "text-slate-500"}
          />
          <div className="text-center">
            <p className="text-sm font-medium text-slate-300">
              Drop CSV here or click to browse
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Columns: ticker, shares, purchase_price, sector (optional)
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleCSV(file);
            }}
          />
        </div>
      </div>

      {/* Manual entry */}
      <div className="card space-y-3">
        <h3 className="section-title">Add holding manually</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <input
            className="input-field"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="Ticker"
            onKeyDown={(e) => e.key === "Enter" && addHolding()}
          />
          <input
            className="input-field"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            placeholder="Shares"
            type="number"
          />
          <input
            className="input-field"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Purchase price"
            type="number"
          />
          <input
            className="input-field"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            placeholder="Sector"
          />
        </div>
        <button onClick={addHolding} className="btn-primary">
          <Plus size={14} /> Add holding
        </button>
      </div>

      {/* Holdings table */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="section-title">
              Current holdings ({holdings.length})
            </h3>
            {totalValue > 0 && (
              <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
                ${totalValue.toLocaleString()}
              </span>
            )}
          </div>
          <button
            onClick={createPortfolio}
            disabled={holdings.length === 0}
            className="btn-success disabled:opacity-40"
          >
            <Save size={14} /> Save portfolio
          </button>
        </div>

        {holdings.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-[0.15em] text-slate-500">
                  <th className="pb-2 pr-4">Ticker</th>
                  <th className="pb-2 pr-4 text-right">Shares</th>
                  <th className="pb-2 pr-4 text-right">Price</th>
                  <th className="pb-2 pr-4 text-right">Value</th>
                  <th className="pb-2 pr-4">Sector</th>
                  <th className="pb-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {holdings.map((h, idx) => (
                  <tr key={`${h.ticker}-${idx}`} className="text-slate-300">
                    <td className="py-2 pr-4 font-semibold text-slate-100">
                      {h.ticker}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {h.shares}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      ${h.purchase_price.toFixed(2)}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      ${(h.shares * h.purchase_price).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 text-slate-400">{h.sector}</td>
                    <td className="py-2">
                      <button
                        onClick={() => removeHolding(idx)}
                        className="text-slate-600 hover:text-rose-400"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4 empty-state">
            <FileSpreadsheet size={24} className="mb-2 text-slate-600" />
            <p>No holdings added yet</p>
            <p className="mt-1 text-slate-600">
              Add manually above or drag in a CSV
            </p>
          </div>
        )}

        {loading && <Spinner />}

        {created && (
          <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-300 fade-in">
            Portfolio saved successfully &mdash; ID:{" "}
            <strong>{created.id}</strong>. You can now run analytics from the
            Overview, Risk, or Benchmark pages.
          </div>
        )}
        {error && (
          <p className="mt-3 text-xs text-rose-400">{error}</p>
        )}
      </div>
    </div>
  );
}
