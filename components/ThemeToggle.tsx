"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => { setDark(document.documentElement.classList.contains("dark")); }, []);
  const flip = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("adlens-theme", next ? "dark" : "light"); } catch {}
  };
  return (
    <button onClick={flip} aria-label="Toggle theme"
      className="relative flex items-center w-[52px] h-[26px] rounded-full border border-line2 bg-raised px-0.5">
      <motion.span layout transition={{ type: "spring", stiffness: 500, damping: 34 }}
        className="absolute w-[20px] h-[20px] rounded-full bg-accent grid place-items-center text-accentfg"
        style={{ left: dark ? 28 : 3 }}>
        {dark ? <Moon size={11} /> : <Sun size={11} />}
      </motion.span>
    </button>
  );
}
