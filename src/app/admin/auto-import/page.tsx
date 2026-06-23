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
  idle: "Ожидание", running: "Работает", paused: "Пауза", completed: "Завершён",
}
const STATUS_COLOR: Record<string, string> = {
  idle: "bg-gray-500/20 text-gray-400",
  running: "bg-green-500/20 text-green-400",
  paused: "bg-yellow-500/20 text-yellow-400",
  completed: "bg-blue-500/20 text-blue-400",
}
const LOG_ICON: Record<string, string> = {
  success: "✓", error: "✗", skipped: "○", duplicate: "=",
}
const LOG_COLOR: Record<string, string> = {
  success: "text-green-500", error: "text-red-500", skipped: "text-[var(--text-3)]", duplicate: "text-yellow-500",
}

function fmtDur(ms: number | null) {
  if (!ms) return "—"
  return ms < 1000 ? `${ms}мс` : `${(ms / 1000).toFixed(1)}с`
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}
function calcEta(s: Session): string {
  const done = s.doneCount + s.errorCount + s.skipCount + s.dupCount
  const remaining = s.mode === "range"
    ? Math.max(0, s.endId - (s.currentId || s.startId))
    : Math.max(0, s.totalCount - done)
  if (remaining === 0) return "—"
  const h = Math.floor(remaining / 60), m = remaining % 60
  return h > 0 ? `~${h}ч ${m}м` : `~${m}м`
}
function calcPct(s: Session): number {
  if (s.totalCount === 0) return 0
  const done = s.doneCount + s.errorCount + s.skipCount + s.dupCount
  if (s.mode === "range") {
    return Math.min(100, Math.round(((s.currentId || s.startId) - s.startId) / s.totalCount * 100))
  }
  return Math.min(100, Math.round(done / s.totalCount * 100))
}

