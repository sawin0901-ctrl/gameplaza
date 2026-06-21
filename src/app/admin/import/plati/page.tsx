"use client"
import { useState, useEffect, useCallback } from "react"

type Tab = "import" | "bulk" | "range" | "history" | "errors"

interface QueueStats { waiting: number; active: number; completed: number; failed: number; delayed: number }
interface LogEntry {
  id: string; url: string; productId?: number; productName?: string
  status: string; error?: string; duration?: number; source: string; createdAt: string
}
interface LogStats { queued: number; success: number; updated: number; error: number; not_found: number; duplicate: number }

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  queued:    { label: "В очереди",   color: "text-yellow-400 bg-yellow-400/10" },
  success:   { label: "Импортирован", color: "text-emerald-400 bg-emerald-400/10" },
  updated:   { label: "Обновлён",    color: "text-blue-400 bg-blue-400/10" },
  error:     { label: "Ошибка",      color: "text-red-400 bg-red-400/10" },
  not_found: { label: "Не найден",   color: "text-gray-400 bg-gray-400/10" },
  duplicate: { label: "Дубликат",    color: "text-purple-400 bg-purple-400/10" },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, color: "text-gray-400 bg-gray-400/10" }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-[var(--card)] border border-[var(--border)] rounded-xl ${className}`}>{children}</div>
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
      active ? "bg-brand text-white" : "text-[var(--text-3)] hover:text-[var(--text)] hover:bg-white/5"
    }`}>{children}</button>
  )
}

