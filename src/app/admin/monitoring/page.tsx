"use client"
import { useState, useEffect, useCallback } from "react"

// ── Types ─────────────────────────────────────────────────────────────────────
interface SystemLog {
  id: string; level: string; category: string; message: string
  details: unknown; url: string | null; userId: string | null
  status: string; resolvedAt: string | null; resolvedBy: string | null
  createdAt: string
}
interface LogsData {
  logs: SystemLog[]; total: number; pages: number
  stats: { errorsToday: number; warnsToday: number; infoToday: number; newTotal: number }
}
interface HealthCheck {
  name: string; status: "ok" | "warn" | "error" | "unknown"
  message: string; value?: string | number; duration?: number
}
interface HealthData {
  overall: "ok" | "warn" | "error"; errorCount: number; warnCount: number
  okCount: number; checks: HealthCheck[]; duration: number; checkedAt: string
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const LEVEL_STYLES: Record<string, string> = {
  error: "bg-red-500/15 text-red-400 border border-red-500/20",
  warn: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20",
  info: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
  debug: "bg-gray-500/15 text-gray-400 border border-gray-500/20",
}
const STATUS_STYLES: Record<string, string> = {
  new: "bg-red-500/15 text-red-400",
  in_progress: "bg-yellow-500/15 text-yellow-400",
  resolved: "bg-emerald-500/15 text-emerald-400",
}
const STATUS_LABELS: Record<string, string> = { new: "Новая", in_progress: "В работе", resolved: "Решена" }
const CATEGORY_LABELS: Record<string, string> = {
  digiseller: "Digiseller", import: "Импорт", auth: "Авторизация",
  smtp: "SMTP/Почта", worker: "Воркер", db: "База данных",
  server: "Сервер", cron: "Cron", payment: "Оплата", queue: "Очередь", system: "Система"
}
const HEALTH_ICON: Record<string, string> = { ok: "✅", warn: "⚠️", error: "❌", unknown: "❓" }

function fmtDate(s: string) {
  return new Date(s).toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  })
}

