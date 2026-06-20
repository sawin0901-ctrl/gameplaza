"use client"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"

type Tab = "digiseller" | "range" | "file" | "queue" | "settings"

// ── Общие компоненты ──────────────────────────────────────────────────────────
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
        active ? "bg-brand text-white" : "text-gray-500 hover:text-white hover:bg-white/5"
      }`}>
      {children}
    </button>
  )
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="card p-4 border-red-500/30">
      <p className="text-red-400 text-sm whitespace-pre-line">❌ {msg}</p>
    </div>
  )
}

function SuccessBox({ children }: { children: React.ReactNode }) {
  return <div className="card p-5 border-emerald-500/20 space-y-3">{children}</div>
}

function StatGrid({ items }: { items: { label: string; value: number | string; color?: string }[] }) {
  return (
    <div className={`grid gap-3 grid-cols-2 sm:grid-cols-${Math.min(items.length, 4)}`}>
      {items.map(s => (
        <div key={s.label} className="bg-white/5 rounded-xl p-3 text-center">
          <div className={`text-2xl font-bold ${s.color ?? "text-white"}`}>{s.value}</div>
          <div className="text-gray-600 text-xs mt-1">{s.label}</div>
        </div>
      ))}
    </div>
  )
}

// ── Вкладка 1: Импорт Digiseller ──────────────────────────────────────────────
function DigisellerTab() {
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [runLoading, setRunLoading] = useState(false)
  const [runResult, setRunResult] = useState<{ scheduled: number; skippedExisting: number; total: number; message?: string } | null>(null)
  const [runError, setRunError] = useState<string | null>(null)

  async function doImport() {
    const text = input.trim()
    if (!text) { setError("Введите ID или ссылку"); return }
    setLoading(true); setResult(null); setError(null)
    try {
      const res = await fetch("/api/admin/import/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (res.ok) setResult(data)
      else setError(data.error ?? "Ошибка импорта")
    } catch (e) { setError(`Ошибка соединения: ${e instanceof Error ? e.message : "неизвестная ошибка"}`) }
    setLoading(false)
  }

  async function runCatalog() {
    setRunLoading(true); setRunResult(null); setRunError(null)
    try {
      const res = await fetch("/api/import/run", { method: "POST" })
      const data = await res.json()
      if (res.ok) setRunResult(data)
      else setRunError(data.error ?? data.message ?? "Ошибка")
    } catch (e) { setRunError(`Ошибка соединения: ${e instanceof Error ? e.message : "неизвестная ошибка"}`) }
    setRunLoading(false)
  }

  return (
    <div className="space-y-5">
      {/* Импорт по ID/ссылке */}
      <div className="card p-5">
        <h3 className="text-white font-semibold mb-1">Импорт по ID или ссылке</h3>
        <p className="text-gray-500 text-xs mb-3">Введите один или несколько ID, каждый с новой строки</p>
        <div className="card p-3 text-xs text-gray-500 mb-3 space-y-1">
          <p className="font-medium text-gray-400">Поддерживаемые форматы:</p>
          <p><span className="text-emerald-400">✓</span> <code className="text-gray-300">5853474</code> — просто ID</p>
          <p><span className="text-emerald-400">✓</span> <code className="text-gray-300">plati.market/itm/name/5853474</code></p>
          <p><span className="text-emerald-400">✓</span> <code className="text-gray-300">digiseller.ru/info/?id=5853474</code></p>
          <p><span className="text-red-400">✗</span> <code className="text-gray-600">funpay.com/...</code> — нет публичного API</p>
        </div>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={"5853474\n1234567\nhttps://plati.market/itm/9876543"}
          rows={5}
          className="gp-input resize-none font-mono text-sm mb-3"
        />
        <button onClick={doImport} disabled={loading || !input.trim()}
          className="btn-primary px-6 py-2.5 disabled:opacity-50">
          {loading ? "⏳ Добавляем в очередь..." : "⬇ Импортировать"}
        </button>
        {error && <div className="mt-3"><ErrorBox msg={error} /></div>}
        {result && (
          <div className="mt-3">
            <SuccessBox>
              <p className="text-emerald-400 font-semibold">✅ Добавлено в очередь</p>
              <StatGrid items={[
                { label: "В очереди", value: result.scheduled as number, color: "text-emerald-400" },
                { label: "Дублей", value: result.duplicates as number, color: "text-yellow-400" },
                { label: "Не распознано", value: result.unsupported as number, color: "text-gray-500" },
                { label: "Всего строк", value: result.total as number },
              ]} />
              <p className="text-gray-600 text-xs">Товары появятся через 1–5 минут после обработки воркером</p>
            </SuccessBox>
          </div>
        )}
      </div>

      {/* Полный импорт каталога */}
      <div className="card p-5">
        <h3 className="text-white font-semibold mb-1">Импорт всего каталога Digiseller</h3>
        <p className="text-gray-500 text-sm mb-4">
          Получает список всех ваших товаров из личного кабинета Digiseller (до 200 за раз)
        </p>
        <button onClick={runCatalog} disabled={runLoading}
          className="btn-outline py-2.5 px-6 disabled:opacity-60">
          {runLoading ? "⏳ Запрашиваем каталог..." : "🔄 Запустить полный импорт"}
        </button>
        {runError && <div className="mt-3"><ErrorBox msg={runError} /></div>}
        {runResult && (
          <div className="mt-3">
            <SuccessBox>
              <p className="text-emerald-400 font-semibold">✅ Запущено</p>
              {runResult.message ? (
                <p className="text-yellow-400 text-sm">{runResult.message}</p>
              ) : (
                <StatGrid items={[
                  { label: "В очереди", value: runResult.scheduled, color: "text-emerald-400" },
                  { label: "Уже есть", value: runResult.skippedExisting, color: "text-gray-500" },
                  { label: "Всего найдено", value: runResult.total },
                ]} />
              )}
            </SuccessBox>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Вкладка 2: Импорт по диапазону ID ────────────────────────────────────────
function RangeTab() {
  const [fromId, setFromId] = useState("")
  const [toId, setToId] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    scheduled: number; duplicates: number; rangeSize: number;
    fromId: number; toId: number; estimatedMinutes: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const rangeSize = parseInt(toId) - parseInt(fromId) + 1

  async function doRange() {
    const from = parseInt(fromId)
    const to = parseInt(toId)
    if (!from || !to || isNaN(from) || isNaN(to)) { setError("Введите корректные числа"); return }
    if (to < from) { setError("«До» должно быть больше «От»"); return }

    setLoading(true); setResult(null); setError(null)
    try {
      const res = await fetch("/api/import/range", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromId: from, toId: to }),
      })
      const data = await res.json()
      if (res.ok) setResult(data)
      else setError(data.error ?? "Ошибка")
    } catch (e) { setError(`Ошибка соединения: ${e instanceof Error ? e.message : ""}`) }
    setLoading(false)
  }

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <h3 className="text-white font-semibold mb-1">Импорт по диапазону ID</h3>
        <p className="text-gray-500 text-sm mb-4">
          Система проверит каждый ID в диапазоне. Несуществующие товары будут автоматически пропущены.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">От ID</label>
            <input type="number" value={fromId} onChange={e => setFromId(e.target.value)}
              placeholder="например: 5800000" min="1" className="gp-input py-2.5" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">До ID</label>
            <input type="number" value={toId} onChange={e => setToId(e.target.value)}
              placeholder="например: 5801000" min="1" className="gp-input py-2.5" />
          </div>
        </div>

        {fromId && toId && !isNaN(rangeSize) && rangeSize > 0 && (
          <div className="card p-3 mb-4 text-sm space-y-1">
            <p className="text-gray-400">Диапазон: <span className="text-white font-mono">{parseInt(fromId).toLocaleString("ru-RU")} – {parseInt(toId).toLocaleString("ru-RU")}</span></p>
            <p className="text-gray-400">Всего ID в диапазоне: <span className={`font-semibold ${rangeSize > 2000 ? "text-red-400" : "text-white"}`}>{rangeSize.toLocaleString("ru-RU")}</span></p>
            {rangeSize <= 2000 && <p className="text-gray-500 text-xs">Ориентировочное время: ~{Math.ceil(rangeSize * 5 / 60)} минут</p>}
            {rangeSize > 2000 && <p className="text-red-400 text-xs">Максимум 2000 ID за раз. Уменьшите диапазон.</p>}
          </div>
        )}

        <button onClick={doRange} disabled={loading || !fromId || !toId}
          className="btn-primary px-6 py-2.5 disabled:opacity-50">
          {loading ? "⏳ Добавляем в очередь..." : "🔢 Импортировать диапазон"}
        </button>

        {error && <div className="mt-3"><ErrorBox msg={error} /></div>}
        {result && (
          <div className="mt-3">
            <SuccessBox>
              <p className="text-emerald-400 font-semibold">✅ Добавлено в очередь</p>
              <StatGrid items={[
                { label: "В очереди", value: result.scheduled, color: "text-emerald-400" },
                { label: "Дублей", value: result.duplicates, color: "text-yellow-400" },
                { label: "Диапазон", value: result.rangeSize },
                { label: "Время (~мин)", value: result.estimatedMinutes, color: "text-gray-400" },
              ]} />
              <p className="text-gray-600 text-xs">
                ID {result.fromId} – {result.toId} · Воркер проверит каждый ID через Digiseller API
              </p>
            </SuccessBox>
          </div>
        )}
      </div>

      <div className="card p-4 text-xs text-gray-500">
        <p className="font-medium text-gray-400 mb-2">Как найти диапазон ID товаров</p>
        <p>1. Откройте <a href="https://plati.market" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">plati.market</a> или <a href="https://www.digiseller.ru" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">digiseller.ru</a></p>
        <p>2. Откройте любой товар — в URL будет ID: <code className="text-gray-300">plati.market/itm/<strong>5853474</strong></code></p>
        <p>3. Укажите диапазон вокруг известных ID ваших товаров</p>
      </div>
    </div>
  )
}

// ── Вкладка 3: Импорт из файла ────────────────────────────────────────────────
function FileTab() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  function handleFile(f: File) {
    setFile(f); setResult(null); setError(null)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  async function upload() {
    if (!file) { setError("Выберите файл"); return }
    setLoading(true); setResult(null); setError(null)
    const fd = new FormData()
    fd.append("file", file)
    try {
      const res = await fetch("/api/import/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (res.ok) setResult(data)
      else setError(data.error ?? "Ошибка загрузки")
    } catch (e) { setError(`Ошибка соединения: ${e instanceof Error ? e.message : ""}`) }
    setLoading(false)
  }

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <h3 className="text-white font-semibold mb-1">Импорт из файла</h3>
        <p className="text-gray-500 text-sm mb-4">Загрузите файл со списком ID товаров — один ID на строку</p>

        {/* Зона перетаскивания */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
            dragOver ? "border-brand bg-brand/10" : file ? "border-emerald-500/40 bg-emerald-500/5" : "border-[#1f2937] hover:border-brand/40"
          }`}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <input id="file-input" type="file" accept=".txt,.csv" className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          {file ? (
            <div>
              <p className="text-emerald-400 font-medium">📄 {file.name}</p>
              <p className="text-gray-500 text-xs mt-1">{(file.size / 1024).toFixed(1)} КБ</p>
            </div>
          ) : (
            <div>
              <p className="text-4xl mb-3">📂</p>
              <p className="text-white font-medium">Перетащите файл сюда или нажмите для выбора</p>
              <p className="text-gray-500 text-sm mt-1">TXT, CSV — до 2 МБ</p>
            </div>
          )}
        </div>

        {file && (
          <button onClick={() => { setFile(null); setResult(null); setError(null) }}
            className="mt-2 text-gray-600 text-xs hover:text-gray-400">✕ Убрать файл</button>
        )}

        <div className="mt-4">
          <button onClick={upload} disabled={loading || !file}
            className="btn-primary px-6 py-2.5 disabled:opacity-50">
            {loading ? "⏳ Обрабатываем файл..." : "📤 Загрузить и импортировать"}
          </button>
        </div>

        {error && <div className="mt-3"><ErrorBox msg={error} /></div>}
        {result && (
          <div className="mt-3">
            <SuccessBox>
              <p className="text-emerald-400 font-semibold">✅ Файл обработан: {result.fileName as string}</p>
              <StatGrid items={[
                { label: "В очереди", value: result.scheduled as number, color: "text-emerald-400" },
                { label: "Дублей", value: result.duplicates as number, color: "text-yellow-400" },
                { label: "Строк в файле", value: result.linesInFile as number },
                { label: "Не распознано", value: result.unsupported as number, color: "text-gray-500" },
              ]} />
              {(result.truncated as number) > 0 && (
                <p className="text-yellow-400 text-sm">⚠ Обработано первые 500. Пропущено: {result.truncated as number}</p>
              )}
            </SuccessBox>
          </div>
        )}
      </div>

      {/* Форматы файлов */}
      <div className="card p-4 text-xs text-gray-500 space-y-3">
        <p className="font-medium text-gray-400 text-sm">Поддерживаемые форматы файлов</p>

        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-emerald-400 mt-0.5">✓</span>
            <div>
              <p className="text-gray-300 font-medium">TXT — текстовый файл</p>
              <p>Каждый ID на отдельной строке: <code className="text-gray-300">5853474</code></p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-400 mt-0.5">✓</span>
            <div>
              <p className="text-gray-300 font-medium">CSV — таблица с разделителями</p>
              <p>ID в первом столбце, с заголовком или без</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-yellow-400 mt-0.5">→</span>
            <div>
              <p className="text-gray-300 font-medium">Excel (XLSX/XLS)</p>
              <p>Откройте в Excel → Файл → Сохранить как → <strong className="text-gray-300">CSV UTF-8</strong> → загрузите CSV</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-yellow-400 mt-0.5">→</span>
            <div>
              <p className="text-gray-300 font-medium">Word (DOCX)</p>
              <p>Скопируйте ID из документа → вставьте в текстовое поле на вкладке «Digiseller»</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Вкладка 4: Очередь и логи ─────────────────────────────────────────────────