// ── Queue Widget ─────────────────────────────────────────────────────────────
function QueueWidget() {
  const [stats, setStats] = useState<QueueStats | null>(null)

  async function load() {
    try {
      const r = await fetch("/api/admin/import/plati/queue")
      if (r.ok) setStats(await r.json())
    } catch {}
  }

  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t) }, [])

  if (!stats) return null
  const total = stats.waiting + stats.active + stats.delayed
  return (
    <Card className="p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-[var(--text)]">Очередь импорта</p>
        <button onClick={load} className="text-xs text-[var(--text-3)] hover:text-[var(--text)]">↻ обновить</button>
      </div>
      <div className="grid grid-cols-5 gap-3 text-center">
        {[
          { label: "Ожидает", v: stats.waiting, c: total > 0 ? "text-yellow-400" : "text-[var(--text-3)]" },
          { label: "Активно", v: stats.active,    c: stats.active > 0 ? "text-brand" : "text-[var(--text-3)]" },
          { label: "Отложено", v: stats.delayed,  c: "text-[var(--text-3)]" },
          { label: "Готово",  v: stats.completed, c: "text-emerald-400" },
          { label: "Ошибки",  v: stats.failed,    c: stats.failed > 0 ? "text-red-400" : "text-[var(--text-3)]" },
        ].map(s => (
          <div key={s.label}>
            <div className={`text-xl font-bold ${s.c}`}>{s.v}</div>
            <div className="text-[10px] text-[var(--text-3)] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
      {stats.active > 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-brand">
          <span className="w-2 h-2 rounded-full bg-brand animate-pulse"></span>
          Импорт выполняется...
        </div>
      )}
    </Card>
  )
}

// ── Tab 1+2: Import (single / bulk) ─────────────────────────────────────────
function ImportTab() {
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function doImport() {
    const t = text.trim()
    if (!t) return setError("Вставьте ссылку или ID товара")
    setLoading(true); setResult(null); setError(null)
    try {
      const res = await fetch("/api/admin/import/plati", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t }),
      })
      const data = await res.json()
      if (res.ok) setResult(data)
      else setError(data.error ?? "Ошибка импорта")
    } catch (e) { setError(e instanceof Error ? e.message : "Ошибка соединения") }
    setLoading(false)
  }

  const lineCount = text.split("\n").filter(l => l.trim()).length

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="font-semibold text-[var(--text)] mb-1">Импорт по ссылке / ID</h3>
        <p className="text-xs text-[var(--text-3)] mb-4">
          Вставьте одну или несколько ссылок (по одной на строку) или ID товаров с Plati.Market
        </p>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={"https://plati.market/itm/5927800\nhttps://plati.market/itm/5927801\n5927802"}
          rows={6}
          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text)] font-mono resize-none focus:outline-none focus:border-brand"
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-[var(--text-3)]">
            {lineCount > 0 ? `${lineCount} строк(а)` : ""}
          </span>
          <button
            onClick={doImport} disabled={loading || !text.trim()}
            className="px-5 py-2 bg-brand text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-brand/90 transition-colors"
          >
            {loading ? "⏳ Добавляю в очередь..." : "⬇️ Импортировать"}
          </button>
        </div>
      </Card>

      {error && (
        <Card className="p-4 border-red-500/30">
          <p className="text-red-400 text-sm">❌ {error}</p>
        </Card>
      )}

      {result && (
        <Card className="p-5 border-emerald-500/20 space-y-3">
          <p className="font-semibold text-emerald-400">
            ✅ Добавлено в очередь: {result.scheduled as number} товар(ов)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "В очереди",  v: result.scheduled  as number, c: "text-brand" },
              { label: "Дубликаты", v: result.duplicates as number, c: "text-yellow-400" },
              { label: "Неверных",  v: result.invalid    as number, c: "text-red-400" },
              { label: "Всего",     v: result.total      as number, c: "text-[var(--text)]" },
            ].map(s => (
              <div key={s.label} className="bg-white/5 rounded-xl p-3 text-center">
                <div className={`text-2xl font-bold ${s.c}`}>{s.v}</div>
                <div className="text-xs text-[var(--text-3)] mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          {(result.duplicateList as unknown[])?.length > 0 && (
            <div>
              <p className="text-xs text-[var(--text-3)] mb-1">Уже существуют:</p>
              <div className="space-y-1">
                {(result.duplicateList as Array<{ id: number; name?: string; active?: boolean }>).map(d => (
                  <div key={d.id} className="flex items-center gap-2 text-xs">
                    <span className="text-[var(--text-3)] font-mono">#{d.id}</span>
                    <span className="text-[var(--text-2)]">{d.name ?? "—"}</span>
                    <span className={d.active ? "text-emerald-400" : "text-gray-500"}>{d.active ? "активен" : "скрыт"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(result.truncated as number) > 0 && (
            <p className="text-xs text-yellow-400">⚠️ Ещё {result.truncated as number} ID пропущено (лимит 200 за раз)</p>
          )}
          <p className="text-xs text-[var(--text-3)]">
            Товары добавляются в очередь с задержкой 3 сек между запросами, чтобы не перегружать Plati.Market.
          </p>
        </Card>
      )}

      {/* Hint */}
      <Card className="p-4">
        <p className="text-xs font-medium text-[var(--text-2)] mb-2">Поддерживаемые форматы:</p>
        <div className="space-y-1 font-mono text-xs text-[var(--text-3)]">
          <p>https://plati.market/itm/5927800</p>
          <p>https://plati.market/itm/название-товара/5927800</p>
          <p>5927800 <span className="font-sans text-[var(--text-3)]">(просто ID)</span></p>
        </div>
      </Card>
    </div>
  )
}

// ── Tab 3: Range Import ──────────────────────────────────────────────────────
function RangeTab() {
  const [from, setFrom] = useState("")
  const [to, setTo]     = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<Record<string, unknown> | null>(null)
  const [error, setError]     = useState<string | null>(null)

  const rangeSize = from && to ? Math.max(0, parseInt(to) - parseInt(from) + 1) : 0

  async function doRange() {
    const f = parseInt(from)
    const t = parseInt(to)
    if (!f || !t) return setError("Введите оба числа")
    if (f > t) return setError("От должен быть меньше До")
    if (t - f + 1 > 500) return setError("Максимальный диапазон — 500 ID. Разбейте на несколько запросов.")
    setLoading(true); setResult(null); setError(null)
    try {
      const res = await fetch("/api/admin/import/plati/range", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: f, to: t }),
      })
      const data = await res.json()
      if (res.ok) setResult(data)
      else setError(data.error ?? "Ошибка")
    } catch (e) { setError(e instanceof Error ? e.message : "Ошибка") }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="font-semibold text-[var(--text)] mb-1">Импорт диапазона ID</h3>
        <p className="text-xs text-[var(--text-3)] mb-4">
          Система проверит каждый ID в диапазоне и импортирует только найденные товары. Максимум 500 ID за раз.
        </p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs text-[var(--text-3)] mb-1">ID с (включительно)</label>
            <input
              type="number" value={from} onChange={e => setFrom(e.target.value)}
              placeholder="5927800"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text)] font-mono focus:outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-3)] mb-1">ID по (включительно)</label>
            <input
              type="number" value={to} onChange={e => setTo(e.target.value)}
              placeholder="5928000"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text)] font-mono focus:outline-none focus:border-brand"
            />
          </div>
        </div>

        {rangeSize > 0 && (
          <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${rangeSize > 500 ? "bg-red-500/10 text-red-400" : "bg-[var(--bg-secondary)] text-[var(--text-2)]"}`}>
            Диапазон: <strong>{rangeSize}</strong> ID
            {rangeSize <= 500 && <> · ~{Math.ceil(rangeSize * 4 / 60)} мин</>}
            {rangeSize > 500 && " — слишком большой"}
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={doRange}
            disabled={loading || !from || !to || rangeSize > 500 || rangeSize <= 0}
            className="px-5 py-2 bg-brand text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-brand/90 transition-colors"
          >
            {loading ? "⏳ Добавляю..." : "🔍 Импортировать диапазон"}
          </button>
        </div>
      </Card>

      {error && (
        <Card className="p-4 border-red-500/30">
          <p className="text-red-400 text-sm">❌ {error}</p>
        </Card>
      )}

      {result && (
        <Card className="p-5 border-emerald-500/20">
          <p className="font-semibold text-emerald-400 mb-3">✅ Запущен импорт диапазона</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Добавлено",   v: result.scheduled as number, c: "text-brand" },
              { label: "Пропущено",  v: result.skipped   as number, c: "text-yellow-400" },
              { label: "Всего в диап.", v: result.total  as number, c: "text-[var(--text)]" },
            ].map(s => (
              <div key={s.label} className="bg-white/5 rounded-xl p-3">
                <div className={`text-2xl font-bold ${s.c}`}>{s.v}</div>
                <div className="text-xs text-[var(--text-3)] mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          {(result.estimatedMinutes as number) > 0 && (
            <p className="text-xs text-[var(--text-3)] mt-3">
              ⏱ Примерное время: ~{result.estimatedMinutes as number} мин
            </p>
          )}
        </Card>
      )}
    </div>
  )
}

// ── Tab 4+5: History / Errors ────────────────────────────────────────────────
function HistoryTab({ errorsOnly = false }: { errorsOnly?: boolean }) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [stats, setStats] = useState<LogStats | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [updateMsg, setUpdateMsg] = useState("")

  const load = useCallback(async (p = page) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p) })
    if (errorsOnly) params.set("status", "error")
    try {
      const r = await fetch("/api/admin/import/plati/logs?" + params)
      if (r.ok) {
        const data = await r.json()
        setLogs(data.logs); setTotal(data.total)
        setPage(data.page); setPages(data.pages)
        if (data.stats) setStats(data.stats)
      }
    } catch {}
    setLoading(false)
  }, [page, errorsOnly])

  useEffect(() => { load(1) }, [errorsOnly])

  async function triggerUpdate() {
    setUpdateLoading(true); setUpdateMsg("")
    try {
      const r = await fetch("/api/admin/import/plati/update", { method: "POST" })
      const d = await r.json()
      setUpdateMsg(r.ok ? `✅ Запущено обновление ${d.queued} товаров` : `❌ ${d.error ?? "Ошибка"}`)
    } catch { setUpdateMsg("❌ Ошибка запроса") }
    setUpdateLoading(false)
  }

  return (
    <div className="space-y-4">
      {!errorsOnly && stats && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { label: "Импортировано", v: stats.success,   c: "text-emerald-400" },
            { label: "Обновлено",     v: stats.updated,   c: "text-blue-400" },
            { label: "В очереди",     v: stats.queued,    c: "text-yellow-400" },
            { label: "Ошибки",        v: stats.error,     c: "text-red-400" },
            { label: "Не найдено",    v: stats.not_found, c: "text-gray-400" },
            { label: "Дубликаты",     v: stats.duplicate, c: "text-purple-400" },
          ].map(s => (
            <Card key={s.label} className="p-3 text-center">
              <div className={`text-xl font-bold ${s.c}`}>{s.v}</div>
              <div className="text-[10px] text-[var(--text-3)] mt-0.5">{s.label}</div>
            </Card>
          ))}
        </div>
      )}

      {!errorsOnly && (
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--text)]">Обновить все товары Plati.Market</p>
            <p className="text-xs text-[var(--text-3)] mt-0.5">Повторно получит цены и наличие. Авто-обновление каждые 6 часов.</p>
          </div>
          <button
            onClick={triggerUpdate} disabled={updateLoading}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {updateLoading ? "⏳..." : "🔄 Обновить сейчас"}
          </button>
        </Card>
      )}
      {updateMsg && <p className="text-sm text-[var(--text-2)]">{updateMsg}</p>}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <p className="text-sm font-medium text-[var(--text)]">
            {errorsOnly ? "Ошибки импорта" : "История импорта"} · {total}
          </p>
          <button onClick={() => load(1)} disabled={loading} className="text-xs text-[var(--text-3)] hover:text-[var(--text)]">
            {loading ? "..." : "↻ обновить"}
          </button>
        </div>

        {loading && logs.length === 0 ? (
          <p className="text-center text-[var(--text-3)] py-12 text-sm">Загрузка...</p>
        ) : logs.length === 0 ? (
          <p className="text-center text-[var(--text-3)] py-12 text-sm">Записей нет</p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {logs.map(log => (
              <div key={log.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={log.status} />
                      <span className="text-xs text-[var(--text-3)] font-mono">#{log.productId}</span>
                      {log.productName && (
                        <a href={`/product/${log.productId}`} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-[var(--text)] hover:text-brand truncate max-w-xs">
                          {log.productName}
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <a href={log.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-[var(--text-3)] hover:text-brand font-mono truncate max-w-xs">
                        {log.url}
                      </a>
                      <span className="text-xs text-[var(--text-3)]">
                        {new Date(log.createdAt).toLocaleString("ru")}
                      </span>
                      {log.duration && (
                        <span className="text-xs text-[var(--text-3)]">{(log.duration / 1000).toFixed(1)}с</span>
                      )}
                      <span className="text-xs text-[var(--text-3)] bg-[var(--bg-secondary)] px-1.5 rounded">{log.source}</span>
                    </div>
                    {log.error && (
                      <p className="text-xs text-red-400 mt-1 font-mono truncate">{log.error}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t border-[var(--border)]">
            <button onClick={() => load(page - 1)} disabled={page <= 1 || loading}
              className="px-3 py-1 text-sm border border-[var(--border)] rounded-lg disabled:opacity-40 hover:bg-[var(--bg-secondary)]">
              ←
            </button>
            <span className="text-sm text-[var(--text-3)]">{page} / {pages}</span>
            <button onClick={() => load(page + 1)} disabled={page >= pages || loading}
              className="px-3 py-1 text-sm border border-[var(--border)] rounded-lg disabled:opacity-40 hover:bg-[var(--bg-secondary)]">
              →
            </button>
          </div>
        )}
      </Card>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function PlatiImportPage() {
  const [tab, setTab] = useState<Tab>("import")

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text)]">Импорт товаров Plati.Market</h1>
        <p className="text-[var(--text-3)] text-sm mt-1">
          Скрапинг карточек товаров напрямую со страниц Plati.Market. Автоматическое обновление каждые 6 часов.
        </p>
      </div>

      <QueueWidget />

      <div className="flex gap-1.5 flex-wrap mb-6">
        <TabBtn active={tab === "import"} onClick={() => setTab("import")}>⬇️ Импорт по ссылке</TabBtn>
        <TabBtn active={tab === "bulk"}   onClick={() => setTab("bulk")}>📋 Массовый импорт</TabBtn>
        <TabBtn active={tab === "range"}  onClick={() => setTab("range")}>🔢 Диапазон ID</TabBtn>
        <TabBtn active={tab === "history"} onClick={() => setTab("history")}>📜 История</TabBtn>
        <TabBtn active={tab === "errors"} onClick={() => setTab("errors")}>❌ Ошибки</TabBtn>
      </div>

      {tab === "import"  && <ImportTab />}
      {tab === "bulk"    && <ImportTab />}
      {tab === "range"   && <RangeTab />}
      {tab === "history" && <HistoryTab />}
      {tab === "errors"  && <HistoryTab errorsOnly />}
    </div>
  )
}
