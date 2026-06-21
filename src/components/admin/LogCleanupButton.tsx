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
    <div className="card p-5">
      <h3 className="font-semibold text-[var(--text)] mb-3">Очистка логов</h3>
      <p className="text-[var(--text-3)] text-sm mb-4">Удаляет старые записи из БД. Активные уведомления не затрагиваются.</p>
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => run(30)} disabled={loading} className="btn-outline text-sm py-2 px-4">
          {loading ? "Очищаем..." : "Старше 30 дней"}
        </button>
        <button onClick={() => run(14)} disabled={loading} className="btn-outline text-sm py-2 px-4">
          {loading ? "Очищаем..." : "Старше 14 дней"}
        </button>
        <button onClick={() => run(7)} disabled={loading} className="btn-ghost text-sm py-2 px-4 text-red-400">
          {loading ? "Очищаем..." : "Старше 7 дней"}
        </button>
      </div>
      {result && (
        <p className="mt-3 text-sm text-emerald-400">{result}</p>
      )}
    </div>
  )
}