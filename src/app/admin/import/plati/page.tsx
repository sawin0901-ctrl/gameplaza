"use client"
import { useState, useEffect, useCallback, useRef } from "react"

type Tab = "import" | "range" | "history" | "errors"

interface QueueStats { waiting: number; active: number; completed: number; failed: number; delayed: number }
interface LogEntry {
  id: string; url: string; productId?: number; productName?: string
  status: string; error?: string; duration?: number; source: string; createdAt: string
}
interface LogStats { queued: number; success: number; updated: number; error: number; not_found: number; duplicate: number }
interface CheckResult {
  found: boolean; productId: number; allOk?: boolean; productUrl?: string
  product?: { id: string; slug: string; name: string; price: number; isActive: boolean; inStock: boolean; imageUrl?: string | null; galleryCount: number; hasCategory: boolean; categoryName?: string; hasSeo: boolean; importSource?: string | null; importedAt?: string }
  checks?: { name: string; ok: boolean; value?: string; error?: string }[]
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  queued:    { label: "В очереди",    color: "text-yellow-400 bg-yellow-400/10" },
  success:   { label: "Импортирован", color: "text-emerald-400 bg-emerald-400/10" },
  updated:   { label: "Обновлён",     color: "text-blue-400 bg-blue-400/10" },
  error:     { label: "Ошибка",       color: "text-red-400 bg-red-400/10" },
  not_found: { label: "Не найден",    color: "text-gray-400 bg-gray-400/10" },
  duplicate: { label: "Дубликат",     color: "text-purple-400 bg-purple-400/10" },
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

// ── Diagnostic Panel ─────────────────────────────────────────────────────────
function DiagPanel({ productId, autoCheck = false }: { productId: number; autoCheck?: boolean }) {
  const [result, setResult] = useState<CheckResult | null>(null)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const check = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/admin/import/plati/check?productId=${productId}`)
      if (r.ok) setResult(await r.json())
    } catch {}
    setLoading(false)
  }, [productId])

  useEffect(() => {
    if (!autoCheck) return
    // Wait 8 seconds for worker to process, then check
    timerRef.current = setTimeout(check, 8000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [autoCheck, check])

  const SITE = typeof window !== "undefined" ? window.location.origin.replace(":3000", "") : "https://gameplaza.site"

  if (!result && !loading && !autoCheck) {
    return (
      <button onClick={check} className="px-4 py-2 text-sm border border-[var(--border)] rounded-xl hover:bg-[var(--bg-secondary)] text-[var(--text-2)]">
        🔍 Проверить результат импорта
      </button>
    )
  }

  if (loading || (!result && autoCheck)) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--text-3)]">
        <span className="w-2 h-2 rounded-full bg-brand animate-pulse"></span>
        {autoCheck ? "Ждём обработки воркером (~8 сек)..." : "Проверяем..."}
      </div>
    )
  }

  if (!result) return null

  if (!result.found) {
    return (
      <Card className="p-4 border-red-500/30 space-y-2">
        <p className="text-red-400 font-medium text-sm">❌ Товар #{productId} не найден в базе данных</p>
        <p className="text-xs text-[var(--text-3)]">Возможно воркер ещё не обработал задание. Подождите и нажмите "Проверить" снова.</p>
        <button onClick={check} className="text-xs text-brand hover:underline">↻ Проверить снова</button>
      </Card>
    )
  }

  const passCount = result.checks?.filter(c => c.ok).length ?? 0
  const totalCount = result.checks?.length ?? 0

  return (
    <Card className={`p-5 space-y-4 ${result.allOk ? "border-emerald-500/20" : "border-yellow-500/20"}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={`font-semibold ${result.allOk ? "text-emerald-400" : "text-yellow-400"}`}>
            {result.allOk ? "✅ Импорт успешен" : `⚠️ Импорт завершён с замечаниями`}
          </p>
          <p className="text-[var(--text)] font-medium mt-0.5 truncate">{result.product?.name}</p>
          <p className="text-xs text-[var(--text-3)] mt-0.5">
            Проверок пройдено: {passCount} / {totalCount}
          </p>
        </div>
        <div className="text-right shrink-0">
          {result.product?.price !== undefined && (
            <p className="text-lg font-bold text-brand">{result.product.price} ₽</p>
          )}
          <StatusBadge status={result.product?.isActive ? "success" : "error"} />
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-1.5">
        {result.checks?.map((c, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span className={`shrink-0 font-bold ${c.ok ? "text-emerald-400" : "text-red-400"}`}>{c.ok ? "✅" : "❌"}</span>
            <div className="flex-1 min-w-0">
              <span className="text-[var(--text-2)]">{c.name}</span>
              {c.value && <span className="text-[var(--text-3)] ml-2 text-xs truncate">{c.value}</span>}
              {c.error && <p className="text-red-400 text-xs mt-0.5">{c.error}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      {result.productUrl && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border)]">
          <a
            href={result.productUrl} target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 bg-brand text-white rounded-xl text-sm font-medium hover:bg-brand/90 transition-colors"
          >
            👁️ Открыть карточку товара
          </a>
          <a
            href={`/admin/products?search=${result.productId}`} target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 border border-[var(--border)] text-[var(--text-2)] rounded-xl text-sm hover:bg-[var(--bg-secondary)] transition-colors"
          >
            ✏️ Редактировать
          </a>
          <button onClick={check} className="px-4 py-2 border border-[var(--border)] text-[var(--text-3)] rounded-xl text-sm hover:bg-[var(--bg-secondary)] transition-colors">
            ↻ Проверить снова
          </button>
        </div>
      )}

      {/* URL hint */}
      {result.productUrl && (
        <div className="bg-[var(--bg-secondary)] rounded-xl px-4 py-3">
          <p className="text-xs text-[var(--text-3)] mb-1">URL карточки товара:</p>
          <a href={result.productUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs text-brand font-mono hover:underline break-all">
            {SITE}{result.productUrl}
          </a>
        </div>
      )}

      {!result.product?.isActive && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
          <p className="text-yellow-400 text-sm font-medium">⚠️ Товар скрыт из каталога</p>
          <p className="text-xs text-[var(--text-3)] mt-1">
            Причина: {result.product?.price === 0 ? "цена = 0 ₽ (не удалось спарсить с Plati.Market)" : "нет в наличии"}.
            Установите цену вручную через страницу редактирования товара.
          </p>
        </div>
      )}
    </Card>
  )
}

// ── Queue Widget ─────────────────────────────────────────────────────────────
// ── Sync Prices Widget ────────────────────────────────────────────────────────
function SyncPricesWidget() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function doSync() {
    setLoading(true); setResult(null); setError(null)
    try {
      const res = await fetch("/api/admin/sync-prices", { method: "POST" })
      const data = await res.json()
      if (res.ok) setResult(data); else setError(data.error ?? "Ошибка")
    } catch (e) { setError(e instanceof Error ? e.message : "Ошибка") }
    setLoading(false)
  }

