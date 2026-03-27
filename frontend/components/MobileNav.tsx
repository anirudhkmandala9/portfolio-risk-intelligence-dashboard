"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import {
  Menu,
  X,
  LayoutDashboard,
  Briefcase,
  ShieldAlert,
  GitCompareArrows,
  FlaskConical,
  Sparkles,
  Dice5,
  FlaskRound,
  Clock,
} from "lucide-react";

const items = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/holdings", label: "Holdings", icon: Briefcase },
  { href: "/risk", label: "Risk", icon: ShieldAlert },
  { href: "/benchmark", label: "Benchmark", icon: GitCompareArrows },
  { href: "/scenarios", label: "Scenarios", icon: FlaskConical },
  { href: "/optimization", label: "Optimization", icon: Sparkles },
  { href: "/monte-carlo", label: "Monte Carlo", icon: Dice5 },
  { href: "/factors", label: "Factor Analysis", icon: FlaskRound },
  { href: "/desk-clock", label: "Session clock", icon: Clock },
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg border border-border p-2 text-slate-400"
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-[57px] z-50 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur fade-in">
          {items.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={clsx(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium",
                  active
                    ? "bg-accent/15 text-accent"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                <Icon size={15} />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
