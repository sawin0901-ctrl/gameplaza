"use client"
import { useEffect, useState } from "react"

interface SitemapStats {
  totalUrls: number
  breakdown: { static: number; categories: number; products: number }
  sitemapFiles: number
  sitemapIndex: string
}

interface SitemapData { ok: boolean; stats: SitemapStats; generatedAt: string }

function StatCard({ label, value, color = "text-brand" }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center">
      <p className={`text-3xl font-bold ${color}`}>{typeof value === "number" ? value.toLocaleString("ru") : value}</p>
      <p className="text-[var(--text-3)] text-sm mt-1">{label}</p>
    </div>
  )
}

export default function SitemapPage() {
  const [data, setData] = useState<SitemapData | null>(null)
  const [loading, setLoading] = useState(false)
  const [revalMsg, setRevalMsg] = useState("")

  async function load() { const r = await fetch("/api/admin/sitemap"); setData(await r.json()) }
  async function revalidate() {
    setLoading(true); setRevalMsg("")
    const r = await fetch("/api/admin/sitemap", { method: "POST" })
    const d = await r.json()
    setRevalMsg(d.ok ? `✅ ${d.message} (${new Date(d.at).toLocaleTimeString("ru")})` : `❌ ${d.error}`)
    setLoading(false); await load()
  }

  useEffect(() => { load() }, [])

  const base = data?.stats.sitemapIndex?.replace("/sitemap.xml", "") ?? "https://gameplaza.site"

  const SITEMAPS = [
    { label: "Sitemap Index (главный)", url: `${base}/sitemap.xml`, desc: "Ссылки на все под-сайтмапы" },
    { label: "Статические страницы + Категории", url: `${base}/sitemap/0.xml`, desc: `4 стат. + ${data?.stats.breakdown.categories ?? 0} категорий` },
    ...Array.from({ length: Math.max(0, (data?.stats.sitemapFiles ?? 1) - 1) }, (_, i) => ({
      label: `Товары — часть ${i + 1}`,
      url: `${base}/sitemap/${i + 1}.xml`,
      desc: `до 1000 товаров (${i * 1000 + 1}–${Math.min((i + 1) * 1000, data?.stats.breakdown.products ?? 0)})`,
    })),
  ]

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Sitemap</h1>
          {data && <p className="text-[var(--text-3)] text-sm mt-1">Обновлено: {new Date(data.generatedAt).toLocaleString("ru")} · ISR каждый час</p>}
        </div>
        <button onClick={revalidate} disabled={loading} className="px-4 py-2 bg-brand text-white rounded-lg text-sm disabled:opacity-50">
          {loading ? "Обновляю..." : "Сбросить кэш"}
        </button>
      </div>

      {revalMsg && <div className="mb-4 px-4 py-2 bg-[var(--bg-secondary)] rounded-lg text-sm text-[var(--text-2)]">{revalMsg}</div>}

      {data?.stats && (
        <>
          <div className="grid grid-cols-4 gap-3 mb-6">
            <StatCard label="Всего URL" value={data.stats.totalUrls} color="text-brand" />
            <StatCard label="Товаров" value={data.stats.breakdown.products} color="text-green-400" />
            <StatCard label="Категорий" value={data.stats.breakdown.categories} color="text-blue-400" />
            <StatCard label="Файлов Sitemap" value={data.stats.sitemapFiles} color="text-purple-400" />
          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <p className="font-medium text-[var(--text)]">Структура Sitemap</p>
            </div>
            {SITEMAPS.map((s, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] last:border-0">
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">{s.label}</p>
                  <p className="text-xs text-[var(--text-3)] mt-0.5">{s.desc}</p>
                </div>
                <a href={s.url} target="_blank" rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[var(--bg-secondary)] text-brand rounded-lg text-xs hover:bg-brand/10 transition font-mono">
                  {s.url.split("/").slice(-2).join("/")} ↗
                </a>
              </div>
            ))}
          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <p className="font-medium text-[var(--text)] mb-3">Настройки SEO</p>
            <div className="space-y-2 text-sm text-[var(--text-2)]">
              <div className="flex items-center gap-3">
                <span className="text-green-400">✓</span>
                <span>Sitemap автоматически обновляется каждый час (ISR revalidate=3600)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-400">✓</span>
                <span>robots.txt настроен и указывает на sitemap.xml</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-400">✓</span>
                <span>Популярные товары имеют приоритет 0.85 vs 0.65 для обычных</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-400">✓</span>
                <span>Административные, API, авторизационные страницы исключены из индексации</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-400">✓</span>
                <span>Поисковые запросы /catalog?q=... не индексируются</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-400">✓</span>
                <span>GPTBot, ChatGPT-User, CCBot заблокированы в robots.txt</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-blue-400">ℹ</span>
                <span>При &gt;1000 товаров автоматически создаётся sitemap index с несколькими файлами</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-[var(--bg-secondary)] rounded-xl text-xs font-mono text-[var(--text-3)] space-y-1">
            <p className="text-[var(--text-2)] font-semibold mb-2">Добавьте в Google Search Console:</p>
            <p>{data.stats.sitemapIndex}</p>
          </div>
        </>
      )}
    </div>
  )
}