  return (
    <div className="p-4 mb-6 border border-blue-500/20 bg-white/5 rounded-2xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="font-semibold text-[var(--text)]">💱 Синхронизация цен с Digiseller</p>
          <p className="text-xs text-[var(--text-3)] mt-0.5">Обновляет цены всех активных товаров из каталога Digiseller</p>
        </div>
        <button onClick={doSync} disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-blue-700">
          {loading ? "⏳ Синхронизация..." : "🔄 Синхронизировать цены"}
        </button>
      </div>
      {error && <p className="text-red-400 text-sm mt-3">❌ {error}</p>}
      {result && (
        <div className="mt-3 grid grid-cols-4 gap-2 text-center text-sm">
          {[
            { label: "Обновлено",   v: result.updated as number,           c: "text-emerald-400" },
            { label: "Пропущено",   v: result.skipped as number,           c: "text-[var(--text-3)]" },
            { label: "Pub API",     v: result.fromPublicApi as number,     c: "text-blue-400" },
            { label: "Всего",       v: result.total as number,             c: "text-[var(--text)]" },
          ].map(s => (
            <div key={s.label} className="bg-white/5 rounded-xl p-2">
              <div className={`text-xl font-bold ${s.c}`}>{s.v}</div>
              <div className="text-xs text-[var(--text-3)]">{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function QueueWidget() {
  const [stats, setStats] = useState<QueueStats | null>(null)
  useEffect(() => {
    const load = async () => {
      try { const r = await fetch("/api/admin/import/plati/queue"); if (r.ok) setStats(await r.json()) } catch {}
    }
    load(); const t = setInterval(load, 5000); return () => clearInterval(t)
  }, [])
  if (!stats) return null
  const busy = stats.waiting + stats.active + stats.delayed
  return (
    <Card className="p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-[var(--text)]">Очередь импорта</p>
        {busy > 0 && <span className="flex items-center gap-1.5 text-xs text-brand"><span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse"></span>Работает</span>}
      </div>
      <div className="grid grid-cols-5 gap-3 text-center">
        {[
          { label: "Ожидает",  v: stats.waiting,   c: busy > 0 ? "text-yellow-400" : "text-[var(--text-3)]" },
          { label: "Активно",  v: stats.active,     c: stats.active > 0 ? "text-brand" : "text-[var(--text-3)]" },
          { label: "Отложено", v: stats.delayed,    c: "text-[var(--text-3)]" },
          { label: "Готово",   v: stats.completed,  c: "text-emerald-400" },
          { label: "Ошибки",   v: stats.failed,     c: stats.failed > 0 ? "text-red-400" : "text-[var(--text-3)]" },
        ].map(s => (
          <div key={s.label}>
            <div className={`text-xl font-bold ${s.c}`}>{s.v}</div>
            <div className="text-[10px] text-[var(--text-3)] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── Import Tab ───────────────────────────────────────────────────────────────
function ImportTab() {
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [scheduled, setScheduled] = useState<number[]>([])
  const [duplicates, setDuplicates] = useState<Array<{ id: number; name?: string; active?: boolean }>>([])
  const [error, setError] = useState<string | null>(null)
  const [rawResult, setRawResult] = useState<Record<string, unknown> | null>(null)

  async function doImport() {
    const t = text.trim()
    if (!t) return setError("Вставьте ссылку или ID товара")
    setLoading(true); setScheduled([]); setDuplicates([]); setError(null); setRawResult(null)
    try {
      const res = await fetch("/api/admin/import/plati", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t }),
      })
      const data = await res.json()
      if (res.ok) {
        setRawResult(data)
        // Extract IDs that were scheduled
        const lines = t.split(/[\n,;]+/).map(l => l.trim()).filter(Boolean)
        const ids: number[] = []
        for (const line of lines) {
          const m = line.match(/(\d{5,10})/)
          if (m) ids.push(parseInt(m[1]))
        }
        setScheduled(ids.slice(0, data.scheduled as number))
        setDuplicates((data.duplicateList as Array<{ id: number; name?: string; active?: boolean }>) ?? [])
      } else {
        setError(data.error ?? "Ошибка импорта")
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Ошибка соединения") }
    setLoading(false)
  }

  const lineCount = text.split("\n").filter(l => l.trim()).length

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="font-semibold text-[var(--text)] mb-1">Импорт по ссылке / ID</h3>
        <p className="text-xs text-[var(--text-3)] mb-4">
          Вставьте ссылку(и) с Plati.Market — по одной на строку, или просто ID товара
        </p>
        <textarea
          value={text} onChange={e => setText(e.target.value)}
          placeholder={"https://plati.market/itm/5927800\nhttps://plati.market/itm/5927801\n5927802"}
          rows={5}
          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text)] font-mono resize-none focus:outline-none focus:border-brand"
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-[var(--text-3)]">{lineCount > 0 ? `${lineCount} строк` : ""}</span>
          <button onClick={doImport} disabled={loading || !text.trim()}
            className="px-5 py-2 bg-brand text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-brand/90 transition-colors">
            {loading ? "⏳ Добавляю в очередь..." : "⬇️ Импортировать"}
          </button>
        </div>
      </Card>

      {error && (
        <Card className="p-4 border-red-500/30"><p className="text-red-400 text-sm">❌ {error}</p></Card>
      )}

      {rawResult && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Добавлено в очередь", v: rawResult.scheduled as number, c: "text-brand" },
              { label: "Дубликаты",           v: rawResult.duplicates as number, c: "text-yellow-400" },
              { label: "Неверных строк",      v: rawResult.invalid   as number, c: "text-red-400" },
              { label: "Всего",               v: rawResult.total     as number, c: "text-[var(--text)]" },
            ].map(s => (
              <Card key={s.label} className="p-3 text-center">
                <div className={`text-2xl font-bold ${s.c}`}>{s.v}</div>
                <div className="text-xs text-[var(--text-3)] mt-1">{s.label}</div>
              </Card>
            ))}
          </div>

          {/* Auto diagnostics for each imported product */}
          {scheduled.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-[var(--text-2)]">
                Результат импорта — диагностика запустится автоматически через ~8 сек:
              </p>
              {scheduled.map(id => (
                <DiagPanel key={id} productId={id} autoCheck />
              ))}
            </div>
          )}

          {/* Duplicates */}
          {duplicates.length > 0 && (
            <Card className="p-4">
              <p className="text-sm font-medium text-[var(--text-2)] mb-2">Уже импортированы ({duplicates.length}):</p>
              <div className="space-y-2">
                {duplicates.map(d => (
                  <div key={d.id} className="flex items-center gap-3 text-sm">
                    <span className="text-[var(--text-3)] font-mono text-xs">#{d.id}</span>
                    <span className="text-[var(--text)] flex-1 truncate">{d.name ?? "—"}</span>
                    <DiagPanel productId={d.id} />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      <Card className="p-4">
        <p className="text-xs font-medium text-[var(--text-2)] mb-2">Поддерживаемые форматы:</p>
        <div className="space-y-1 font-mono text-xs text-[var(--text-3)]">
          <p>https://plati.market/itm/5927800</p>
          <p>https://plati.market/itm/название-товара/5927800</p>
          <p>5927800 <span className="font-sans">(просто ID)</span></p>
        </div>
      </Card>
    </div>
  )
}

// ── Range Tab ────────────────────────────────────────────────────────────────
function RangeTab() {
  const [from, setFrom] = useState(""); const [to, setTo] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const rangeSize = from && to ? Math.max(0, parseInt(to) - parseInt(from) + 1) : 0

  async function doRange() {
    const f = parseInt(from); const t = parseInt(to)
    if (!f || !t) return setError("Введите оба числа")
    if (f > t) return setError("«С» должен быть меньше «По»")
    if (t - f + 1 > 500) return setError("Максимум 500 ID за раз")
    setLoading(true); setResult(null); setError(null)
    try {
      const res = await fetch("/api/admin/import/plati/range", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: f, to: t }),
      })
      const data = await res.json()
      if (res.ok) setResult(data); else setError(data.error ?? "Ошибка")
    } catch (e) { setError(e instanceof Error ? e.message : "Ошибка") }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="font-semibold text-[var(--text)] mb-1">Импорт диапазона ID</h3>
        <p className="text-xs text-[var(--text-3)] mb-4">
          Проверит каждый ID в диапазоне и импортирует найденные товары. Максимум 500 ID.
        </p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs text-[var(--text-3)] mb-1">ID с</label>
            <input type="number" value={from} onChange={e => setFrom(e.target.value)} placeholder="5927800"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text)] font-mono focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-3)] mb-1">ID по</label>
            <input type="number" value={to} onChange={e => setTo(e.target.value)} placeholder="5928000"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text)] font-mono focus:outline-none focus:border-brand" />
          </div>
        </div>
        {rangeSize > 0 && (
          <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${rangeSize > 500 ? "bg-red-500/10 text-red-400" : "bg-[var(--bg-secondary)] text-[var(--text-2)]"}`}>
            {rangeSize} ID · ~{Math.ceil(rangeSize * 4 / 60)} мин{rangeSize > 500 ? " — слишком много" : ""}
          </div>
        )}
        <div className="flex justify-end">
          <button onClick={doRange} disabled={loading || !from || !to || rangeSize > 500 || rangeSize <= 0}
            className="px-5 py-2 bg-brand text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-brand/90">
            {loading ? "⏳ Добавляю..." : "🔍 Запустить импорт диапазона"}
          </button>
        </div>
      </Card>
      {error && <Card className="p-4 border-red-500/30"><p className="text-red-400 text-sm">❌ {error}</p></Card>}
      {result && (
        <Card className={`p-5 ${(result.scheduled as number) > 0 ? "border-emerald-500/20" : "border-yellow-500/20"}`}>
          <p className={`font-semibold mb-3 ${(result.scheduled as number) > 0 ? "text-emerald-400" : "text-yellow-400"}`}>
            {(result.scheduled as number) > 0 ? "✅ Запущен импорт диапазона" : "ℹ️ Нечего импортировать"}
          </p>
          {(result.message as string) && (
            <p className="text-sm text-[var(--text-2)] mb-3">{result.message as string}</p>
          )}
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "В очереди",     v: result.scheduled as number, c: (result.scheduled as number) > 0 ? "text-brand" : "text-[var(--text-3)]" },
              { label: "Уже есть",      v: result.skipped   as number, c: "text-yellow-400" },
              { label: "Всего в диап.", v: result.total     as number, c: "text-[var(--text)]" },
            ].map(s => (
              <div key={s.label} className="bg-white/5 rounded-xl p-3">
                <div className={`text-2xl font-bold ${s.c}`}>{s.v}</div>
                <div className="text-xs text-[var(--text-3)] mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          {(result.estimatedMinutes as number) > 0 && (
            <p className="text-xs text-[var(--text-3)] mt-3">⏱ ~{result.estimatedMinutes as number} мин до завершения · следи в «📜 История»</p>
          )}
        </Card>
      )}
    </div>
  )
}

// ── History Tab ──────────────────────────────────────────────────────────────
function HistoryTab({ errorsOnly = false }: { errorsOnly?: boolean }) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [stats, setStats] = useState<LogStats | null>(null)
  const [total, setTotal] = useState(0); const [page, setPage] = useState(1); const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [updateMsg, setUpdateMsg] = useState("")

  const load = useCallback(async (p = page) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p) })
    if (errorsOnly) params.set("status", "error")
    try {
      const r = await fetch("/api/admin/import/plati/logs?" + params)
      if (r.ok) { const d = await r.json(); setLogs(d.logs); setTotal(d.total); setPage(d.page); setPages(d.pages); if (d.stats) setStats(d.stats) }
    } catch {}
    setLoading(false)
  }, [page, errorsOnly])

  useEffect(() => { load(1) }, [errorsOnly])

  async function triggerUpdate() {
    setUpdateMsg("")
    try {
      const r = await fetch("/api/admin/import/plati/update", { method: "POST" })
      const d = await r.json()
      setUpdateMsg(r.ok ? `✅ Обновление ${d.queued} товаров запущено` : `❌ ${d.error ?? "Ошибка"}`)
    } catch { setUpdateMsg("❌ Ошибка") }
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
            <p className="text-xs text-[var(--text-3)] mt-0.5">Авто-обновление каждые 6 часов.</p>
          </div>
          <button onClick={triggerUpdate}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors whitespace-nowrap">
            🔄 Обновить сейчас
          </button>
        </Card>
      )}
      {updateMsg && <p className="text-sm text-[var(--text-2)]">{updateMsg}</p>}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <p className="text-sm font-medium text-[var(--text)]">
            {errorsOnly ? "Ошибки" : "История"} · {total}
          </p>
          <button onClick={() => load(1)} disabled={loading} className="text-xs text-[var(--text-3)] hover:text-[var(--text)]">
            {loading ? "..." : "↻"}
          </button>
        </div>
        {loading && !logs.length ? (
          <p className="text-center text-[var(--text-3)] py-12 text-sm">Загрузка...</p>
        ) : !logs.length ? (
          <p className="text-center text-[var(--text-3)] py-12 text-sm">Записей нет</p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {logs.map(log => (
              <div key={log.id} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={log.status} />
                      <span className="text-xs text-[var(--text-3)] font-mono">#{log.productId}</span>
                      {log.productName && <span className="text-sm text-[var(--text)] truncate max-w-xs">{log.productName}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <a href={log.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-[var(--text-3)] hover:text-brand font-mono truncate max-w-xs">{log.url}</a>
                      <span className="text-xs text-[var(--text-3)]">{new Date(log.createdAt).toLocaleString("ru")}</span>
                      {log.duration && <span className="text-xs text-[var(--text-3)]">{(log.duration / 1000).toFixed(1)}с</span>}
                    </div>
                    {log.error && <p className="text-xs text-red-400 mt-1 font-mono">{log.error}</p>}
                    {log.productId && (log.status === "success" || log.status === "updated") && (
                      <div className="mt-2"><DiagPanel productId={log.productId} /></div>
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
              className="px-3 py-1 text-sm border border-[var(--border)] rounded-lg disabled:opacity-40">←</button>
            <span className="text-sm text-[var(--text-3)]">{page} / {pages}</span>
            <button onClick={() => load(page + 1)} disabled={page >= pages || loading}
              className="px-3 py-1 text-sm border border-[var(--border)] rounded-lg disabled:opacity-40">→</button>
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
        <p className="text-[var(--text-3)] text-sm mt-1">Скрапинг карточек напрямую со страниц Plati.Market. Авто-обновление каждые 6 часов.</p>
      </div>
      <SyncPricesWidget />
      <QueueWidget />
      <div className="flex gap-1.5 flex-wrap mb-6">
        <TabBtn active={tab === "import"}  onClick={() => setTab("import")}>⬇️ Импорт</TabBtn>
        <TabBtn active={tab === "range"}   onClick={() => setTab("range")}>🔢 Диапазон ID</TabBtn>
        <TabBtn active={tab === "history"} onClick={() => setTab("history")}>📜 История</TabBtn>
        <TabBtn active={tab === "errors"}  onClick={() => setTab("errors")}>❌ Ошибки</TabBtn>
      </div>
      {tab === "import"  && <ImportTab />}
      {tab === "range"   && <RangeTab />}
      {tab === "history" && <HistoryTab />}
      {tab === "errors"  && <HistoryTab errorsOnly />}
    </div>
  )
}
