"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  Briefcase,
  ShieldAlert,
  GitCompareArrows,
  FlaskConical,
  Sparkles,
  Dice5,
  FlaskRound,
} from "lucide-react";

const items = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/holdings", label: "Holdings", icon: Briefcase },
  { href: "/risk", label: "Risk", icon: ShieldAlert },
  { href: "/benchmark", label: "Benchmark", icon: GitCompareArrows },
  { href: "/scenarios", label: "Scenarios", icon: FlaskConical },
  { href: "/optimization", label: "Optimization", icon: Sparkles },
  { href: "/monte-carlo", label: "Monte Carlo", icon: Dice5 },
  { href: "/factors", label: "Factor Analysis", icon: FlaskRound },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex w-60 flex-col border-r border-border bg-surface/60 backdrop-blur">
      <div className="flex h-[57px] items-center border-b border-border px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/20">
            <span className="text-xs font-black text-accent">QA</span>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
              Quant Arc
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-0.5 px-3 py-4">
        <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
          Analytics
        </p>
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all",
                active
                  ? "bg-accent/15 text-accent shadow-sm shadow-accent/5"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              )}
            >
              <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="border-t border-border px-5 py-3">
        <p className="text-[10px] text-slate-600">
          Portfolio Risk Intelligence
        </p>
      </div>
    </nav>
  );
}
