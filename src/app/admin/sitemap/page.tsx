"use client"
import { useEffect, useState, useCallback } from "react"

// ── Types ────────────────────────────────────────────────────────────────────
interface SitemapFile {
  id: number | string
  label: string
  url: string
  urlCount: number
  range: { from: number; to: number } | null
  isIndex: boolean
}
interface Stats {
  totalUrls: number
  breakdown: { static: number; categories: number; products: number }
  sitemapFiles: number
  revalidateSeconds: number
  sitemapIndex: string
}
interface ApiData {
  ok: boolean
  stats: Stats
  files: SitemapFile[]
  generatedAt: string
}

// ── SVG icons ─────────────────────────────────────────────────────────────────
function Icon({ path, size = 16, cls = "" }: { path: string; size?: number; cls?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={cls}>
      <path d={path} />
    </svg>
  )
}

const I = {
  globe:   "M12 2a10 10 0 110 20A10 10 0 0112 2zm0 0c-1.66 2.4-2.5 5.1-2.5 10s.84 7.6 2.5 10m0-20c1.66 2.4 2.5 5.1 2.5 10s-.84 7.6-2.5 10M2 12h20",
  file:    "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-2 12H8m4-4H8m6-6v6h6",
  link:    "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  copy:    "M8 17.929H6c-1.105 0-2-.912-2-2.036V5.036C4 3.91 4.895 3 6 3h8c1.105 0 2 .911 2 2.036v1.866m-6 .17h8c1.105 0 2 .91 2 2.035v10.857C20 21.09 19.105 22 18 22h-8c-1.105 0-2-.911-2-2.036V9.107c0-1.124.895-2.036 2-2.036z",
  check:   "M20 6L9 17l-5-5",
  refresh: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
  trash:   "M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6",
  zap:     "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  warn:    "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01",
  exlink:  "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6m4-3h6v6m-11 5L21 3",
  clock:   "M12 2a10 10 0 110 20A10 10 0 0112 2zm0 5v5l3 3",
  layers:  "M12 2l10 6.5L12 15 2 8.5 12 2zM2 15.5L12 22l10-6.5",
  tag:     "M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01",
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  label, value, icon, color, sub,
}: {
  label: string
  value: number | string
  icon: string
  color: string
  sub?: string
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon path={icon} size={18} cls="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900 leading-tight">
          {typeof value === "number" ? value.toLocaleString("ru") : value}
        </p>
        <p className="text-sm text-gray-500 mt-0.5 leading-tight">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyBtn({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }
  return (
    <button
      onClick={copy}
      title="Скопировать ссылку"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        copied
          ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent"
      }`}
    >
      <Icon path={copied ? I.check : I.copy} size={13} />
      {copied ? "Скопировано" : "Копировать"}
    </button>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: "ok" | "loading" | "error" }) {
  if (status === "loading") return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
      Обновляется
    </span>
  )
  if (status === "error") return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
      <Icon path={I.warn} size={12} cls="text-red-500" />
      Ошибка
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Актуален
    </span>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SitemapPage() {
  const [data, setData] = useState<ApiData | null>(null)
  const [fetchError, setFetchError] = useState("")
  const [fetchLoading, setFetchLoading] = useState(true)

  const [generating, setGenerating] = useState(false)
  const [clearingCache, setClearingCache] = useState(false)
  const [actionMsg, setActionMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      setFetchError("")
      const r = await fetch("/api/admin/sitemap")
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const d: ApiData = await r.json()
      setData(d)
    } catch (e) {
      setFetchError(String(e))
    } finally {
      setFetchLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    // Auto-refresh every 30 seconds
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [load])

  // ── Generate now ─────────────────────────────────────────────────────────
  async function handleGenerate() {
    setGenerating(true)
    setActionMsg(null)
    try {
      const r = await fetch("/api/admin/sitemap", { method: "POST" })
      const d = await r.json()
      if (d.ok) {
        setActionMsg({ ok: true, text: `${d.message} — ${new Date(d.at).toLocaleString("ru")}` })
        await load()
      } else {
        setActionMsg({ ok: false, text: d.error ?? "Неизвестная ошибка" })
      }
    } catch (e) {
      setActionMsg({ ok: false, text: String(e) })
    }
    setGenerating(false)
  }

  // ── Clear cache (same endpoint) ───────────────────────────────────────────
  async function handleClearCache() {
    setClearingCache(true)
    setActionMsg(null)
    try {
      const r = await fetch("/api/admin/sitemap", { method: "POST" })
      const d = await r.json()
      setActionMsg(d.ok
        ? { ok: true, text: `Кэш очищен — ${new Date(d.at).toLocaleString("ru")}` }
        : { ok: false, text: d.error ?? "Ошибка" })
      await load()
    } catch (e) {
      setActionMsg({ ok: false, text: String(e) })
    }
    setClearingCache(false)
  }

  // ── Format helpers ────────────────────────────────────────────────────────
  function fmtDate(iso: string) {
    const d = new Date(iso)
    return d.toLocaleString("ru", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
  }
  function fmtInterval(sec: number) {
    if (sec < 60) return `${sec} сек`
    if (sec < 3600) return `${sec / 60} мин`
    return `${sec / 3600} ч`
  }

  const stats = data?.stats
  const files = data?.files ?? []
  const productFiles = files.filter(f => !f.isIndex && f.id !== 0)
  const overallStatus: "ok" | "loading" | "error" = fetchLoading ? "loading" : fetchError ? "error" : "ok"

  return (
    <div className="p-6 space-y-6 max-w-5xl">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center">
              <Icon path={I.globe} size={18} cls="text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Sitemap</h1>
            <StatusBadge status={overallStatus} />
          </div>
          <div className="text-sm text-gray-500 ml-12 space-y-0.5">
            {data && (
              <>
                <p>Обновлено: <span className="text-gray-700 font-medium">{fmtDate(data.generatedAt)}</span></p>
                <p>Автообновление: каждые <span className="text-gray-700 font-medium">{fmtInterval(stats?.revalidateSeconds ?? 3600)}</span> (ISR)</p>
              </>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={handleClearCache}
            disabled={clearingCache || generating}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
          >
            <Icon path={I.trash} size={14} cls={clearingCache ? "animate-spin" : ""} />
            {clearingCache ? "Очищаю..." : "Очистить кэш"}
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating || clearingCache}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {generating
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Генерирую...</>
              : <><Icon path={I.zap} size={14} />Сгенерировать сейчас</>}
          </button>
        </div>
      </div>

      {/* ── Action message ───────────────────────────────────────────────── */}
      {actionMsg && (
        <div className={`flex items-center gap-3 p-3.5 rounded-xl text-sm border ${
          actionMsg.ok
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          <Icon path={actionMsg.ok ? I.check : I.warn} size={15} />
          {actionMsg.text}
        </div>
      )}

      {/* ── Fetch error ──────────────────────────────────────────────────── */}
      {fetchError && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl text-sm bg-red-50 border border-red-200 text-red-800">
          <Icon path={I.warn} size={15} />
          Ошибка загрузки: {fetchError}
        </div>
      )}

      {/* ── Loading skeleton ─────────────────────────────────────────────── */}
      {fetchLoading && !data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
              <div className="w-10 h-10 bg-gray-100 rounded-xl mb-3" />
              <div className="h-6 bg-gray-100 rounded w-16 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-20" />
            </div>
          ))}
        </div>
      )}

      {/* ── Stats grid ───────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            label="Всего URL" value={stats.totalUrls}
            icon={I.globe} color="bg-violet-600"
          />
          <StatCard
            label="Товаров" value={stats.breakdown.products}
            icon={I.tag} color="bg-blue-600"
          />
          <StatCard
            label="Категорий" value={stats.breakdown.categories}
            icon={I.layers} color="bg-indigo-500"
          />
          <StatCard
            label="Стат. страниц" value={stats.breakdown.static}
            icon={I.file} color="bg-slate-500"
          />
          <StatCard
            label="Файлов Sitemap" value={stats.sitemapFiles}
            icon={I.layers} color="bg-emerald-600"
          />
          <StatCard
            label="Обновление" value={fmtInterval(stats.revalidateSeconds)}
            icon={I.clock} color="bg-amber-500"
            sub="ISR авто"
          />
        </div>
      )}

      {/* ── Sitemap files ────────────────────────────────────────────────── */}
      {files.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Icon path={I.layers} size={15} cls="text-gray-400" />
              Структура Sitemap
            </h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{files.length} файлов</span>
          </div>

          <div className="divide-y divide-gray-100">
            {files.map((f) => (
              <div
                key={String(f.id)}
                className={`flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 hover:bg-gray-50/60 transition-colors ${
                  f.isIndex ? "bg-violet-50/40" : ""
                }`}
              >
                {/* Icon + name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    f.isIndex ? "bg-violet-100" : f.id === 0 ? "bg-blue-100" : "bg-gray-100"
                  }`}>
                    <Icon
                      path={f.isIndex ? I.globe : f.id === 0 ? I.layers : I.file}
                      size={14}
                      cls={f.isIndex ? "text-violet-600" : f.id === 0 ? "text-blue-600" : "text-gray-500"}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{f.label}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {f.range && (
                        <span className="text-xs text-gray-400">
                          Товары {f.range.from.toLocaleString("ru")}–{f.range.to.toLocaleString("ru")}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {f.isIndex
                          ? `Ссылается на ${f.urlCount} файлов`
                          : `${f.urlCount.toLocaleString("ru")} URL`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* URL + buttons */}
                <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                  <code className="text-xs text-gray-400 font-mono hidden lg:block truncate max-w-[200px]">
                    {f.url.split("/").slice(-2).join("/")}
                  </code>
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent transition-colors"
                  >
                    <Icon path={I.exlink} size={13} />
                    Открыть
                  </a>
                  <CopyBtn url={f.url} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Progress note for large catalogs ─────────────────────────────── */}
      {productFiles.length > 5 && (
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800">
          <Icon path={I.zap} size={15} cls="text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium mb-0.5">Большой каталог — {productFiles.length} файлов товаров</p>
            <p className="text-blue-700 text-xs">
              Система автоматически разбивает все {stats?.breakdown.products.toLocaleString("ru")} товаров на файлы по {(1000).toLocaleString("ru")} URL.
              При добавлении новых товаров файлы создаются автоматически.
            </p>
          </div>
        </div>
      )}

      {/* ── SEO checklist ────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Соответствие требованиям SEO</h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          {[
            { ok: true, text: "Sitemap автоматически обновляется каждый час (ISR revalidate=3600)" },
            { ok: true, text: "Не более 1 000 URL в каждом файле Sitemap" },
            { ok: true, text: "robots.txt настроен и указывает на sitemap.xml" },
            { ok: true, text: "Популярные товары имеют повышенный приоритет (0.85 vs 0.65)" },
            { ok: true, text: "Административные, API и авторизационные страницы исключены" },
            { ok: true, text: "Поисковые запросы /catalog?q=… не индексируются" },
            { ok: true, text: "Sitemap Index автоматически включает все дочерние файлы" },
            { ok: true, text: "Масштабируется до 1 000 000+ товаров без изменения архитектуры" },
            { ok: true, text: "Страницы /privacy, /terms, /refund, /reviews включены в Sitemap" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${item.ok ? "bg-emerald-100" : "bg-amber-100"}`}>
                <Icon path={item.ok ? I.check : I.warn} size={11} cls={item.ok ? "text-emerald-600" : "text-amber-600"} />
              </div>
              <span className={item.ok ? "text-gray-700" : "text-amber-700"}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Search Console hint ───────────────────────────────────────────── */}
      {stats?.sitemapIndex && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Добавьте в Google Search Console и Яндекс.Вебмастер:
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-sm font-mono text-violet-700 bg-violet-50 px-3 py-1.5 rounded-lg border border-violet-100 flex-1 min-w-0 break-all">
              {stats.sitemapIndex}
            </code>
            <CopyBtn url={stats.sitemapIndex} />
          </div>
        </div>
      )}
    </div>
  )
}
