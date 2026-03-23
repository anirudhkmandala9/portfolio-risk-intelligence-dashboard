import "./globals.css";
import type { ReactNode } from "react";
import { SidebarNav } from "../components/SidebarNav";
import { MobileNav } from "../components/MobileNav";

export const metadata = {
  title: "Portfolio Risk Intelligence Dashboard",
  description:
    "Institutional-style portfolio analytics and risk intelligence.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-slate-100 antialiased">
        <div className="flex min-h-screen">
          {/* Desktop sidebar */}
          <div className="hidden md:flex">
            <SidebarNav />
          </div>

          <div className="relative flex min-h-screen flex-1 flex-col">
            <header className="flex h-[57px] items-center justify-between border-b border-border bg-surface/60 px-4 backdrop-blur md:px-6">
              <div className="flex items-center gap-3">
                <MobileNav />
                <h1 className="text-sm font-semibold tracking-tight text-slate-200">
                  Portfolio Risk Intelligence Dashboard
                </h1>
              </div>
              <div className="hidden items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-[11px] text-slate-500 sm:flex">
                <span className="status-dot bg-emerald-400" />
                Engine running
              </div>
            </header>
            <main className="flex-1 overflow-y-auto bg-background px-4 py-6 md:px-6">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
