"use client"
import { useEffect, useState } from "react"

interface Stats {
  products: { total: number; active: number; hidden: number }
  queue: { db: number; waiting: number; active: number; failed: number }
  today: { imported: number; updated: number; errors: number }
}

export default function MonitoringPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/monitoring")
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false) })
      .catch(() => setLoading(false))

    const interval = setInterval(() => {
      fetch("/api/monitoring").then(r => r.json()).then(setStats)
    }, 10_000)
    return () => clearInterval(interval)
  }, [])

  const items = stats ? [
    { label: "Всего товаров",          value: stats.products.total,   color: "text-white" },
    { label: "Активных",               value: stats.products.active,  color: "text-green-400" },
    { label: "Скрытых",                value: stats.products.hidden,  color: "text-red-400" },
    { label: "В очереди (БД)",         value: stats.queue.db,         color: "text-yellow-400" },
    { label: "Очередь Redis (ожидание)", value: stats.queue.waiting,  color: "text-blue-400" },
    { label: "Очередь Redis (обработка)", value: stats.queue.active,  color: "text-purple-400" },
    { label: "Ошибок в очереди",       value: stats.queue.failed,     color: "text-red-400" },
    { label: "Импортировано сегодня",  value: stats.today.imported,   color: "text-brand" },
    { label: "Обновлено сегодня",      value: stats.today.updated,    color: "text-brand" },
    { label: "Ошибок сегодня",         value: stats.today.errors,     color: "text-red-400" },
  ] : []

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-8">Мониторинг системы</h1>
      {loading && <p className="text-gray-400">Загрузка...</p>}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {items.map(s => (
          <div key={s.label} className="bg-gray-800 rounded-xl p-5">
            <p className="text-gray-400 text-xs mb-1">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value.toLocaleString("ru-RU")}</p>
          </div>
        ))}
      </div>
      <p className="text-gray-600 text-xs mt-6">Обновляется каждые 10 секунд</p>
    </div>
  )
}