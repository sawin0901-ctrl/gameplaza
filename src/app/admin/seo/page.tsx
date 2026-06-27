"use client"
import { useEffect, useState } from "react"

interface Category { id: string; name: string; slug: string; metaTitle?: string; metaDesc?: string }
interface SEOData { global: Record<string, string>; categories: Category[] }
interface GenStats { total: number; withSeo: number; withoutSeo: number; providers: Record<string, boolean> }
interface Progress { processed: number; updated: number; errors: number; total: number }

const GLOBAL_FIELDS = [
  { key: "site_title",       label: "Заголовок сайта",            placeholder: "GamePlaza — купить игровые ключи" },
  { key: "site_description", label: "Описание сайта",             placeholder: "Цифровые игровые ключи по лучшим ценам" },
  { key: "og_image",         label: "OG-изображение (URL)",       placeholder: "https://gameplaza.site/og.png" },
  { key: "robots",           label: "Robots.txt (noindex/nofollow)", placeholder: "index, follow" },
]

function ProviderBadge({ name, active }: { name: string; active: boolean }) {
  return (
    <span className={"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium " + (
      active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"
    )}>
      <span className={"w-1.5 h-1.5 rounded-full " + (active ? "bg-emerald-500" : "bg-gray-300")} />
      {name}
    </span>
  )
}

