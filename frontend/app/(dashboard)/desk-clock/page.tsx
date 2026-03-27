"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { PageHeader } from "../../../components/PageHeader";
import {
  formatCountdown,
  formatETDate,
  formatETTime,
  getCountdownTarget,
  isEquitySessionOpen,
} from "../../../lib/marketHours";

export default function DeskClockPage() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const open = isEquitySessionOpen(now);
  const { at: target, label } = getCountdownTarget(now);
  const remaining = target.getTime() - now.getTime();

  return (
    <div className="space-y-8">
      <PageHeader
        title="US equity session clock"
        subtitle="NYSE & Nasdaq regular hours (Mon–Fri, 9:30–4:00 PM ET). Holidays not modeled — desk-style reference."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface/80 p-8 shadow-lg shadow-black/20">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15">
              <Clock className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Eastern Time
              </p>
              <p className="font-mono text-2xl font-semibold tracking-tight text-slate-100">
                {formatETTime(now)}
              </p>
              <p className="text-sm text-slate-500">{formatETDate(now)}</p>
            </div>
          </div>

          <div
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
              open
                ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                : "bg-slate-700/50 text-slate-400 ring-1 ring-slate-600/50"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${open ? "animate-pulse bg-emerald-400" : "bg-slate-500"}`}
            />
            {open ? "Regular session open" : "Regular session closed"}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface/80 p-8 shadow-lg shadow-black/20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            {label}
          </p>
          <p className="mt-2 font-mono text-4xl font-bold tabular-nums tracking-tight text-accent">
            {formatCountdown(remaining)}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-slate-500">
            {open
              ? "Cash equities trade until 4:00 PM ET (regular session). After-hours sessions are not shown."
              : "Countdown is to the next 9:30 AM ET open or the end of the current session, whichever applies."}
          </p>
        </div>
      </div>

      <p className="text-center text-[11px] text-slate-600">
        Tip: pin this route during recruiting demos — it’s 100% client-side (no API cold start).
      </p>
    </div>
  );
}
