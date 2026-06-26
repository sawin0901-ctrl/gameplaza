"use client"
import { useState } from "react"

export function DismissAlertsButton() {
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)

  async function dismiss() {
    setLoading(true)
    try {
      const r = await fetch("/api/admin/notifications", { method: "PATCH" })
      const d = await r.json()
      if (d.ok) { setDone(true); setTimeout(() => setDone(false), 3000) }
    } catch {}
    setLoading(false)
  }

  return (
    <button
      onClick={dismiss}
      disabled={loading}
      className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
        done
          ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
          : "bg-gray-100 text-gray-500 hover:bg-gray-200 border border-transparent"
      }`}
    >
      {loading ? (
        <span className="w-3 h-3 border border-gray-400/40 border-t-gray-500 rounded-full animate-spin" />
      ) : done ? (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
      ) : (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" /></svg>
      )}
      {done ? "Сброшено" : loading ? "Сброс..." : "Сбросить"}
    </button>
  )
}
