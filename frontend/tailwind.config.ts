import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#050816",
        surface: "#0b1120",
        "surface-raised": "#111827",
        border: "#1e293b",
        accent: "#38bdf8",
        accentMuted: "#0ea5e9",
        positive: "#34d399",
        negative: "#f87171"
      },
      fontFamily: {
        sans: ['"Inter"', "system-ui", "-apple-system", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 20px 0 rgba(56, 189, 248, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