function AiSeoWidget() {
  const [stats, setStats] = useState<GenStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [result, setResult] = useState<{ processed: number; updated: number; errors: number; errorMsg?: string; failedNames?: string[]; providers?: Record<string, boolean> } | null>(null)
  const [batchSize, setBatchSize] = useState(10)

  const loadStats = () =>
    fetch("/api/admin/seo/generate").then(r => r.ok ? r.json() : null).then(d => d && setStats(d))

  useEffect(() => { loadStats() }, [])

  async function run() {
    setLoading(true)
    setResult(null)
    setProgress(null)

    try {
      const response = await fetch("/api/admin/seo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchSize }),
      })

      if (!response.body) {
        setResult({ processed: 0, updated: 0, errors: 1, errorMsg: "Нет ответа от сервера" })
        setLoading(false)
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let gotResult = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const data = JSON.parse(line)
            if (data.done) {
              setResult(data)
              setProgress(null)
              gotResult = true
              loadStats()
            } else {
              setProgress(data)
            }
          } catch { /* ignore parse errors */ }
        }
      }

      // Дочитать остаток буфера (если сервер вернул JSON без \n)
      if (!gotResult && buffer.trim()) {
        try {
          const data = JSON.parse(buffer)
          setResult(data)
        } catch {
          setResult({ processed: 0, updated: 0, errors: 1, errorMsg: "Неожиданный ответ сервера: " + buffer.slice(0, 100) })
        }
      }
    } catch (e) {
      setResult({ processed: 0, updated: 0, errors: 1, errorMsg: "Ошибка соединения: " + String(e) })
    } finally {
      setLoading(false)
    }
  }

  const hasProvider = stats ? Object.values(stats.providers ?? {}).some(Boolean) : true
  const pct = progress ? Math.round((progress.processed / progress.total) * 100) : 0

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="font-bold text-gray-900 text-base">AI SEO генератор</h2>
          <p className="text-xs text-gray-500 mt-0.5">Генерирует title, description, keywords для товаров без SEO</p>
        </div>
        {stats?.providers && (
          <div className="flex gap-1.5 flex-wrap justify-end">
            <ProviderBadge name="Groq"      active={!!stats.providers.groq} />
            <ProviderBadge name="DeepSeek"  active={!!stats.providers.deepseek} />
            <ProviderBadge name="Anthropic" active={!!stats.providers.anthropic} />
            <ProviderBadge name="Gemini"    active={!!stats.providers.gemini} />
          </div>
        )}
      </div>

      {!hasProvider && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          Нет API-ключей. Добавьте в .env: <code className="font-mono bg-amber-100 px-1 rounded">GEMINI_API_KEY</code>, <code className="font-mono bg-amber-100 px-1 rounded">ANTHROPIC_API_KEY</code> или <code className="font-mono bg-amber-100 px-1 rounded">DEEPSEEK_API_KEY</code>
        </div>
      )}

      {stats && (
        <div className="flex gap-3 mb-4">
          <div className="bg-emerald-50 text-emerald-700 rounded-xl px-3 py-2 text-sm font-medium">С SEO: {stats.withSeo}</div>
          <div className="bg-amber-50 text-amber-700 rounded-xl px-3 py-2 text-sm font-medium">Без SEO: {stats.withoutSeo}</div>
          <div className="bg-gray-50 text-gray-500 rounded-xl px-3 py-2 text-sm">Всего: {stats.total}</div>
        </div>
      )}

      <div className="flex gap-3 items-center flex-wrap">
        <select value={batchSize} onChange={e => setBatchSize(Number(e.target.value))}
          disabled={loading}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 disabled:opacity-50">
          <option value={5}>5 товаров</option>
          <option value={10}>10 товаров</option>
          <option value={25}>25 товаров</option>
          <option value={50}>50 товаров</option>
        </select>
        <button onClick={run} disabled={loading || !hasProvider}
          className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-violet-700 transition-colors">
          {loading ? "Генерирую..." : "Сгенерировать SEO"}
        </button>
      </div>

      {loading && progress && (
        <div className="mt-3 px-4 py-3 rounded-xl bg-violet-50 border border-violet-200">
          <p className="text-sm font-medium text-violet-700 mb-2">
            Обработано: {progress.processed}/{progress.total} | Обновлено: {progress.updated} | Ошибок: {progress.errors}
          </p>
          <div className="bg-violet-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-violet-600 h-2 rounded-full transition-all duration-300"
              style={{ width: pct + "%" }}
            />
          </div>
          <p className="text-xs text-violet-500 mt-1">{pct}%</p>
        </div>
      )}

      {loading && !progress && (
        <div className="mt-3 px-4 py-3 rounded-xl bg-violet-50 border border-violet-200 text-sm text-violet-600">
          Подключаюсь к AI...
        </div>
      )}

      {result && (
        <div className={"mt-3 px-4 py-3 rounded-xl text-sm " + (result.errorMsg || (result as Record<string,unknown>).error || (result.errors > 0 && result.updated === 0) ? "bg-rose-50 border border-rose-200 text-rose-700" : "bg-emerald-50 border border-emerald-200 text-emerald-700")}>
          {result.errorMsg || (result as Record<string,unknown>).error ? (
            <p>{result.errorMsg || String((result as Record<string,unknown>).error)}</p>
          ) : result.processed == null ? (
            <p className="font-mono text-xs break-all">Ответ сервера: {JSON.stringify(result)}</p>
          ) : (
            <>
              <p className="font-medium">Обработано: {result.processed} | Обновлено: {result.updated} | Ошибок: {result.errors}</p>
              {result.failedNames && result.failedNames.length > 0 && (
                <p className="text-xs mt-1 opacity-75">Не удалось: {result.failedNames.join(", ")}</p>
              )}
              {result.providers && (
                <p className="text-xs mt-1 opacity-75">
                  Провайдеры: {Object.entries(result.providers).filter(([, v]) => v).map(([k]) => k).join(", ") || "нет ключей"}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function SEOPage() {
  const [data, setData] = useState<SEOData | null>(null)
  const [global, setGlobal] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState("")
  const [seeding, setSeeding] = useState(false)

  async function load() {
    const r = await fetch("/api/admin/seo")
    const d = await r.json()
    setData(d); setGlobal(d.global ?? {})
  }
  async function saveGlobal(key: string) {
    await fetch("/api/admin/seo", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "global", key, value: global[key] ?? "" }),
    })
    setMsg("Сохранено: " + key)
    setTimeout(() => setMsg(""), 2000)
  }
  async function saveCat(cat: Category) {
    await fetch("/api/admin/seo", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "category", categoryId: cat.id, metaTitle: cat.metaTitle, metaDesc: cat.metaDesc }),
    })
    setMsg("Сохранено: " + cat.name)
    setTimeout(() => setMsg(""), 2000)
  }
  async function seedCategories() {
    setSeeding(true)
    const r = await fetch("/api/admin/seo/seed-categories", { method: "POST" })
    const d = await r.json()
    if (d.ok) { setMsg("Заполнено " + d.updated + " категорий"); await load() }
    else setMsg("Ошибка заполнения")
    setTimeout(() => setMsg(""), 3000)
    setSeeding(false)
  }
  function updateCat(id: string, field: "metaTitle" | "metaDesc", value: string) {
    if (!data) return
    setData(prev => prev ? { ...prev, categories: prev.categories.map(c => c.id === id ? { ...c, [field]: value } : c) } : prev)
  }

  useEffect(() => { load() }, [])

  const emptyCats = data?.categories.filter(c => !c.metaTitle).length ?? 0

  return (
    <div className="p-6 max-w-3xl">
      <AiSeoWidget />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">SEO-настройки</h1>
        {msg && <span className="text-sm text-emerald-600 font-medium">{msg}</span>}
      </div>

      {/* Global SEO */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-5 shadow-sm">
        <p className="font-semibold text-gray-900 mb-4">Глобальные настройки</p>
        <div className="space-y-3">
          {GLOBAL_FIELDS.map(f => (
            <div key={f.key}>
              <label className="text-xs font-medium text-gray-500 mb-1 block">{f.label}</label>
              <div className="flex gap-2">
                <input
                  value={global[f.key] ?? ""}
                  onChange={e => setGlobal(g => ({ ...g, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                />
                <button onClick={() => saveGlobal(f.key)}
                  className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors">
                  Сохранить
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category SEO */}
      {data?.categories && data.categories.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold text-gray-900">SEO по категориям</p>
              {emptyCats > 0 && (
                <p className="text-xs text-amber-600 mt-0.5">{emptyCats} категорий без SEO</p>
              )}
            </div>
            <button onClick={seedCategories} disabled={seeding}
              className="flex items-center gap-1.5 px-4 py-2 bg-violet-100 text-violet-700 rounded-xl text-sm font-medium hover:bg-violet-200 transition-colors disabled:opacity-50">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 0110 10 10 10 0 01-10 10A10 10 0 012 12 10 10 0 0112 2m0 5v7l4 2" />
              </svg>
              {seeding ? "Заполняю..." : "Авто-заполнить"}
            </button>
          </div>
          <div className="space-y-3">
            {data.categories.map(cat => (
              <div key={cat.id} className={"border rounded-xl p-3 " + (cat.metaTitle ? "border-gray-100" : "border-amber-200 bg-amber-50/30")}>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-gray-800">{cat.name}</p>
                  <span className="text-xs text-gray-400">/{cat.slug}</span>
                  {!cat.metaTitle && <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-medium">Пусто</span>}
                </div>
                <div className="grid gap-2">
                  <div>
                    <span className="text-[10px] text-gray-400 mb-0.5 block">Meta Title (50-60 символов)</span>
                    <input
                      value={cat.metaTitle ?? ""}
                      onChange={e => updateCat(cat.id, "metaTitle", e.target.value)}
                      placeholder="Купить ... | GamePlaza"
                      maxLength={70}
                      className={"w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent " + (cat.metaTitle ? "bg-gray-50 border-gray-200" : "bg-white border-amber-200")}
                    />
                    <span className="text-[10px] text-gray-400 mt-0.5 block">{(cat.metaTitle ?? "").length}/70</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <span className="text-[10px] text-gray-400 mb-0.5 block">Meta Description (140-160 символов)</span>
                      <input
                        value={cat.metaDesc ?? ""}
                        onChange={e => updateCat(cat.id, "metaDesc", e.target.value)}
                        placeholder="Купить ... по лучшим ценам. Мгновенная доставка, гарантия."
                        maxLength={200}
                        className={"w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent " + (cat.metaDesc ? "bg-gray-50 border-gray-200" : "bg-white border-amber-200")}
                      />
                      <span className="text-[10px] text-gray-400 mt-0.5 block">{(cat.metaDesc ?? "").length}/200</span>
                    </div>
                    <button onClick={() => saveCat(cat)}
                      className="px-4 self-center bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors py-2 mt-4">
                      Сохранить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
