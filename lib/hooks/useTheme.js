"use client"
import { useState, useEffect } from "react"

export function useTheme() {
  const [dark, setDark] = useState(true)

  useEffect(() => {
    try {
      const saved = localStorage.getItem("fastrill-theme")
      if (saved) setDark(saved === "dark")
    } catch(e) {}
  }, [])

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    try { localStorage.setItem("fastrill-theme", next ? "dark" : "light") } catch(e) {}
  }

  const colors = {
    navActiveBdr:  dark ? "rgba(0,201,177,0.2)"  : "rgba(0,137,122,0.15)",
    navActiveText: dark ? "#00C9B1"               : "#00897A",
  }

  const inputStyle = {
    background:  dark ? "rgba(255,255,255,0.05)" : "#f1f5f9",
    border:      `1px solid ${dark ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`,
    borderRadius: 8,
    padding:     "9px 12px",
    color:       dark ? "#eeeef5" : "#1e293b",
    fontSize:    13,
    outline:     "none",
    width:       "100%",
    fontFamily:  "'Plus Jakarta Sans', sans-serif",
  }

  return { dark, toggleTheme, colors, inputStyle }
}