function QueueTab() {
  const [data, setData] = useState<{
    logs: { id: string; date: string; imported: number; updated: number; hidden: number; errors: number; duration: number | null }[]
    total: number; pages: number
    queue: { pending: number; processing: number; done: number; skipped: number; failed: number }
  } | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/import/logs?page=${page}`)
      if (res.ok) setData(await res.json())
    } catch {}
    setLoading(false)
  }, [page])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const t = setInterval(load, 15_000)
    return () => clearInterval(t)
  }, [load])

  return (
    <div className="space-y-5">
      {data && (
        <>
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">Статус очереди</h3>
              <button onClick={load} disabled={loading} className="btn-ghost text-sm py-1 px-3">
                {loading ? "↻" : "↻ Обновить"}
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[
                { label: "Ожидание", value: data.queue.pending, color: "text-yellow-400" },
                { label: "В работе", value: data.queue.processing, color: "text-brand" },
                { label: "Готово", value: data.queue.done, color: "text-emerald-400" },
                { label: "Пропущено", value: data.queue.skipped, color: "text-gray-500" },
                { label: "Ошибки", value: data.queue.failed, color: "text-red-400" },
              ].map(s => (
                <div key={s.label} className="card p-3 text-center">
                  <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-gray-600 text-xs mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {data.queue.processing > 0 && (
            <div className="card p-3 border-brand/30 flex items-center gap-3">
              <div className="w-2 h-2 bg-brand rounded-full animate-pulse flex-shrink-0" />
              <p className="text-brand text-sm">Воркер обрабатывает {data.queue.processing} товар(а) прямо сейчас</p>
            </div>
          )}
        </>
      )}

      <div>
        <h3 className="text-white font-semibold mb-3">История импортов</h3>
        {data && data.logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-600 text-left border-b border-[#1f2937]">
                  {["Дата", "Новых", "Обновл.", "Скрыто", "Ошибок", "Время"].map(h => (
                    <th key={h} className="pb-3 pr-4 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.logs.map(log => (
                  <tr key={log.id} className="border-b border-[#1f2937] hover:bg-white/2 transition-colors">
                    <td className="py-3 pr-4 text-gray-400 text-xs">
                      {new Date(log.date).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-3 pr-4 text-emerald-400 font-semibold">{log.imported}</td>
                    <td className="py-3 pr-4 text-brand font-semibold">{log.updated}</td>
                    <td className="py-3 pr-4 text-yellow-400 font-semibold">{log.hidden}</td>
                    <td className="py-3 pr-4">
                      <span className={log.errors > 0 ? "text-red-400 font-semibold" : "text-gray-600"}>{log.errors}</span>
                    </td>
                    <td className="py-3 text-gray-600 text-xs">
                      {log.duration ? `${Math.round(log.duration / 1000)}с` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card p-8 text-center">
            <p className="text-gray-600 text-sm">{loading ? "Загрузка..." : "Импортов ещё не было"}</p>
          </div>
        )}

        {data && data.pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="btn-ghost text-sm py-1.5 px-3 disabled:opacity-40">← Пред</button>
            <span className="text-gray-500 text-sm">{page} / {data.pages}</span>
            <button disabled={page === data.pages} onClick={() => setPage(p => p + 1)}
              className="btn-ghost text-sm py-1.5 px-3 disabled:opacity-40">След →</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Вкладка 5: Настройки ──────────────────────────────────────────────────────
function SettingsTab() {
  const [form, setForm] = useState({ markupType: "none" as "none"|"fixed"|"percent", markupValue: 0, markupMinProfit: 0, syncEnabled: false, syncInterval: 60 })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/import/settings").then(r => r.json()).then(setForm).catch(() => {})
  }, [])

  async function save() {
    setLoading(true); setSaved(false); setError(null)
    try {
      const res = await fetch("/api/admin/import/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) setSaved(true)
      else setError(data.error ?? "Ошибка сохранения")
    } catch { setError("Ошибка сети") }
    setLoading(false)
  }

  const example = 500
  const preview = form.markupType === "percent" ? Math.ceil(example * (1 + form.markupValue / 100))
    : form.markupType === "fixed" ? example + form.markupValue : example

  return (
    <div className="space-y-5 max-w-xl">
      <div className="card p-5">
        <h3 className="text-white font-semibold mb-4">Наценка на товары</h3>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[["none","Без наценки"],["percent","Процент %"],["fixed","Фикс. ₽"]].map(([v,l]) => (
              <button key={v} onClick={() => setForm(f => ({ ...f, markupType: v as "none"|"percent"|"fixed" }))}
                className={`px-4 py-2 rounded-xl text-sm transition-colors ${form.markupType === v ? "bg-brand text-white" : "card text-gray-500 hover:text-white"}`}>
                {l}
              </button>
            ))}
          </div>
          {form.markupType !== "none" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{form.markupType === "percent" ? "Наценка (%)" : "Наценка (₽)"}</label>
                  <input type="number" min="0" value={form.markupValue}
                    onChange={e => setForm(f => ({ ...f, markupValue: +e.target.value || 0 }))}
                    className="gp-input py-2" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Мин. прибыль (₽)</label>
                  <input type="number" min="0" value={form.markupMinProfit}
                    onChange={e => setForm(f => ({ ...f, markupMinProfit: +e.target.value || 0 }))}
                    className="gp-input py-2" />
                </div>
              </div>
              <div className="card p-3 text-sm">
                <p className="text-gray-500">Цена поставщика: <span className="text-white">{example} ₽</span> → Цена на сайте: <span className="text-brand font-semibold">{preview} ₽</span></p>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold">Автосинхронизация</h3>
          <button onClick={() => setForm(f => ({ ...f, syncEnabled: !f.syncEnabled }))}
            className={`relative w-11 h-6 rounded-full transition-colors ${form.syncEnabled ? "bg-brand" : "bg-gray-700"}`}>
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${form.syncEnabled ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
        {form.syncEnabled && (
          <select value={form.syncInterval}
            onChange={e => setForm(f => ({ ...f, syncInterval: +e.target.value }))}
            className="gp-input py-2">
            {[[5,"5 минут"],[15,"15 минут"],[60,"Час"],[360,"6 часов"],[1440,"Сутки"]].map(([v,l]) => (
              <option key={v} value={v}>Каждые {l}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button onClick={save} disabled={loading} className="btn-primary px-8 py-2.5 disabled:opacity-60">
          {loading ? "Сохраняю..." : "💾 Сохранить"}
        </button>
        {saved && <span className="text-emerald-400 text-sm">✓ Сохранено</span>}
        {error && <span className="text-red-400 text-sm">{error}</span>}
      </div>
    </div>
  )
}

// ── Главный компонент ──────────────────────────────────────────────────────────
export default function AdminImportPage() {
  const [tab, setTab] = useState<Tab>("digiseller")

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-white">Импорт товаров</h1>
        <p className="text-gray-500 text-sm mt-1">Digiseller API · Наполнение каталога</p>
      </div>

      {/* Вкладки */}
      <div className="flex gap-1 mb-6 bg-white/5 rounded-xl p-1 overflow-x-auto">
        <TabBtn active={tab === "digiseller"} onClick={() => setTab("digiseller")}>⬇ Digiseller</TabBtn>
        <TabBtn active={tab === "range"} onClick={() => setTab("range")}>🔢 Диапазон ID</TabBtn>
        <TabBtn active={tab === "file"} onClick={() => setTab("file")}>📁 Файл (TXT/CSV)</TabBtn>
        <TabBtn active={tab === "queue"} onClick={() => setTab("queue")}>📋 Очередь</TabBtn>
        <TabBtn active={tab === "settings"} onClick={() => setTab("settings")}>⚙ Настройки</TabBtn>
      </div>

      {tab === "digiseller" && <DigisellerTab />}
      {tab === "range" && <RangeTab />}
      {tab === "file" && <FileTab />}
      {tab === "queue" && <QueueTab />}
      {tab === "settings" && <SettingsTab />}

      <div className="mt-8 pt-5 border-t border-[#1f2937] flex flex-wrap gap-2">
        <Link href="/admin" className="btn-ghost text-sm py-2 px-4">📊 Дашборд</Link>
        <Link href="/admin/products" className="btn-ghost text-sm py-2 px-4">🎮 Товары</Link>
        <Link href="/catalog" target="_blank" className="btn-ghost text-sm py-2 px-4">🌐 Магазин</Link>
        <a href="https://www.digiseller.ru/seller/" target="_blank" rel="noopener noreferrer" className="btn-ghost text-sm py-2 px-4">🔗 Кабинет Digiseller</a>
      </div>
    </div>
  )
}
