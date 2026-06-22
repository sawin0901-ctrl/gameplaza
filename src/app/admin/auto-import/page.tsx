"use client"

import { useEffect, useRef, useState } from "react"

type Session = {
  id: string
  status: string
  mode: string
  startId: number
  endId: number
  currentId: number
  totalCount: number
  doneCount: number
  errorCount: number
  skipCount: number
  dupCount: number
  createdAt: string
  updatedAt: string
}

type LogEntry = {
  id: string
  platiId: number
  status: string
  productName: string | null
  errorMsg: string | null
  duration: number | null
  createdAt: string
}

const STATUS_LABEL: Record<string, string> = {
  idle: "Ожидание",
  running: "Работает",
  paused: "Пауза",
  completed: "Завершён",
}

const STATUS_COLOR: Record<string, string> = {
  idle: "bg-gray-700 text-gray-300",
  running: "bg-green-700 text-green-100",
  paused: "bg-yellow-700 text-yellow-100",
  completed: "bg-blue-700 text-blue-100",
}

const LOG_COLOR: Record<string, string> = {
  success: "text-green-400",
  error: "text-red-400",
  skipped: "text-gray-400",
  duplicate: "text-yellow-400",
  processing: "text-blue-400",
}

function fmtDuration(ms: number | null) {
  if (!ms) return "—"
  if (ms < 1000) return `${ms}мс`
  return `${(ms / 1000).toFixed(1)}с`
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function eta(session: Session): string {
  const done = session.doneCount + session.errorCount + session.skipCount + session.dupCount
  let remaining: number
  if (session.mode === "range") {
    remaining = Math.max(0, session.endId - (session.currentId || session.startId))
  } else {
    remaining = Math.max(0, session.totalCount - done)
  }
  if (remaining === 0) return "—"
  const secs = remaining * 60
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `~${h}ч ${m}м`
  return `~${m}м`
}

function progress(session: Session): number {
  if (session.totalCount === 0) return 0
  const done = session.doneCount + session.errorCount + session.skipCount + session.dupCount
  if (session.mode === "range") {
    const processed = (session.currentId || session.startId) - session.startId
    return Math.min(100, Math.round((processed / session.totalCount) * 100))
  }
  return Math.min(100, Math.round((done / session.totalCount) * 100))
}

export default function AutoImportPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [tab, setTab] = useState<"list" | "range">("list")
  const [idsText, setIdsText] = useState("")
  const [startId, setStartId] = useState("")
  const [endId, setEndId] = useState("")
  const [error, setError] = useState("")
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchStatus = async () => {
    try {
      const r = await fetch("/api/admin/auto-import")
      if (!r.ok) return
      const data = await r.json()
      setSession(data.session ?? null)
      setLogs(data.logs ?? [])
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const tick = () => {
      const interval = session?.status === "running" ? 10000 : 30000
      return interval
    }
    intervalRef.current = setInterval(fetchStatus, 10000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    const interval = session?.status === "running" ? 10000 : 30000
    intervalRef.current = setInterval(fetchStatus, interval)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [session?.status])

  const doAction = async (url: string, body?: object) => {
    setActionLoading(true)
    setError("")
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await r.json()
      if (!r.ok) { setError(data.error ?? "Ошибка"); return }
      await fetchStatus()
    } catch (e) {
      setError(String(e))
    } finally {
      setActionLoading(false)
    }
  }

  const handleStart = () => {
    if (tab === "range") {
      doAction("/api/admin/auto-import/start", { mode: "range", startId, endId })
    } else {
      doAction("/api/admin/auto-import/start", { mode: "list", ids: idsText })
    }
  }

  const isActive = session && (session.status === "running" || session.status === "paused")
  const pct = session ? progress(session) : 0
  const done = session ? session.doneCount + session.errorCount + session.skipCount + session.dupCount : 0

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Автоматический импорт товаров</h1>
        <p className="text-gray-400 text-sm mt-1">1 товар в минуту · Состояние сохраняется в базе данных · Продолжается после перезапуска</p>
      </div>

      {loading ? (
        <div className="text-gray-400">Загрузка...</div>
      ) : (
        <>
          {session && (
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLOR[session.status] ?? "bg-gray-700 text-gray-300"}`}>
                    {session.status === "running" && <span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-1.5 animate-pulse" />}
                    {STATUS_LABEL[session.status] ?? session.status}
                  </span>
                  <span className="text-gray-400 text-sm">
                    {session.mode === "range"
                      ? `Диапазон: ${session.startId.toLocaleString()} — ${session.endId.toLocaleString()}`
                      : `Список: ${session.totalCount.toLocaleString()} товаров`}
                  </span>
                </div>
                <div className="flex gap-2">
                  {session.status === "running" && (
                    <button
                      onClick={() => doAction("/api/admin/auto-import/pause")}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm disabled:opacity-50"
                    >
                      ⏸ Пауза
                    </button>
                  )}
                  {session.status === "paused" && (
                    <button
                      onClick={() => doAction("/api/admin/auto-import/resume")}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm disabled:opacity-50"
                    >
                      ▶ Продолжить
                    </button>
                  )}
                  <button
                    onClick={() => { if (confirm("Сбросить всю очередь импорта?")) doAction("/api/admin/auto-import/reset") }}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg text-sm disabled:opacity-50"
                  >
                    ✕ Сбросить
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                  <span>{pct}% ({done.toLocaleString()} из {session.totalCount.toLocaleString()})</span>
                  <span>ETA: {eta(session)}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-purple-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                {[
                  { label: "Импортировано", value: session.doneCount, color: "text-green-400" },
                  { label: "Ошибки", value: session.errorCount, color: "text-red-400" },
                  { label: "Пропущено", value: session.skipCount, color: "text-gray-400" },
                  { label: "Дубликаты", value: session.dupCount, color: "text-yellow-400" },
                ].map(s => (
                  <div key={s.label} className="bg-gray-800 rounded-lg p-3">
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value.toLocaleString()}</div>
                    <div className="text-gray-400 text-xs mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isActive && (
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">
                {session?.status === "completed" ? "Запустить новый импорт" : "Запустить импорт"}
              </h2>

              <div className="flex gap-2 border-b border-gray-700 pb-0 mb-4">
                {(["list", "range"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-4 py-2 text-sm rounded-t-lg border-b-2 transition-colors ${
                      tab === t
                        ? "border-purple-500 text-purple-400 bg-gray-800"
                        : "border-transparent text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    {t === "list" ? "Список ID" : "Диапазон"}
                  </button>
                ))}
              </div>

              {tab === "list" ? (
                <div className="space-y-2">
                  <label className="text-gray-300 text-sm">ID товаров с Plati.Market (по одному на строку, или через запятую/пробел)</label>
                  <textarea
                    value={idsText}
                    onChange={e => setIdsText(e.target.value)}
                    rows={8}
                    placeholder={"3456789\n3456790\nhttps://plati.market/itm/3456791\n..."}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white font-mono text-sm resize-y focus:border-purple-500 focus:outline-none"
                  />
                  <p className="text-gray-500 text-xs">
                    Вставьте ID товаров или ссылки на товары Plati.Market. Система автоматически извлечёт ID.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="text-gray-300 text-sm">Диапазон ID на Plati.Market (система проверит каждый ID по очереди)</label>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-gray-400 text-xs mb-1 block">ID начала</label>
                      <input
                        type="number"
                        value={startId}
                        onChange={e => setStartId(e.target.value)}
                        placeholder="например 3000000"
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-gray-400 text-xs mb-1 block">ID конца</label>
                      <input
                        type="number"
                        value={endId}
                        onChange={e => setEndId(e.target.value)}
                        placeholder="например 3100000"
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  {startId && endId && parseInt(endId) >= parseInt(startId) && (
                    <p className="text-gray-500 text-xs">
                      Всего: {(parseInt(endId) - parseInt(startId) + 1).toLocaleString()} ID · ETA: ~{Math.round((parseInt(endId) - parseInt(startId) + 1) / 60)}ч
                    </p>
                  )}
                </div>
              )}

              {error && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 text-sm">{error}</div>
              )}

              <button
                onClick={handleStart}
                disabled={actionLoading}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
              >
                {actionLoading ? "Запуск..." : "▶ Запустить импорт"}
              </button>

              <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-400 space-y-1">
                <p>• Импорт работает в фоне — 1 товар в минуту через cron</p>
                <p>• Прогресс сохраняется в БД и переживает любые перезапуски</p>
                <p>• Товары, уже импортированные ранее, автоматически пропускаются</p>
                <p>• Ошибки логируются и импорт продолжается со следующего товара</p>
              </div>
            </div>
          )}

          {logs.length > 0 && (
            <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold text-white">Лог импорта</h3>
                <span className="text-gray-500 text-xs">Последние 50 записей</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 text-xs border-b border-gray-800">
                      <th className="px-4 py-2 text-left">Время</th>
                      <th className="px-4 py-2 text-left">Plati ID</th>
                      <th className="px-4 py-2 text-left">Статус</th>
                      <th className="px-4 py-2 text-left">Товар / Причина</th>
                      <th className="px-4 py-2 text-right">Время</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{fmtTime(log.createdAt)}</td>
                        <td className="px-4 py-2 text-gray-300 font-mono">{log.platiId}</td>
                        <td className={`px-4 py-2 font-medium ${LOG_COLOR[log.status] ?? "text-gray-300"}`}>
                          {log.status === "success" && "✓ Импорт"}
                          {log.status === "error" && "✗ Ошибка"}
                          {log.status === "skipped" && "○ Пропуск"}
                          {log.status === "duplicate" && "= Дубликат"}
                        </td>
                        <td className="px-4 py-2 text-gray-300 max-w-xs truncate">
                          {log.productName ?? log.errorMsg ?? "—"}
                        </td>
                        <td className="px-4 py-2 text-gray-500 text-right whitespace-nowrap">{fmtDuration(log.duration)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}