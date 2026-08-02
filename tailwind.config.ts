import type { Config } from "tailwindcss";
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)", surface: "var(--surface)", raised: "var(--raised)",
        line: "var(--line)", line2: "var(--line2)",
        ink: "rgb(var(--ink-rgb) / <alpha-value>)", mut: "rgb(var(--mut-rgb) / <alpha-value>)",
        accent: "rgb(var(--accent-rgb) / <alpha-value>)", accent2: "var(--accent2)", accentfg: "var(--accent-fg)",
        violet: "var(--violet)",
        good: "rgb(var(--good-rgb) / <alpha-value>)", bad: "rgb(var(--bad-rgb) / <alpha-value>)", warn: "rgb(var(--warn-rgb) / <alpha-value>)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        lift: "var(--shadow-lift)",
        hero: "var(--shadow-hero)",
      },
      borderRadius: { xl2: "16px", xl3: "20px" },
      fontFamily: {
        sans: ["'Inter Variable'", "system-ui", "sans-serif"],
        display: ["'Inter Variable'", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-up": "fadeUp 0.4s ease both",
      },
      keyframes: {
        fadeUp: { from: { opacity: "0", transform: "translateY(10px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};
export default config;