export default function AutoImportPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<"list" | "range">("list")
  const [idsText, setIdsText] = useState("")
  const [startId, setStartId] = useState("")
  const [endId, setEndId] = useState("")
  const [err, setErr] = useState("")
  const [delay, setDelay] = useState("10")
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchStatus = async () => {
    try {
      const r = await fetch("/api/admin/auto-import")
      if (r.ok) { const d = await r.json(); setSession(d.session ?? null); setLogs(d.logs ?? []) }
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => {
    fetchStatus()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(fetchStatus, session?.status === "running" ? 10000 : 30000)
  }, [session?.status])

  const act = async (url: string, body?: object) => {
    setBusy(true); setErr("")
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined })
      const d = await r.json()
      if (!r.ok) { setErr(d.error ?? "Ошибка"); return }
      await fetchStatus()
    } catch (e) { setErr(String(e)) } finally { setBusy(false) }
  }

  const handleStart = () => tab === "range"
    ? act("/api/admin/auto-import/start", { mode: "range", startId, endId, delaySeconds: delay })
    : act("/api/admin/auto-import/start", { mode: "list", ids: idsText, delaySeconds: delay })

  const isActive = session && (session.status === "running" || session.status === "paused")
  const pct = session ? calcPct(session) : 0
  const done = session ? session.doneCount + session.errorCount + session.skipCount + session.dupCount : 0

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Автоматический импорт товаров</h1>
        <p className="text-[var(--text-3)] text-sm mt-1">Настраиваемая задержка между товарами · Состояние в БД · Продолжается после перезапуска</p>
      </div>

      {loading ? (
        <p className="text-[var(--text-3)]">Загрузка...</p>
      ) : (
        <>
          {session && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLOR[session.status] ?? ""}`}>
                    {session.status === "running" && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
                    {STATUS_LABEL[session.status] ?? session.status}
                  </span>
                  <span className="text-[var(--text-3)] text-sm">
                    {session.mode === "range"
                      ? `Диапазон: ${session.startId.toLocaleString()} — ${session.endId.toLocaleString()}`
                      : `Список: ${session.totalCount.toLocaleString()} товаров`}
                  </span>
                  <span className="text-[var(--text-3)] text-sm">· {session.delaySeconds}с между товарами</span>
                </div>
                <div className="flex gap-2">
                  {session.status === "running" && (
                    <button onClick={() => act("/api/admin/auto-import/pause")} disabled={busy}
                      className="px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 rounded-lg text-sm disabled:opacity-50 transition-colors">
                      ⏸ Пауза
                    </button>
                  )}
                  {session.status === "paused" && (
                    <button onClick={() => act("/api/admin/auto-import/resume")} disabled={busy}
                      className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/30 rounded-lg text-sm disabled:opacity-50 transition-colors">
                      ▶ Продолжить
                    </button>
                  )}
                  <button onClick={() => { if (confirm("Сбросить весь импорт?")) act("/api/admin/auto-import/reset") }} disabled={busy}
                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-lg text-sm disabled:opacity-50 transition-colors">
                    ✕ Сбросить
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-[var(--text-3)] mb-1.5">
                  <span>{pct}% · обработано {done.toLocaleString()} из {session.totalCount.toLocaleString()}</span>
                  <span>ETA: {calcEta(session)}</span>
                </div>
                <div className="w-full bg-[var(--border)] rounded-full h-2">
                  <div className="bg-brand h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Импортировано", value: session.doneCount, cls: "text-green-500" },
                  { label: "Ошибки", value: session.errorCount, cls: "text-red-500" },
                  { label: "Пропущено", value: session.skipCount, cls: "text-[var(--text-3)]" },
                  { label: "Дубликаты", value: session.dupCount, cls: "text-yellow-500" },
                ].map(s => (
                  <div key={s.label} className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-3 text-center">
                    <div className={`text-xl font-bold ${s.cls}`}>{s.value.toLocaleString()}</div>
                    <div className="text-[var(--text-3)] text-xs mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isActive && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 space-y-4">
              <h2 className="font-semibold text-[var(--text)]">
                {session?.status === "completed" ? "Запустить новый импорт" : "Запустить импорт"}
              </h2>

              <div className="flex gap-0 border-b border-[var(--border)]">
                {(["list", "range"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
                      tab === t
                        ? "border-brand text-brand font-medium"
                        : "border-transparent text-[var(--text-3)] hover:text-[var(--text)]"
                    }`}>
                    {t === "list" ? "Список ID" : "Диапазон"}
                  </button>
                ))}
              </div>

              {tab === "list" ? (
                <div className="space-y-2">
                  <label className="text-sm text-[var(--text-2)]">ID товаров с Plati.Market (по одному или через запятую/пробел)</label>
                  <textarea
                    value={idsText}
                    onChange={e => setIdsText(e.target.value)}
                    rows={7}
                    placeholder={"3456789\n3456790\nhttps://plati.market/itm/3456791\n..."}
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg p-3 text-[var(--text)] font-mono text-sm resize-y focus:border-brand focus:outline-none"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="text-sm text-[var(--text-2)]">Диапазон ID на Plati.Market (система проверит каждый ID по очереди)</label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-[var(--text-3)] mb-1 block">ID начала</label>
                      <input type="number" value={startId} onChange={e => setStartId(e.target.value)}
                        placeholder="например 3000000"
                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--text)] focus:border-brand focus:outline-none" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-[var(--text-3)] mb-1 block">ID конца</label>
                      <input type="number" value={endId} onChange={e => setEndId(e.target.value)}
                        placeholder="например 3100000"
                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--text)] focus:border-brand focus:outline-none" />
                    </div>
                  </div>
                  {startId && endId && !isNaN(+endId) && +endId >= +startId && (
                    <p className="text-xs text-[var(--text-3)]">
                      Всего: {(+endId - +startId + 1).toLocaleString()} ID · ~{Math.round((+endId - +startId + 1) / 60)}ч
                    </p>
                  )}
                </div>
              )}

              {/* Delay setting */}
              <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4 space-y-2">
                <label className="text-sm font-medium text-[var(--text)]">Задержка между товарами</label>
                <div className="flex items-center gap-3 flex-wrap">
                  {[["5с", "5"], ["10с", "10"], ["30с", "30"], ["1м", "60"], ["2м", "120"], ["5м", "300"]].map(([label, val]) => (
                    <button key={val} onClick={() => setDelay(val)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        delay === val
                          ? "bg-brand text-white border-brand"
                          : "bg-[var(--bg-secondary)] text-[var(--text-2)] border-[var(--border)] hover:border-brand"
                      }`}>
                      {label}
                    </button>
                  ))}
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min={5} max={3600} value={delay}
                      onChange={e => setDelay(e.target.value)}
                      className="w-20 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-[var(--text)] focus:border-brand focus:outline-none text-center"
                    />
                    <span className="text-xs text-[var(--text-3)]">сек</span>
                  </div>
                </div>
                <p className="text-xs text-[var(--text-3)]">
                  {+delay < 60
                    ? `~${Math.floor(240 / +delay)} товаров за вызов cron`
                    : `~${Math.max(1, Math.floor(240 / +delay))} товар за вызов cron`}
                  {" · "}скорость: {+delay <= 1 ? "макс" : `1 товар каждые ${+delay}с`}
                </p>
              </div>

              {err && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-500 text-sm">{err}</div>
              )}

              <button onClick={handleStart} disabled={busy}
                className="w-full py-2.5 bg-brand hover:bg-brand/90 text-white rounded-lg font-medium disabled:opacity-50 transition-colors">
                {busy ? "Запуск..." : "▶ Запустить импорт"}
              </button>

              <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-4 text-sm text-[var(--text-3)] space-y-1">
                <p>• Импорт работает в фоне через cron (вызывается каждую минуту)</p>
                <p>• Прогресс сохраняется в БД и переживает любые перезапуски</p>
                <p>• Товары, уже импортированные ранее, автоматически пропускаются</p>
                <p>• Ошибки логируются и импорт продолжается со следующего товара</p>
              </div>
            </div>
          )}

          {logs.length > 0 && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                <h3 className="font-semibold text-[var(--text)]">Лог импорта</h3>
                <span className="text-[var(--text-3)] text-xs">Последние 50 записей · обновляется каждые 10с</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-xs text-[var(--text-3)]">
                      <th className="px-4 py-2 text-left">Время</th>
                      <th className="px-4 py-2 text-left">Plati ID</th>
                      <th className="px-4 py-2 text-left">Статус</th>
                      <th className="px-4 py-2 text-left">Товар / Причина</th>
                      <th className="px-4 py-2 text-right">Время</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log.id} className="border-b border-[var(--border)] hover:bg-[var(--bg)] transition-colors">
                        <td className="px-4 py-2 text-[var(--text-3)] whitespace-nowrap">{fmtTime(log.createdAt)}</td>
                        <td className="px-4 py-2 text-[var(--text-2)] font-mono">{log.platiId}</td>
                        <td className={`px-4 py-2 font-medium ${LOG_COLOR[log.status] ?? "text-[var(--text)]"}`}>
                          {LOG_ICON[log.status] ?? "?"} {log.status}
                        </td>
                        <td className="px-4 py-2 text-[var(--text-2)] max-w-xs truncate">
                          {log.productName ?? log.errorMsg ?? "—"}
                        </td>
                        <td className="px-4 py-2 text-[var(--text-3)] text-right whitespace-nowrap">{fmtDur(log.duration)}</td>
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