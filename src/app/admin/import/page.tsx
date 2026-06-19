"use client"
import { useState } from "react"

export default function AdminImport() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function runImport() {
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch("/api/import/run", {
        method: "POST",
        headers: { "x-admin-secret": process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "gameplaza-admin-2024" },
      })
      const data = await res.json()
      if (res.ok) setResult(JSON.stringify(data, null, 2))
      else setError(data.error ?? "Ошибка запуска импорта")
    } catch (e) {
      setError("Ошибка сети")
    }
    setLoading(false)
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Импорт товаров</h1>
        <p className="text-gray-500 text-sm mt-1">Импорт из Digiseller API (Seller ID: 1459731)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <h3 className="text-white font-semibold mb-3">Ручной запуск</h3>
          <p className="text-gray-500 text-sm mb-4">
            Импортирует товары с Digiseller. Максимум 200 товаров за запуск.
            Автоматически скрывает недоступные товары.
          </p>
          <button onClick={runImport} disabled={loading}
            className="btn-primary w-full py-3 disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? "⏳ Импортируем..." : "⬇️ Запустить импорт"}
          </button>
        </div>

        <div className="card p-5">
          <h3 className="text-white font-semibold mb-3">Автоматический импорт</h3>
          <p className="text-gray-500 text-sm mb-4">
            Воркер запускается автоматически через BullMQ. Проверяет новые товары каждые 60 минут.
          </p>
          <div className="flex items-center gap-2 mt-auto">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-emerald-400 text-sm font-medium">Воркер активен</span>
          </div>
        </div>
      </div>

      {result && (
        <div className="card p-4">
          <h3 className="text-emerald-400 font-semibold mb-2">✅ Успешно запущен</h3>
          <pre className="text-gray-400 text-xs overflow-auto bg-black/30 rounded-lg p-3">{result}</pre>
        </div>
      )}
      {error && (
        <div className="card p-4 border-red-500/30">
          <h3 className="text-red-400 font-semibold mb-1">❌ Ошибка</h3>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}
