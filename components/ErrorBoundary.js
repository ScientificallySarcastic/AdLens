"use client"
import { Component } from "react"

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info.componentStack)
  }
  render() {
    if (!this.state.hasError) return this.props.children
    if (this.props.fallback)  return this.props.fallback
    return (
      <div style={{
        padding: "20px 24px", borderRadius: 12,
        background: "rgba(251,113,133,0.06)", border: "1px solid rgba(251,113,133,0.2)",
        display: "flex", alignItems: "flex-start", gap: 12,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        <span style={{ fontSize: 20 }}>⚠️</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#fb7185", marginBottom: 4 }}>
            {this.props.label || "Something went wrong"}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 10 }}>
            This section failed to load.
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: "5px 12px", borderRadius: 7,
              background: "rgba(251,113,133,0.1)", border: "1px solid rgba(251,113,133,0.25)",
              color: "#fb7185", fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}
          >Try again</button>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <pre style={{ marginTop: 10, fontSize: 10, color: "rgba(255,255,255,0.3)", whiteSpace: "pre-wrap", maxHeight: 100, overflow: "auto" }}>
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
