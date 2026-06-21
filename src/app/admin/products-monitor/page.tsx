"use client"
import { useState, useEffect, useCallback } from "react"

interface MonitorLog {
  id: string; level: string; message: string
  details: Record<string, unknown> | null; createdAt: string; status: string
}
interface Stats { priceToday: number; hiddenToday: number; publishedToday: number; errorsToday: number; pendingNotifs: number }
interface CheckResult { checked: number; priceChanges: number; availabilityChanges: number; descriptionChanges: number; errors: number; autoHidden: number; autoPublished: number }

function levelColor(l: string) {
  if (l === "error") return "text-red-400"
  if (l === "warn")  return "text-yellow-400"
  return "text-emerald-400"
}
function levelBg(l: string) {
  if (l === "error") return "bg-red-500/10 border-red-500/20"
  if (l === "warn")  return "bg-yellow-500/10 border-yellow-500/20"
  return "bg-emerald-500/10 border-emerald-500/20"
}
function StatCard({ label, value, color = "text-[var(--text)]" }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-white/5 border border-[var(--border)] rounded-2xl p-4 text-center">
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-[var(--text-3)] mt-1">{label}</div>
    </div>
  )
}

export default function ProductsMonitorPage() {
  const [loading, setLoading] = useState(false)
  const [checkType, setCheckType] = useState<"all"|"prices"|"availability"|"descriptions">("all")
  const [batchSize, setBatchSize] = useState(50)
  const [lastResult, setLastResult] = useState<CheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<MonitorLog[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [filterLevel, setFilterLevel] = useState("")
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [totalLogs, setTotalLogs] = useState(0)

  const fetchLogs = useCallback(async (p = 1, lv = filterLevel) => {
    const res = await fetch(`/api/admin/monitoring/product-check/logs?page=${p}&level=${lv}`)
    if (!res.ok) return
    const data = await res.json()
    setLogs(data.logs); setStats(data.stats)
    setPages(data.pages); setTotalLogs(data.total)
  }, [filterLevel])

  useEffect(() => { fetchLogs(1, filterLevel) }, [filterLevel])

  async function runCheck(pid?: string) {
    setLoading(true); setError(null); setLastResult(null)
    try {
      const res = await fetch("/api/admin/monitoring/product-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchSize, checkType, productId: pid }),
      })
      const data = await res.json()
      if (res.ok) { setLastResult(data); fetchLogs(1, filterLevel) }
      else setError(data.error ?? "Ошибка")
    } catch (e) { setError(e instanceof Error ? e.message : "Ошибка") }
    setLoading(false)
  }

  async function markAllRead() {
    await fetch("/api/admin/monitoring/product-check/logs", { method: "DELETE" })
    fetchLogs(1, filterLevel)
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">📊 Мониторинг товаров</h1>
          <p className="text-[var(--text-3)] text-sm mt-1">Проверка цен, наличия и описаний. Авто-скрытие при недоступности.</p>
        </div>
        {stats && stats.pendingNotifs > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-2 px-3 py-1.5 bg-brand/20 text-brand rounded-xl text-sm">
            🔔 {stats.pendingNotifs} новых · Отметить прочитанными
          </button>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <StatCard label="Цены сегодня" value={stats.priceToday} color="text-blue-400" />
          <StatCard label="Скрыто сегодня" value={stats.hiddenToday} color="text-yellow-400" />
          <StatCard label="Опубликовано" value={stats.publishedToday} color="text-emerald-400" />
          <StatCard label="Ошибки сегодня" value={stats.errorsToday} color="text-red-400" />
          <StatCard label="Уведомлений" value={stats.pendingNotifs} color="text-brand" />
        </div>
      )}

      {/* Controls */}
      <div className="bg-white/5 border border-[var(--border)] rounded-2xl p-5 mb-6">
        <h2 className="font-semibold text-[var(--text)] mb-4">⚙️ Параметры проверки</h2>
        <div className="flex flex-wrap gap-3 mb-4">
          <div>
            <label className="block text-xs text-[var(--text-3)] mb-1">Тип проверки</label>
            <select value={checkType} onChange={e => setCheckType(e.target.value as typeof checkType)}
              className="bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text)]">
              <option value="all">Всё (цены + наличие + описания)</option>
              <option value="prices">💱 Только цены</option>
              <option value="availability">📦 Только наличие</option>
              <option value="descriptions">📝 Только описания</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-3)] mb-1">Пакет товаров</label>
            <select value={batchSize} onChange={e => setBatchSize(Number(e.target.value))}
              className="bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text)]">
              <option value={50}>50 товаров</option>
              <option value={100}>100 товаров</option>
              <option value={500}>500 товаров</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => runCheck()} disabled={loading}
            className="px-4 py-2 bg-brand text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-brand/90">
            {loading ? "⏳ Проверяю..." : `✅ Проверить ${batchSize} товаров`}
          </button>
          <button onClick={() => { setCheckType("prices"); runCheck() }} disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-blue-700">
            💱 Обновить цены
          </button>
          <button onClick={() => { setCheckType("availability"); runCheck() }} disabled={loading}
            className="px-4 py-2 bg-yellow-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-yellow-700">
            📦 Обновить наличие
          </button>
          <button onClick={() => { setCheckType("descriptions"); runCheck() }} disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-purple-700">
            📝 Обновить описания
          </button>
        </div>
      </div>

      {/* Last check result */}
      {error && <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">❌ {error}</div>}
      {lastResult && (
        <div className="mb-6 p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
          <p className="font-semibold text-emerald-400 mb-3">✅ Проверка завершена</p>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 text-center text-sm">
            {[
              { l: "Проверено",    v: lastResult.checked,              c: "text-[var(--text)]" },
              { l: "Цены",         v: lastResult.priceChanges,         c: "text-blue-400" },
              { l: "Наличие",      v: lastResult.availabilityChanges,  c: "text-yellow-400" },
              { l: "Описания",     v: lastResult.descriptionChanges,   c: "text-purple-400" },
              { l: "Скрыто",       v: lastResult.autoHidden,           c: "text-red-400" },
              { l: "Опубликовано", v: lastResult.autoPublished,        c: "text-emerald-400" },
              { l: "Ошибки",       v: lastResult.errors,               c: "text-red-400" },
            ].map(s => (
              <div key={s.l} className="bg-white/5 rounded-xl p-2">
                <div className={`text-xl font-bold ${s.c}`}>{s.v}</div>
                <div className="text-xs text-[var(--text-3)]">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Change log */}
      <div className="bg-white/5 border border-[var(--border)] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-semibold text-[var(--text)]">📋 Журнал изменений ({totalLogs})</h2>
          <div className="flex gap-2">
            {["", "info", "warn", "error"].map(lv => (
              <button key={lv} onClick={() => { setFilterLevel(lv); setPage(1) }}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${filterLevel === lv ? "bg-brand/20 border-brand text-brand" : "border-[var(--border)] text-[var(--text-3)] hover:border-brand/50"}`}>
                {lv === "" ? "Все" : lv === "info" ? "✅ Инфо" : lv === "warn" ? "⚠️ Скрытые" : "❌ Ошибки"}
              </button>
            ))}
          </div>
        </div>
        {logs.length === 0 ? (
          <p className="text-center text-[var(--text-3)] py-8">Нет записей. Запустите проверку товаров.</p>
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className={`flex gap-3 p-3 rounded-xl border text-sm ${levelBg(log.level)} ${log.status === "new" ? "ring-1 ring-brand/30" : ""}`}>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${levelColor(log.level)} truncate`}>{log.message}</p>
                  {log.details && (log.details as Record<string,unknown>).oldPrice !== undefined && (
                    <p className="text-xs text-[var(--text-3)] mt-0.5">
                      {(log.details as Record<string,unknown>).oldPrice as number} ₽ → {(log.details as Record<string,unknown>).newPrice as number} ₽
                    </p>
                  )}
                </div>
                <span className="text-xs text-[var(--text-3)] whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString("ru-RU", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        )}
        {pages > 1 && (
          <div className="flex gap-2 mt-4 justify-center">
            {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => { setPage(p); fetchLogs(p, filterLevel) }}
                className={`w-8 h-8 rounded-lg text-sm border ${p === page ? "bg-brand text-white border-brand" : "border-[var(--border)] text-[var(--text-3)] hover:border-brand/50"}`}>
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}