function TabBtn({ active, onClick, children, badge }: {
  active: boolean; onClick: () => void; children: React.ReactNode; badge?: number
}) {
  return (
    <button onClick={onClick} className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
      active ? "bg-brand text-white" : "text-gray-500 hover:text-white hover:bg-white/5"
    }`}>
      {children}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  )
}

// ── Dashboard Tab ─────────────────────────────────────────────────────────────
function DashboardTab({ stats, logs }: {
  stats: LogsData["stats"] | null; logs: SystemLog[]
}) {
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Ошибок сегодня", value: stats?.errorsToday ?? 0, color: "text-red-400", icon: "🔴" },
          { label: "Предупреждений", value: stats?.warnsToday ?? 0, color: "text-yellow-400", icon: "🟡" },
          { label: "Инфо-событий", value: stats?.infoToday ?? 0, color: "text-blue-400", icon: "🔵" },
          { label: "Нерешённых", value: stats?.newTotal ?? 0, color: "text-red-400", icon: "⚠️" },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-xs">{s.label}</span>
              <span>{s.icon}</span>
            </div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Recent errors */}
      <div className="card p-5">
        <h3 className="text-white font-semibold mb-4">Последние 10 событий</h3>
        {logs.length > 0 ? (
          <div className="space-y-2">
            {logs.slice(0, 10).map(log => (
              <div key={log.id} className="flex items-start gap-3 py-2 border-b border-[#1f2937]">
                <span className={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 mt-0.5 ${LEVEL_STYLES[log.level]}`}>
                  {log.level.toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{log.message}</p>
                  <p className="text-gray-600 text-xs mt-0.5">
                    {CATEGORY_LABELS[log.category] ?? log.category} · {fmtDate(log.createdAt)}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${STATUS_STYLES[log.status]}`}>
                  {STATUS_LABELS[log.status]}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-gray-500">Ошибок не обнаружено</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Logs Tab ──────────────────────────────────────────────────────────────────
function LogsTab() {
  const [data, setData] = useState<LogsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Filters
  const [level, setLevel] = useState("all")
  const [category, setCategory] = useState("all")
  const [status, setStatus] = useState("all")

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      ...(level !== "all" ? { level } : {}),
      ...(category !== "all" ? { category } : {}),
      ...(status !== "all" ? { status } : {}),
    })
    const res = await fetch(`/api/admin/monitoring/logs?${params}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [page, level, category, status])

  useEffect(() => { load() }, [load])

  async function updateStatus(ids: string[], newStatus: string) {
    await fetch("/api/admin/monitoring/logs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, status: newStatus }),
    })
    setSelected(new Set())
    load()
  }

  const allChecked = data?.logs.length > 0 && data.logs.every(l => selected.has(l.id))

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Уровень", value: level, set: setLevel, opts: [["all","Все"],["error","Ошибки"],["warn","Предупреждения"],["info","Инфо"]] },
          { label: "Категория", value: category, set: setCategory, opts: [["all","Все категории"],["digiseller","Digiseller"],["import","Импорт"],["auth","Авторизация"],["smtp","SMTP"],["worker","Воркер"],["db","БД"],["server","Сервер"],["queue","Очередь"],["system","Система"]] },
          { label: "Статус", value: status, set: setStatus, opts: [["all","Все"],["new","Новые"],["in_progress","В работе"],["resolved","Решены"]] },
        ].map(f => (
          <select key={f.label} value={f.value} onChange={e => { f.set(e.target.value); setPage(1) }}
            className="gp-input py-2 text-sm">
            {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        <button onClick={load} disabled={loading} className="btn-ghost text-sm py-2 px-4">
          {loading ? "↻" : "↻"} Обновить
        </button>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="card p-3 border-brand/20 flex items-center gap-3">
          <span className="text-brand text-sm">Выбрано: {selected.size}</span>
          <button onClick={() => updateStatus([...selected], "resolved")} className="btn-ghost text-xs py-1 px-3 text-emerald-400">✓ Отметить решёнными</button>
          <button onClick={() => updateStatus([...selected], "in_progress")} className="btn-ghost text-xs py-1 px-3 text-yellow-400">↻ В работе</button>
          <button onClick={() => setSelected(new Set())} className="btn-ghost text-xs py-1 px-3 text-gray-500">✕</button>
        </div>
      )}

      {/* Table */}
      {data && (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-600 text-left border-b border-[#1f2937] text-xs">
                  <th className="p-3 w-8">
                    <input type="checkbox" checked={allChecked}
                      onChange={e => setSelected(e.target.checked ? new Set(data.logs.map(l => l.id)) : new Set())}
                      className="accent-brand" />
                  </th>
                  <th className="p-3">Время</th>
                  <th className="p-3">Уровень</th>
                  <th className="p-3">Категория</th>
                  <th className="p-3 flex-1">Сообщение</th>
                  <th className="p-3">Статус</th>
                  <th className="p-3">Действие</th>
                </tr>
              </thead>
              <tbody>
                {data.logs.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-600">Нет событий по выбранным фильтрам</td></tr>
                ) : data.logs.map(log => (
                  <>
                    <tr key={log.id}
                      className="border-b border-[#1f2937] hover:bg-white/2 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                      <td className="p-3" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.has(log.id)}
                          onChange={e => {
                            const n = new Set(selected)
                            e.target.checked ? n.add(log.id) : n.delete(log.id)
                            setSelected(n)
                          }} className="accent-brand" />
                      </td>
                      <td className="p-3 text-gray-400 text-xs whitespace-nowrap">{fmtDate(log.createdAt)}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${LEVEL_STYLES[log.level] ?? ""}`}>
                          {log.level.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-gray-400 text-xs">{CATEGORY_LABELS[log.category] ?? log.category}</td>
                      <td className="p-3 text-white max-w-xs">
                        <p className="truncate">{log.message}</p>
                        {log.url && <p className="text-gray-600 text-xs truncate">{log.url}</p>}
                      </td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded ${STATUS_STYLES[log.status] ?? ""}`}>
                          {STATUS_LABELS[log.status] ?? log.status}
                        </span>
                      </td>
                      <td className="p-3" onClick={e => e.stopPropagation()}>
                        {log.status !== "resolved" && (
                          <button onClick={() => updateStatus([log.id], "resolved")}
                            className="text-xs text-emerald-400 hover:underline">Решено</button>
                        )}
                      </td>
                    </tr>
                    {expandedId === log.id && (
                      <tr key={log.id + "-exp"} className="bg-white/3">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="space-y-2 text-xs">
                            {log.url && <p><span className="text-gray-500">URL:</span> <span className="text-gray-300">{log.url}</span></p>}
                            {log.userId && <p><span className="text-gray-500">Пользователь:</span> <span className="text-gray-300">{log.userId}</span></p>}
                            {log.resolvedAt && <p><span className="text-gray-500">Решено:</span> <span className="text-gray-300">{fmtDate(log.resolvedAt)} — {log.resolvedBy}</span></p>}
                            {log.details && (
                              <div>
                                <p className="text-gray-500 mb-1">Детали:</p>
                                <pre className="bg-black/30 rounded p-2 text-gray-300 overflow-x-auto text-[11px]">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.pages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-ghost text-sm py-1.5 px-3 disabled:opacity-40">← Пред</button>
              <span className="text-gray-500 text-sm">{page} / {data.pages} (всего: {data.total})</span>
              <button disabled={page === data.pages} onClick={() => setPage(p => p + 1)} className="btn-ghost text-sm py-1.5 px-3 disabled:opacity-40">След →</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Diagnostics Tab ───────────────────────────────────────────────────────────
function DiagnosticsTab() {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(false)

  async function runCheck() {
    setLoading(true)
    const res = await fetch("/api/admin/monitoring/health")
    if (res.ok) setData(await res.json())
    setLoading(false)
  }

  const overallColor = data?.overall === "ok" ? "text-emerald-400" : data?.overall === "warn" ? "text-yellow-400" : "text-red-400"

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold">Диагностика системы</h3>
          {data && <p className="text-gray-500 text-xs mt-1">Проверено {new Date(data.checkedAt).toLocaleTimeString("ru-RU")} · {data.duration}мс</p>}
        </div>
        <button onClick={runCheck} disabled={loading} className="btn-primary px-6 py-2.5 disabled:opacity-60">
          {loading ? "⏳ Проверяем..." : "🔍 Полная проверка системы"}
        </button>
      </div>

      {data && (
        <>
          {/* Overall status */}
          <div className={`card p-4 flex items-center gap-4 ${
            data.overall === "ok" ? "border-emerald-500/20" : data.overall === "warn" ? "border-yellow-500/20" : "border-red-500/20"
          }`}>
            <span className="text-3xl">{HEALTH_ICON[data.overall]}</span>
            <div>
              <p className={`font-semibold text-lg ${overallColor}`}>
                {data.overall === "ok" ? "Всё работает нормально" : data.overall === "warn" ? "Есть предупреждения" : "Обнаружены ошибки"}
              </p>
              <p className="text-gray-500 text-sm">
                ✅ {data.okCount} норм &nbsp; ⚠️ {data.warnCount} предупр. &nbsp; ❌ {data.errorCount} ошибок
              </p>
            </div>
          </div>

          {/* Checks list */}
          <div className="card overflow-hidden">
            {data.checks.map((check, i) => (
              <div key={i} className="flex items-center justify-between p-4 border-b border-[#1f2937] last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-xl w-8 text-center">{HEALTH_ICON[check.status]}</span>
                  <div>
                    <p className="text-white text-sm font-medium">{check.name}</p>
                    <p className={`text-xs mt-0.5 ${
                      check.status === "ok" ? "text-gray-500" :
                      check.status === "warn" ? "text-yellow-400" :
                      check.status === "error" ? "text-red-400" : "text-gray-600"
                    }`}>{check.message}</p>
                  </div>
                </div>
                <div className="text-right">
                  {check.value && <p className="text-white text-sm font-semibold">{check.value}</p>}
                  {check.duration !== undefined && <p className="text-gray-600 text-xs">{check.duration}мс</p>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!data && !loading && (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-white font-medium mb-2">Запустите полную проверку</p>
          <p className="text-gray-500 text-sm">Нажмите кнопку выше для диагностики всех компонентов системы</p>
        </div>
      )}
    </div>
  )
}

// ── Actions Tab ───────────────────────────────────────────────────────────────
function ActionsTab() {
  const [results, setResults] = useState<Record<string, { ok: boolean; message: string; details?: unknown }>>({})
  const [loading, setLoading] = useState<string | null>(null)

  async function run(action: string, params?: Record<string, unknown>) {
    setLoading(action)
    try {
      const res = await fetch("/api/admin/monitoring/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, params }),
      })
      const data = await res.json()
      setResults(r => ({ ...r, [action]: { ok: res.ok, message: data.message ?? data.error ?? "Выполнено", details: data.details } }))
    } catch { setResults(r => ({ ...r, [action]: { ok: false, message: "Ошибка соединения" } })) }
    setLoading(null)
  }

  const actions = [
    {
      id: "restart-queue",
      title: "Перезапустить очередь",
      desc: "Приостанавливает и возобновляет очередь BullMQ. Помогает при зависших задачах.",
      icon: "🔄",
      color: "text-brand",
    },
    {
      id: "clear-failed-jobs",
      title: "Очистить упавшие задания",
      desc: "Удаляет все задания со статусом failed из очереди импорта.",
      icon: "🗑",
      color: "text-yellow-400",
    },
    {
      id: "test-db",
      title: "Проверить базу данных",
      desc: "Выполняет тестовые запросы к PostgreSQL и показывает статистику.",
      icon: "🗄",
      color: "text-blue-400",
    },
    {
      id: "clear-old-logs",
      title: "Очистить старые логи",
      desc: "Удаляет системные логи старше 90 дней для освобождения места.",
      icon: "🧹",
      color: "text-gray-400",
    },
    {
      id: "clear-old-analytics",
      title: "Очистить старую аналитику",
      desc: "Удаляет данные PageView и AnalyticsEvent старше 90 дней.",
      icon: "📊",
      color: "text-gray-400",
    },
    {
      id: "pause-queue",
      title: "Приостановить очередь",
      desc: "Останавливает обработку новых заданий импорта. Текущие задания не прерываются.",
      icon: "⏸",
      color: "text-yellow-400",
    },
    {
      id: "resume-queue",
      title: "Возобновить очередь",
      desc: "Возобновляет обработку заданий после паузы.",
      icon: "▶️",
      color: "text-emerald-400",
    },
  ]

  return (
    <div className="space-y-3 max-w-2xl">
      <div className="card p-4 border-amber-500/20 mb-4">
        <p className="text-amber-400 text-sm">⚠️ Все действия записываются в журнал системы и не могут быть отменены</p>
      </div>
      {actions.map(a => (
        <div key={a.id} className="card p-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">{a.icon}</span>
            <div>
              <p className={`font-medium ${a.color}`}>{a.title}</p>
              <p className="text-gray-500 text-xs mt-1">{a.desc}</p>
              {results[a.id] && (
                <p className={`text-xs mt-2 font-medium ${results[a.id].ok ? "text-emerald-400" : "text-red-400"}`}>
                  {results[a.id].ok ? "✓ " : "✗ "}{results[a.id].message}
                </p>
              )}
              {results[a.id]?.details && (
                <pre className="text-[10px] text-gray-500 mt-1 bg-black/20 rounded p-2 max-w-sm overflow-x-auto">
                  {JSON.stringify(results[a.id].details, null, 2)}
                </pre>
              )}
            </div>
          </div>
          <button onClick={() => run(a.id)} disabled={loading === a.id}
            className="btn-ghost text-sm py-2 px-4 flex-shrink-0 disabled:opacity-50">
            {loading === a.id ? "⏳" : "▶"} Запустить
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
type TabKey = "dashboard" | "logs" | "diagnostics" | "actions"

export default function MonitoringPage() {
  const [tab, setTab] = useState<TabKey>("dashboard")
  const [logsData, setLogsData] = useState<LogsData | null>(null)
  const [loadingDash, setLoadingDash] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const loadDashboard = useCallback(async () => {
    setLoadingDash(true)
    const res = await fetch("/api/admin/monitoring/logs?page=1")
    if (res.ok) { setLogsData(await res.json()); setLastRefresh(new Date()) }
    setLoadingDash(false)
  }, [])

  useEffect(() => { loadDashboard() }, [loadDashboard])
  useEffect(() => {
    const t = setInterval(loadDashboard, 30_000)
    return () => clearInterval(t)
  }, [loadDashboard])

  const newErrors = logsData?.stats.newTotal ?? 0

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Мониторинг системы</h1>
          <p className="text-gray-500 text-sm mt-1">
            {lastRefresh ? `Обновлено: ${lastRefresh.toLocaleTimeString("ru-RU")}` : "Загрузка..."}
          </p>
        </div>
        <button onClick={loadDashboard} disabled={loadingDash}
          className="btn-ghost text-sm py-2 px-4 disabled:opacity-50">
          {loadingDash ? "↻ ..." : "↻ Обновить"}
        </button>
      </div>

      {/* Error alert */}
      {newErrors > 0 && (
        <div className="card p-4 border-red-500/30 mb-5 flex items-center gap-3">
          <span className="text-2xl">🔴</span>
          <div>
            <p className="text-red-400 font-semibold">{newErrors} нерешённых ошибок</p>
            <p className="text-gray-500 text-xs">Перейдите в Журнал для просмотра и обработки</p>
          </div>
          <button onClick={() => setTab("logs")} className="ml-auto btn-ghost text-sm py-1.5 px-4 text-red-400">Открыть →</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white/5 rounded-xl p-1 overflow-x-auto">
        <TabBtn active={tab === "dashboard"} onClick={() => setTab("dashboard")}>📊 Обзор</TabBtn>
        <TabBtn active={tab === "logs"} onClick={() => setTab("logs")} badge={newErrors}>📋 Журнал ошибок</TabBtn>
        <TabBtn active={tab === "diagnostics"} onClick={() => setTab("diagnostics")}>🔍 Диагностика</TabBtn>
        <TabBtn active={tab === "actions"} onClick={() => setTab("actions")}>⚡ Действия</TabBtn>
      </div>

      {tab === "dashboard" && (
        <DashboardTab stats={logsData?.stats ?? null} logs={logsData?.logs ?? []} />
      )}
      {tab === "logs" && <LogsTab />}
      {tab === "diagnostics" && <DiagnosticsTab />}
      {tab === "actions" && <ActionsTab />}
    </div>
  )
}
