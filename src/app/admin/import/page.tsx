"use client"
import { useState } from "react"
import Link from "next/link"

export default function AdminImport() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ scheduled: number; skippedExisting: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function runImport() {
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch("/api/import/run", { method: "POST" })
      const data = await res.json()
      if (res.ok) setResult(data)
      else setError(data.error ?? "Ошибка запуска импорта")
    } catch {
      setError("Ошибка сети")
    }
    setLoading(false)
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Импорт товаров</h1>
        <p className="text-gray-500 text-sm mt-1">Digiseller API · Seller ID: 1459731</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <h3 className="text-white font-semibold mb-2">Ручной запуск</h3>
          <p className="text-gray-500 text-sm mb-4">
            Импортирует до 200 товаров за запуск. Автоматически скрывает недоступные.
          </p>
          <button onClick={runImport} disabled={loading}
            className="btn-primary w-full py-3 disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? "⏳ Импортируем..." : "⬇️ Запустить импорт"}
          </button>
        </div>

        <div className="card p-5">
          <h3 className="text-white font-semibold mb-2">Автоматический режим</h3>
          <p className="text-gray-500 text-sm mb-4">
            Воркер BullMQ проверяет новые товары каждые 60 минут автоматически.
          </p>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-emerald-400 text-sm font-medium">Воркер активен</span>
          </div>
          <a href="https://www.digiseller.ru/seller/"
            target="_blank" rel="noopener noreferrer"
            className="btn-outline w-full py-2.5 text-sm">
            🔗 Открыть Digiseller
          </a>
        </div>
      </div>

      {result && (
        <div className="card p-5 border-emerald-500/30">
          <h3 className="text-emerald-400 font-semibold mb-3">✅ Импорт запущен</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{result.scheduled}</p>
              <p className="text-gray-500 text-xs mt-1">В очереди</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-400">{result.skippedExisting}</p>
              <p className="text-gray-500 text-xs mt-1">Уже есть</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-brand">{result.total}</p>
              <p className="text-gray-500 text-xs mt-1">Всего найдено</p>
            </div>
          </div>
          <p className="text-gray-600 text-xs mt-3">Товары добавятся в каталог через несколько минут</p>
        </div>
      )}

      {error && (
        <div className="card p-4 border-red-500/30">
          <h3 className="text-red-400 font-semibold mb-1">❌ Ошибка</h3>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      )}

      <div className="card p-5 mt-4">
        <h3 className="text-white font-semibold mb-3">Быстрые ссылки</h3>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin" className="btn-ghost text-sm py-2">📊 Дашборд</Link>
          <Link href="/admin/products" className="btn-ghost text-sm py-2">🎮 Товары</Link>
          <Link href="/catalog" target="_blank" className="btn-ghost text-sm py-2">🌐 Магазин</Link>
          <a href="https://www.digiseller.com/seller/" target="_blank" rel="noopener noreferrer"
            className="btn-ghost text-sm py-2">🔗 Digiseller кабинет</a>
        </div>
      </div>
    </div>
  )
}
