"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  ShieldAlert,
  GitCompareArrows,
  FlaskConical,
  Sparkles,
  Dice5,
  FlaskRound,
  Briefcase,
  ArrowRight,
  TrendingUp,
  BarChart3,
  Target,
  ChevronRight,
  Clock,
} from "lucide-react";

const features = [
  {
    icon: TrendingUp,
    title: "Performance Analytics",
    desc: "Sharpe, Sortino, Alpha, Beta, Calmar, Tracking Error, Information Ratio — all computed from live market data.",
  },
  {
    icon: ShieldAlert,
    title: "Risk Intelligence",
    desc: "Value-at-Risk, Expected Shortfall, drawdown curves, rolling volatility, correlation matrices, and risk contribution.",
  },
  {
    icon: Dice5,
    title: "Monte Carlo Simulation",
    desc: "Project 5,000+ future portfolio paths. See probability of loss, VaR, and return distributions.",
  },
  {
    icon: FlaskRound,
    title: "Fama-French Factors",
    desc: "3-factor regression decomposing returns into market, size, and value exposures with significance testing.",
  },
  {
    icon: Sparkles,
    title: "Portfolio Optimization",
    desc: "Efficient frontier with minimum-volatility and maximum-Sharpe portfolios. Compare current vs optimized weights.",
  },
  {
    icon: FlaskConical,
    title: "Stress Testing",
    desc: "Custom scenario shocks — what if tech drops 10%? What if your top holding crashes 20%? See estimated impact.",
  },
];

const demos = [
  {
    name: "Demo Portfolio",
    strategy: "Balanced mix across sectors",
    tickers: ["AAPL", "MSFT", "JNJ", "XLE", "TLT"],
    color: "from-sky-500/20 to-sky-500/5",
    border: "border-sky-500/20",
  },
  {
    name: "Tech Growth",
    strategy: "Pure tech concentration",
    tickers: ["NVDA", "META", "AMZN", "GOOGL", "CRM"],
    color: "from-violet-500/20 to-violet-500/5",
    border: "border-violet-500/20",
  },
  {
    name: "Conservative Income",
    strategy: "Defensive, low-volatility",
    tickers: ["JNJ", "PG", "KO", "TLT", "VZ"],
    color: "from-emerald-500/20 to-emerald-500/5",
    border: "border-emerald-500/20",
  },
  {
    name: "Sector Diversified",
    strategy: "Spread across 7 sectors",
    tickers: ["AAPL", "JPM", "UNH", "XOM", "AMT", "GLD", "TLT"],
    color: "from-amber-500/20 to-amber-500/5",
    border: "border-amber-500/20",
  },
  {
    name: "High Risk Momentum",
    strategy: "Aggressive, high-beta",
    tickers: ["TSLA", "NVDA", "AMD", "COIN", "SQ"],
    color: "from-rose-500/20 to-rose-500/5",
    border: "border-rose-500/20",
  },
];

