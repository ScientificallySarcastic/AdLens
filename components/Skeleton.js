"use client"

const pulse = "@keyframes fp{0%,100%{opacity:1}50%{opacity:0.4}}"
const base  = { borderRadius: 6, background: "rgba(255,255,255,0.06)", animation: "fp 1.5s ease-in-out infinite" }

export function Skeleton({ width, height, style }) {
  return (
    <>
      <style>{pulse}</style>
      <div style={{ ...base, width: width || "100%", height: height || 16, ...(style || {}) }} />
    </>
  )
}

export function SkeletonCard({ dark }) {
  const isDark = dark !== false
  const bg = isDark ? "#0f0f1a" : "#ffffff"
  const bd = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)"
  return (
    <>
      <style>{pulse}</style>
      <div style={{ background: bg, border: "1px solid " + bd, borderRadius: 13, padding: 20 }}>
        <Skeleton width={80}  height={11} style={{ marginBottom: 12 }} />
        <Skeleton width={120} height={32} style={{ marginBottom: 8 }} />
        <Skeleton width={60}  height={10} />
      </div>
    </>
  )
}

export function SkeletonTable({ rows, cols, dark }) {
  const isDark   = dark !== false
  const numRows  = rows || 5
  const numCols  = cols || 4
  const bg  = isDark ? "#0f0f1a" : "#ffffff"
  const bd  = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)"
  const bdr = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"
  const widths = ["40%", "25%", "20%", "15%"]
  return (
    <>
      <style>{pulse}</style>
      <div style={{ background: bg, border: "1px solid " + bd, borderRadius: 13, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid " + bdr, display: "flex", gap: 16 }}>
          {Array.from({ length: numCols }).map((_, i) => (
            <Skeleton key={i} width={widths[i] || "20%"} height={12} />
          ))}
        </div>
        {Array.from({ length: numRows }).map((_, r) => (
          <div key={r} style={{ padding: "14px 16px", borderBottom: "1px solid " + bdr, display: "flex", gap: 16, alignItems: "center" }}>
            {Array.from({ length: numCols }).map((_, c) => (
              <Skeleton key={c} width={widths[c] || "20%"} height={12}
                style={{ animationDelay: ((r * numCols + c) * 0.05) + "s" }} />
            ))}
          </div>
        ))}
      </div>
    </>
  )
}

export function SkeletonDashboard({ dark }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {[0, 1, 2, 3].map(i => <SkeletonCard key={i} dark={dark} />)}
      </div>
      <SkeletonTable rows={6} dark={dark} />
    </div>
  )
}

export default Skeleton
