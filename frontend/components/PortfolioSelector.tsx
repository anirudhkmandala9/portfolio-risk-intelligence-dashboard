"use client";

import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";

type Portfolio = { id: number; name: string; benchmark_ticker: string };

interface Props {
  value: number | null;
  onChange: (id: number) => void;
}

export function PortfolioSelector({ value, onChange }: Props) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiGet<Portfolio[]>("/portfolios")
      .then((data) => {
        setPortfolios(data);
        if (!value && data.length > 0) onChange(data[0].id);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

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
