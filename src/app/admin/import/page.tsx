"use client"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"

type Tab = "import" | "logs" | "settings"

interface BulkResult {
  scheduled: number
  duplicates: number
  duplicateList?: { id: number; name?: string; active?: boolean }[]
  unsupported: number
  unsupportedList?: string[]
  funpay: number
  total: number
  truncated: number
  error?: string
}

interface ImportLog {
  id: string
  date: string
  imported: number
  updated: number
  hidden: number
  restored: number
  errors: number
  duration: number | null
}

interface LogsData {
  logs: ImportLog[]
  total: number
  pages: number
  queue: { pending: number; processing: number; done: number; skipped: number; failed: number }
}

interface Settings {
  markupType: "none" | "fixed" | "percent"
  markupValue: number
  markupMinProfit: number
  syncEnabled: boolean
  syncInterval: number
}

const SYNC_INTERVALS = [
  { value: 5, label: "Каждые 5 минут" },
  { value: 15, label: "Каждые 15 минут" },
  { value: 60, label: "Каждый час" },
  { value: 360, label: "Каждые 6 часов" },
  { value: 1440, label: "Раз в сутки" },
]

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 text-sm font-medium rounded-xl transition-colors ${
        active ? "bg-brand text-white" : "text-gray-500 hover:text-white hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  )
}

