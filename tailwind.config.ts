import type { Config } from "tailwindcss";
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)", surface: "var(--surface)", raised: "var(--raised)",
        line: "var(--line)", line2: "var(--line2)",
        ink: "var(--ink)", mut: "var(--mut)",
        accent: "var(--accent)", accent2: "var(--accent2)", accentfg: "var(--accent-fg)",
        good: "var(--good)", bad: "var(--bad)", warn: "var(--warn)",
      },
      boxShadow: { card: "var(--shadow-card)", lift: "var(--shadow-lift)" },
      borderRadius: { xl2: "14px" },
      fontFamily: {
        sans: ["'Inter Variable'", "system-ui", "sans-serif"],
        display: ["'Instrument Serif'", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
