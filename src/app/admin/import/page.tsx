"use client"
import { useState } from "react"
import Link from "next/link"

export default function AdminImport() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ scheduled: number; skippedExisting: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [singleIds, setSingleIds] = useState("5853474")
  const [singleLoading, setSingleLoading] = useState(false)
  const [singleResult, setSingleResult] = useState<{ scheduled: number; alreadyExists: { id: number; name?: string; active?: boolean }[] } | null>(null)
  const [singleError, setSingleError] = useState<string | null>(null)

  async function runImport() {
    setLoading(true); setResult(null); setError(null)
    try {
      const res = await fetch("/api/import/run", { method: "POST" })
      const data = await res.json()
      if (res.ok) setResult(data)
      else setError(data.error ?? "Ошибка запуска импорта")
    } catch { setError("Ошибка сети") }
    setLoading(false)
  }

  async function importByIds() {
    setSingleLoading(true); setSingleResult(null); setSingleError(null)
    const ids = singleIds.split(/[\s,]+/).map(s => Number(s.trim())).filter(n => n > 0)
    if (!ids.length) { setSingleError("Введите ID товаров"); setSingleLoading(false); return }
    try {
      const res = await fetch("/api/import/single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })
      const data = await res.json()
      if (res.ok) setSingleResult(data)
      else setSingleError(data.error ?? "Ошибка")
    } catch { setSingleError("Ошибка сети") }
    setSingleLoading(false)
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Импорт товаров</h1>
        <p className="text-gray-500 text-sm mt-1">Digiseller API · Seller ID: 1459731</p>
      </div>

      {/* Import by specific ID */}
      <div className="card p-5 mb-4 border-brand/20">
        <h3 className="text-white font-semibold mb-1">🎯 Импорт конкретного товара</h3>
        <p className="text-gray-500 text-sm mb-3">
          Введите ID товара с Digiseller (из ссылки plati.market/itm/<strong>5853474</strong>)
        </p>
        <div className="flex gap-2">
          <input
            value={singleIds}
            onChange={e => setSingleIds(e.target.value)}
            placeholder="5853474, 1234567, ..."
            className="gp-input py-2 text-sm flex-1"
          />
          <button onClick={importByIds} disabled={singleLoading}
            className="btn-primary px-5 py-2 text-sm whitespace-nowrap disabled:opacity-60">
            {singleLoading ? "⏳..." : "⬇️ Добавить"}
          </button>
        </div>
        <p className="text-gray-600 text-xs mt-2">Можно вводить несколько ID через запятую или пробел</p>

        {singleResult && (
          <div className="mt-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
            <p className="text-emerald-400 font-medium text-sm mb-1">✅ Готово</p>
            {singleResult.scheduled > 0 && (
              <p className="text-gray-400 text-sm">В очереди на импорт: <strong className="text-white">{singleResult.scheduled}</strong> товар(ов)</p>
            )}
            {singleResult.alreadyExists.length > 0 && (
              <div className="mt-2">
                <p className="text-gray-500 text-xs mb-1">Уже в каталоге:</p>
                {singleResult.alreadyExists.map(p => (
                  <div key={p.id} className="flex items-center gap-2 text-xs text-gray-400">
                    <span className={`badge ${p.active ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                      {p.active ? "Активен" : "Скрыт"}
                    </span>
                    <span>ID {p.id}</span>
                    {p.name && <span className="truncate text-gray-500">{p.name}</span>}
                  </div>
                ))}
              </div>
            )}
            <p className="text-gray-600 text-xs mt-2">Товар появится в каталоге через 1-2 минуты</p>
          </div>
        )}
        {singleError && (
          <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <p className="text-red-400 text-sm">❌ {singleError}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="card p-5">
          <h3 className="text-white font-semibold mb-2">Массовый импорт</h3>
          <p className="text-gray-500 text-sm mb-4">Импортирует до 200 новых товаров. Автоматически скрывает недоступные.</p>
          <button onClick={runImport} disabled={loading}
            className="btn-primary w-full py-3 disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? "⏳ Импортируем..." : "⬇️ Запустить импорт"}
          </button>
        </div>

        <div className="card p-5">
          <h3 className="text-white font-semibold mb-2">Автоматический режим</h3>
          <p className="text-gray-500 text-sm mb-4">Воркер BullMQ проверяет новые товары каждые 60 минут.</p>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-emerald-400 text-sm font-medium">Воркер активен</span>
          </div>
          <a href="https://www.digiseller.ru/seller/" target="_blank" rel="noopener noreferrer"
            className="btn-outline w-full py-2.5 text-sm">🔗 Открыть Digiseller</a>
        </div>
      </div>

      {result && (
        <div className="card p-5 border-emerald-500/30 mb-4">
          <h3 className="text-emerald-400 font-semibold mb-3">✅ Импорт запущен</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center"><p className="text-2xl font-bold text-white">{result.scheduled}</p><p className="text-gray-500 text-xs mt-1">В очереди</p></div>
            <div className="text-center"><p className="text-2xl font-bold text-gray-400">{result.skippedExisting}</p><p className="text-gray-500 text-xs mt-1">Уже есть</p></div>
            <div className="text-center"><p className="text-2xl font-bold text-brand">{result.total}</p><p className="text-gray-500 text-xs mt-1">Найдено</p></div>
          </div>
        </div>
      )}
      {error && (
        <div className="card p-4 border-red-500/30 mb-4">
          <p className="text-red-400 font-semibold">❌ {error}</p>
        </div>
      )}

      <div className="card p-5">
        <h3 className="text-white font-semibold mb-3">Быстрые ссылки</h3>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin" className="btn-ghost text-sm py-2">📊 Дашборд</Link>
          <Link href="/admin/products" className="btn-ghost text-sm py-2">🎮 Товары</Link>
          <Link href="/catalog" target="_blank" className="btn-ghost text-sm py-2">🌐 Магазин</Link>
          <a href="https://www.digiseller.ru/seller/" target="_blank" rel="noopener noreferrer"
            className="btn-ghost text-sm py-2">🔗 Кабинет Digiseller</a>
        </div>
      </div>
    </div>
  )
}