export default function WelcomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-16 pt-20 md:px-12 md:pt-28">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5">
            <span className="status-dot bg-accent" />
            <span className="text-[11px] font-medium tracking-wide text-accent">Live analytics engine</span>
          </div>
          <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl lg:text-6xl">
            Portfolio Risk{" "}
            <span className="bg-gradient-to-r from-accent via-sky-400 to-violet-400 bg-clip-text text-transparent">
              Intelligence
            </span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-slate-400 md:text-lg">
            Institutional-grade portfolio analytics, risk decomposition, Monte Carlo simulation, 
            and factor analysis — built for investors who want to understand their exposures.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/overview"
              className="group flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-gray-900 transition hover:bg-accent/90"
            >
              Launch dashboard
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/holdings"
              className="flex items-center gap-2 rounded-xl border border-border bg-surface/60 px-6 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              <Briefcase size={15} />
              Build your own portfolio
            </Link>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-border bg-surface/30 px-6 py-6">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-8 md:gap-16">
          {[
            ["9", "Dashboard pages"],
            ["15+", "Risk metrics"],
            ["5,000", "Monte Carlo paths"],
            ["3", "Fama-French factors"],
            ["5", "Demo portfolios"],
          ].map(([num, label]) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-bold text-white">{num}</p>
              <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 md:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <h2 className="mb-2 text-2xl font-bold text-white">What you can analyze</h2>
            <p className="text-sm text-slate-400">Every metric computed from live market data. No mock numbers.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group rounded-xl border border-border bg-surface/40 p-5 transition hover:border-accent/30 hover:bg-surface/60"
                >
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
                    <Icon size={18} className="text-accent" />
                  </div>
                  <h3 className="mb-1.5 text-sm font-semibold text-white">{f.title}</h3>
                  <p className="text-xs leading-relaxed text-slate-400">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Demo portfolios */}
      <section className="px-6 pb-16 md:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <h2 className="mb-2 text-2xl font-bold text-white">Explore demo portfolios</h2>
            <p className="text-sm text-slate-400">
              Five pre-loaded strategies — select one from the dashboard and run analytics instantly.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {demos.map((d) => (
              <Link
                href="/overview"
                key={d.name}
                className={`group relative overflow-hidden rounded-xl border ${d.border} bg-gradient-to-br ${d.color} p-5 transition hover:scale-[1.02]`}
              >
                <h3 className="mb-1 text-sm font-semibold text-white">{d.name}</h3>
                <p className="mb-3 text-xs text-slate-400">{d.strategy}</p>
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {d.tickers.map((t) => (
                    <span
                      key={t}
                      className="rounded-md border border-border bg-background/60 px-2 py-0.5 text-[10px] font-medium text-slate-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1 text-[11px] font-medium text-accent">
                  Analyze
                  <ChevronRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
            <Link
              href="/holdings"
              className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-5 transition hover:border-accent/40 hover:bg-surface/40"
            >
              <Briefcase size={24} className="mb-2 text-slate-500" />
              <span className="text-sm font-medium text-slate-300">Build your own</span>
              <span className="mt-1 text-[11px] text-slate-500">Add holdings or upload CSV</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Pages grid */}
      <section className="border-t border-border bg-surface/20 px-6 py-16 md:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <h2 className="mb-2 text-2xl font-bold text-white">Dashboard pages</h2>
            <p className="text-sm text-slate-400">Jump directly to any analytics module.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: "/overview", icon: LayoutDashboard, label: "Overview", desc: "KPIs, charts, insights" },
              { href: "/risk", icon: ShieldAlert, label: "Risk", desc: "VaR, drawdown, correlation" },
              { href: "/benchmark", icon: GitCompareArrows, label: "Benchmark", desc: "vs SPY comparison" },
              { href: "/scenarios", icon: FlaskConical, label: "Scenarios", desc: "Stress testing" },
              { href: "/optimization", icon: Sparkles, label: "Optimization", desc: "Efficient frontier" },
              { href: "/monte-carlo", icon: Dice5, label: "Monte Carlo", desc: "Simulation paths" },
              { href: "/factors", icon: FlaskRound, label: "Factors", desc: "Fama-French regression" },
              { href: "/holdings", icon: Briefcase, label: "Holdings", desc: "Build a portfolio" },
              { href: "/desk-clock", icon: Clock, label: "Session clock", desc: "US equity hours (ET)" },
            ].map((p) => {
              const Icon = p.icon;
              return (
                <Link
                  key={p.href}
                  href={p.href}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-surface/40 px-4 py-3.5 transition hover:border-accent/30 hover:bg-surface/60"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                    <Icon size={15} className="text-accent" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white">{p.label}</p>
                    <p className="text-[11px] text-slate-500">{p.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/20">
              <span className="text-xs font-black text-accent">QA</span>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Quant Arc</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <a
              href="https://github.com/anirudhkmandala9/portfolio-risk-intelligence-dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-slate-300"
            >
              GitHub
            </a>
            <span>Built with Next.js + FastAPI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
