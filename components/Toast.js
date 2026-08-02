"use client"
import { createContext, useContext, useState, useCallback, useEffect } from "react"

const ToastContext = createContext(null)

const TYPES = {
  success: { icon: "✅", bg: "rgba(0,208,132,0.12)",    border: "rgba(0,208,132,0.3)"    },
  error:   { icon: "❌", bg: "rgba(251,113,133,0.12)", border: "rgba(251,113,133,0.3)"  },
  warning: { icon: "⚠️", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)"   },
  info:    { icon: "ℹ️", bg: "rgba(56,189,248,0.12)",  border: "rgba(56,189,248,0.3)"   },
}

let _id = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const add = useCallback((message, type, duration) => {
    const id = ++_id
    setToasts(prev => [...prev, { id, message, type: type || "info", duration: duration || (type === "error" ? 5000 : 3500) }])
    return id
  }, [])

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = {
    success: (msg, dur) => add(msg, "success", dur),
    error:   (msg, dur) => add(msg, "error",   dur),
    warning: (msg, dur) => add(msg, "warning", dur),
    info:    (msg, dur) => add(msg, "info",    dur),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {toasts.length > 0 && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end",
          pointerEvents: "none",
        }}>
          {toasts.map(t => (
            <div key={t.id} style={{ pointerEvents: "auto" }}>
              <ToastItem toast={t} onRemove={remove} />
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be inside <ToastProvider>")
  return ctx
}

function ToastItem({ toast, onRemove }) {
  const [visible, setVisible] = useState(false)
  const cfg = TYPES[toast.type] || TYPES.info

  useEffect(() => {
    const show = setTimeout(() => setVisible(true), 10)
    const hide = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onRemove(toast.id), 300)
    }, toast.duration)
    return () => { clearTimeout(show); clearTimeout(hide) }
  }, [])

  return (
    <div
      onClick={() => { setVisible(false); setTimeout(() => onRemove(toast.id), 300) }}
      style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: "11px 14px", borderRadius: 10,
        background: cfg.bg, border: "1px solid " + cfg.border,
        boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
        cursor: "pointer", maxWidth: 340, width: "100%",
        transform: visible ? "translateY(0) scale(1)" : "translateY(8px) scale(0.97)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.25s ease, opacity 0.25s ease",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1.4, flexShrink: 0 }}>{cfg.icon}</span>
      <span style={{ fontSize: 13, color: "#eeeef5", lineHeight: 1.5, flex: 1 }}>{toast.message}</span>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", flexShrink: 0, marginTop: 2 }}>✕</span>
    </div>
  )
}
