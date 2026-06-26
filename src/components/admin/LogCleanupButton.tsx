"use client"
import { useState } from "react"

export function LogCleanupButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function run(days: number) {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch("/api/admin/logs/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      })
      const data = await res.json()
      if (!res.ok) { setResult("Ошибка: " + (data.error ?? res.status)); return }
      const d = data.deleted
      setResult(
        "Удалено: " +
        d.platiImportLogs + " лог Plati, " +
        d.systemLogs + " системных, " +
        d.pageViews + " просмотров, " +
        d.loginHistory + " входов"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
          <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
        </svg>
        <h3 className="font-semibold text-gray-900 text-sm">Очистка логов</h3>
      </div>
      <p className="text-gray-400 text-xs mb-4">Удаляет старые записи из БД. Активные уведомления не затрагиваются.</p>
      <div className="flex gap-2 flex-wrap">
        {[30, 14, 7].map(days => (
          <button
            key={days}
            onClick={() => run(days)}
            disabled={loading}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
              days === 7
                ? "border-red-200 text-red-500 hover:bg-red-50"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {loading ? "..." : `Старше ${days} дней`}
          </button>
        ))}
      </div>
      {result && (
        <p className="mt-3 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">{result}</p>
      )}
    </div>
  )
}