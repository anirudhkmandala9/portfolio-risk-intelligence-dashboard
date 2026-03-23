import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Portfolio Risk Intelligence Dashboard",
  description:
    "Institutional-style portfolio analytics and risk intelligence.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
