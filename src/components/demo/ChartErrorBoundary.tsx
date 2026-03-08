"use client"

import { Component, type ReactNode } from "react"

export default class ChartErrorBoundary extends Component<{ children: ReactNode }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{ height: 320 }}
          className="border rounded flex items-center justify-center text-sm text-slate-500"
        >
          Chart failed to load
        </div>
      )
    }

    return this.props.children
  }
}
