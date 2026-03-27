"use client";

import { useEffect, useRef, useState } from "react";
import { apiGet } from "../lib/api";

type Portfolio = { id: number; name: string; benchmark_ticker: string };

interface Props {
  value: number | null;
  onChange: (id: number) => void;
}

/**
 * Loads /portfolios with retries + long timeout so Render free-tier cold starts
 * don't leave the UI blank (previously we returned null until load — invisible dropdown).
 */
export function PortfolioSelector({ value, onChange }: Props) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadKey, setLoadKey] = useState(0);

  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setStatus("loading");
      try {
        const data = await apiGet<Portfolio[]>("/portfolios", {
          retries: 4,
          retryDelayMs: 4000,
          timeoutMs: 90_000,
        });
        if (cancelled) return;
        setPortfolios(data);
        setStatus("ready");
        if (valueRef.current == null && data.length > 0) {
          onChangeRef.current(data[0].id);
        }
      } catch {
        if (!cancelled) {
          setPortfolios([]);
          setStatus("error");
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [loadKey]);

  if (status === "loading") {
    return (
      <div className="flex max-w-md flex-col gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <span
            className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-emerald-400/80 border-t-transparent"
            aria-hidden
          />
          Connecting to API…
        </div>
        <p className="text-xs leading-snug text-slate-500">
          Hosted on a free tier, the backend may sleep after idle time. First load can
          take <span className="text-slate-400">30–90 seconds</span> — no need to
          refresh the page; this will retry automatically.
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex max-w-md flex-col gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
        <p className="text-sm text-amber-100/90">
          Couldn&apos;t load portfolios (API may still be waking up).
        </p>
        <button
          type="button"
          onClick={() => setLoadKey((k) => k + 1)}
          className="self-start rounded-md bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/30"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <select
      className="input-field max-w-xs"
      value={value ?? ""}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      <option value="">Select portfolio</option>
      {portfolios.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name} ({p.benchmark_ticker})
        </option>
      ))}
    </select>
  );
}