// ── Вкладка импорта ────────────────────────────────────────────────────────────
function ImportTab() {
  const [input, setInput] = useState("")
  const [mode, setMode] = useState<"single" | "bulk">("single")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BulkResult | null>(null)
  const [error, setError] = useState<string | null>(null)

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
    } catch { setError("Ошибка сети") }
    setLoading(false)
  }

  const placeholder = mode === "single"
    ? "Введите ID или ссылку:\n5853474\nhttps://plati.market/itm/5853474\nhttps://digiseller.ru/info/?id=5853474"
    : "Введите список ID или ссылок (каждый с новой строки):\n5853474\n1234567\nhttps://plati.market/itm/9876543"

  return (
    <div className="space-y-5">
      {/* Режим */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("single")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${mode === "single" ? "bg-brand/20 text-brand border border-brand/30" : "card text-gray-500 hover:text-white"}`}
        >
          Один товар
        </button>
        <button
          onClick={() => setMode("bulk")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${mode === "bulk" ? "bg-brand/20 text-brand border border-brand/30" : "card text-gray-500 hover:text-white"}`}
        >
          Массовый импорт
        </button>
      </div>

      {/* Поддерживаемые форматы */}
      <div className="card p-4 text-xs text-gray-500 space-y-1.5">
        <p className="text-gray-400 font-medium text-sm mb-2">Поддерживаемые форматы ввода</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          <div className="flex items-center gap-2"><span className="text-emerald-400">✓</span> <code className="text-gray-400">5853474</code> — ID товара</div>
          <div className="flex items-center gap-2"><span className="text-emerald-400">✓</span> <code className="text-gray-400">plati.market/itm/NAME/ID</code></div>
          <div className="flex items-center gap-2"><span className="text-emerald-400">✓</span> <code className="text-gray-400">plati.market/itm/ID</code></div>
          <div className="flex items-center gap-2"><span className="text-emerald-400">✓</span> <code className="text-gray-400">digiseller.ru/info/?id=ID</code></div>
          <div className="flex items-center gap-2"><span className="text-red-400">✗</span> <code className="text-gray-600">funpay.com/...</code> — не поддерживается</div>
        </div>
      </div>

      {/* Поле ввода */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">
          {mode === "single" ? "ID товара или ссылка" : "Список ID или ссылок"}
          {mode === "bulk" && <span className="text-gray-600 ml-2">(до 500 товаров)</span>}
        </label>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={placeholder}
          rows={mode === "single" ? 3 : 8}
          className="gp-input resize-none font-mono text-sm"
          style={{ minHeight: mode === "single" ? "80px" : "180px" }}
        />
      </div>

      <button
        onClick={doImport}
        disabled={loading || !input.trim()}
        className="btn-primary px-8 py-3 disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Добавляем в очередь...
          </span>
        ) : mode === "single" ? "⬇ Импортировать" : "⬇ Импортировать всё"}
      </button>

      {/* Ошибка */}
      {error && (
        <div className="card p-4 border-red-500/30">
          <p className="text-red-400 text-sm">❌ {error}</p>
        </div>
      )}

      {/* Результат */}
      {result && !error && (
        <div className="card p-5 border-emerald-500/20 space-y-4">
          <h3 className="text-emerald-400 font-semibold">✅ Добавлено в очередь импорта</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "В очереди", value: result.scheduled, color: "text-emerald-400" },
              { label: "Дублей", value: result.duplicates, color: "text-yellow-400" },
              { label: "Не распознано", value: result.unsupported, color: "text-gray-500" },
              { label: "Всего", value: result.total, color: "text-white" },
            ].map(s => (
              <div key={s.label} className="bg-white/5 rounded-xl p-3 text-center">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-gray-600 text-xs mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {result.truncated > 0 && (
            <p className="text-yellow-400 text-sm">⚠ Максимум 500 товаров за раз. Пропущено: {result.truncated}</p>
          )}

          {result.funpay > 0 && (
            <p className="text-orange-400 text-sm">ℹ FunPay ({result.funpay} ссылок) — не поддерживается. FunPay не предоставляет API для импорта.</p>
          )}

          {result.duplicateList && result.duplicateList.length > 0 && (
            <div>
              <p className="text-gray-500 text-xs mb-2">Уже в каталоге:</p>
              <div className="space-y-1">
                {result.duplicateList.map(d => (
                  <div key={d.id} className="flex items-center gap-2 text-xs">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${d.active ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                      {d.active ? "Активен" : "Скрыт"}
                    </span>
                    <span className="text-gray-500">ID {d.id}</span>
                    {d.name && <span className="text-gray-600 truncate">{d.name}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.unsupportedList && result.unsupportedList.length > 0 && (
            <div>
              <p className="text-gray-500 text-xs mb-1">Не распознаны:</p>
              {result.unsupportedList.map((u, i) => (
                <p key={i} className="text-gray-600 text-xs font-mono truncate">{u}</p>
              ))}
            </div>
          )}

          <p className="text-gray-600 text-xs">Товары появятся в каталоге через 1–5 минут после обработки воркером.</p>
        </div>
      )}

      {/* Быстрый запуск полного импорта */}
      <div className="card p-5">
        <h3 className="text-white font-semibold mb-2">Импорт всего каталога Digiseller</h3>
        <p className="text-gray-500 text-sm mb-4">Получить все товары из вашего аккаунта Digiseller (до 200 новых за раз)</p>
        <RunCatalogButton />
      </div>
    </div>
  )
}

function RunCatalogButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ scheduled: number; skippedExisting: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setLoading(true); setResult(null); setError(null)
    try {
      const res = await fetch("/api/import/run", { method: "POST" })
      const data = await res.json()
      if (res.ok) setResult(data)
      else setError(data.error ?? data.message ?? "Ошибка")
    } catch { setError("Ошибка сети") }
    setLoading(false)
  }

  return (
    <>
      <button onClick={run} disabled={loading} className="btn-outline py-2.5 px-5 disabled:opacity-60">
        {loading ? "⏳ Получаем список..." : "🔄 Запустить полный импорт"}
      </button>
      {result && (
        <p className="text-emerald-400 text-sm mt-3">
          ✅ В очереди: <strong>{result.scheduled}</strong>, уже есть: {result.skippedExisting}, всего найдено: {result.total}
        </p>
      )}
      {error && <p className="text-red-400 text-sm mt-3">❌ {error}</p>}
    </>
  )
}

// ── Вкладка логов ──────────────────────────────────────────────────────────────
function LogsTab() {
  const [data, setData] = useState<LogsData | null>(null)
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

  // Автообновление каждые 30 сек
  useEffect(() => {
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [load])

  return (
    <div className="space-y-5">
      {/* Статус очереди */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "В ожидании", value: data.queue.pending, color: "text-yellow-400" },
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
      )}

      {/* Кнопка обновить */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">История импорта</h3>
        <button onClick={load} disabled={loading} className="btn-ghost text-sm py-1.5 px-3">
          {loading ? "↻ Обновляю..." : "↻ Обновить"}
        </button>
      </div>

      {/* Таблица */}
      {data && data.logs.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-600 text-left border-b border-[#1f2937]">
                <th className="pb-3 pr-4 font-medium">Дата</th>
                <th className="pb-3 pr-4 font-medium text-emerald-500">Новых</th>
                <th className="pb-3 pr-4 font-medium text-brand">Обновлено</th>
                <th className="pb-3 pr-4 font-medium text-yellow-500">Скрыто</th>
                <th className="pb-3 pr-4 font-medium text-red-500">Ошибок</th>
                <th className="pb-3 font-medium">Время</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.map(log => (
                <tr key={log.id} className="border-b border-[#1f2937] hover:bg-white/2">
                  <td className="py-3 pr-4 text-gray-400">
                    {new Date(log.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="py-3 pr-4 text-emerald-400 font-medium">{log.imported}</td>
                  <td className="py-3 pr-4 text-brand font-medium">{log.updated}</td>
                  <td className="py-3 pr-4 text-yellow-400 font-medium">{log.hidden}</td>
                  <td className="py-3 pr-4 text-red-400 font-medium">{log.errors}</td>
                  <td className="py-3 text-gray-600 text-xs">{log.duration ? `${Math.round(log.duration / 1000)}с` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card p-8 text-center">
          <p className="text-gray-600 text-sm">{loading ? "Загрузка..." : "Нет записей импорта"}</p>
        </div>
      )}

      {/* Пагинация */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-ghost text-sm py-1.5 px-3 disabled:opacity-40">← Пред</button>
          <span className="text-gray-500 text-sm">Стр. {page} / {data.pages}</span>
          <button disabled={page === data.pages} onClick={() => setPage(p => p + 1)} className="btn-ghost text-sm py-1.5 px-3 disabled:opacity-40">След →</button>
        </div>
      )}
    </div>
  )
}

// ── Вкладка настроек ───────────────────────────────────────────────────────────
function SettingsTab() {
  const [form, setForm] = useState<Settings>({
    markupType: "none",
    markupValue: 0,
    markupMinProfit: 0,
    syncEnabled: false,
    syncInterval: 60,
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/import/settings")
      .then(r => r.json())
      .then(data => setForm(data))
      .catch(() => {})
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

  const supplierExample = 500
  const markupPreview =
    form.markupType === "percent"
      ? Math.ceil(supplierExample * (1 + form.markupValue / 100))
      : form.markupType === "fixed"
      ? supplierExample + form.markupValue
      : supplierExample

  return (
    <div className="space-y-6 max-w-xl">
      {/* Наценка */}
      <div className="card p-5">
        <h3 className="text-white font-semibold mb-4">Наценка на товары</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-2">Тип наценки</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "none", label: "Без наценки" },
                { value: "percent", label: "Процент %" },
                { value: "fixed", label: "Фиксированная ₽" },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setForm(f => ({ ...f, markupType: opt.value as Settings["markupType"] }))}
                  className={`px-4 py-2 rounded-xl text-sm transition-colors ${
                    form.markupType === opt.value
                      ? "bg-brand text-white"
                      : "card text-gray-500 hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {form.markupType !== "none" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">
                  {form.markupType === "percent" ? "Наценка (%)" : "Наценка (₽)"}
                </label>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  value={form.markupValue}
                  onChange={e => setForm(f => ({ ...f, markupValue: parseFloat(e.target.value) || 0 }))}
                  className="gp-input py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Мин. прибыль (₽)</label>
                <input
                  type="number"
                  min="0"
                  value={form.markupMinProfit}
                  onChange={e => setForm(f => ({ ...f, markupMinProfit: parseFloat(e.target.value) || 0 }))}
                  className="gp-input py-2"
                />
              </div>
            </div>
          )}

          {form.markupType !== "none" && (
            <div className="bg-brand/10 border border-brand/20 rounded-xl p-3 text-sm">
              <p className="text-gray-400 mb-1">Пример расчёта:</p>
              <p className="text-gray-500">Цена поставщика: <span className="text-white">{supplierExample} ₽</span></p>
              <p className="text-gray-500">
                Наценка: <span className="text-white">+{form.markupValue}{form.markupType === "percent" ? "%" : " ₽"}</span>
              </p>
              <p className="text-brand font-medium mt-1">Цена на сайте: {markupPreview} ₽</p>
            </div>
          )}
        </div>
      </div>

      {/* Автосинхронизация */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white font-semibold">Автосинхронизация</h3>
            <p className="text-gray-600 text-xs mt-0.5">Автоматический импорт новых товаров по расписанию</p>
          </div>
          <button
            onClick={() => setForm(f => ({ ...f, syncEnabled: !f.syncEnabled }))}
            className={`relative w-12 h-6 rounded-full transition-colors ${form.syncEnabled ? "bg-brand" : "bg-gray-700"}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${form.syncEnabled ? "translate-x-7" : "translate-x-1"}`} />
          </button>
        </div>

        {form.syncEnabled && (
          <div>
            <label className="block text-sm text-gray-500 mb-2">Интервал синхронизации</label>
            <select
              value={form.syncInterval}
              onChange={e => setForm(f => ({ ...f, syncInterval: parseInt(e.target.value, 10) }))}
              className="gp-input py-2"
            >
              {SYNC_INTERVALS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="text-gray-600 text-xs mt-2">
              Синхронизация импортирует новые товары. Обновление цен/остатков происходит через отдельный процесс.
            </p>
          </div>
        )}
      </div>

      {/* Кнопка сохранить */}
      <div className="flex items-center gap-4">
        <button onClick={save} disabled={loading} className="btn-primary px-8 py-2.5 disabled:opacity-60">
          {loading ? "Сохраняю..." : "💾 Сохранить настройки"}
        </button>
        {saved && <span className="text-emerald-400 text-sm">✓ Сохранено</span>}
        {error && <span className="text-red-400 text-sm">{error}</span>}
      </div>

      <div className="card p-4 text-xs text-gray-600 space-y-1">
        <p className="font-medium text-gray-500 mb-2">Поддерживаемые источники</p>
        <p>✅ <strong className="text-gray-400">Digiseller</strong> — полная поддержка через официальный API</p>
        <p>✅ <strong className="text-gray-400">Plati.market</strong> — парсинг страницы товара (Plati = Digiseller)</p>
        <p>❌ <strong className="text-gray-400">FunPay</strong> — публичного API нет, импорт невозможен</p>
        <p>❌ <strong className="text-gray-400">Steam</strong> — прямая продажа ключей не через Digiseller</p>
      </div>
    </div>
  )
}

// ── Главный компонент ──────────────────────────────────────────────────────────
export default function AdminImportPage() {
  const [tab, setTab] = useState<Tab>("import")

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Импорт товаров</h1>
        <p className="text-gray-500 text-sm mt-1">Digiseller API · Автоматическое наполнение каталога</p>
      </div>

      {/* Вкладки */}
      <div className="flex gap-1 mb-6 bg-white/5 rounded-xl p-1 w-fit">
        <TabButton active={tab === "import"} onClick={() => setTab("import")}>⬇ Импорт</TabButton>
        <TabButton active={tab === "logs"} onClick={() => setTab("logs")}>📋 Логи</TabButton>
        <TabButton active={tab === "settings"} onClick={() => setTab("settings")}>⚙ Настройки</TabButton>
      </div>

      {/* Контент вкладок */}
      {tab === "import" && <ImportTab />}
      {tab === "logs" && <LogsTab />}
      {tab === "settings" && <SettingsTab />}

      {/* Нижние ссылки */}
      <div className="mt-8 pt-6 border-t border-[#1f2937] flex flex-wrap gap-2">
        <Link href="/admin" className="btn-ghost text-sm py-2 px-4">📊 Дашборд</Link>
        <Link href="/admin/products" className="btn-ghost text-sm py-2 px-4">🎮 Товары</Link>
        <Link href="/catalog" target="_blank" className="btn-ghost text-sm py-2 px-4">🌐 Магазин</Link>
        <a href="https://www.digiseller.ru/seller/" target="_blank" rel="noopener noreferrer"
          className="btn-ghost text-sm py-2 px-4">🔗 Кабинет Digiseller</a>
      </div>
    </div>
  )
}
