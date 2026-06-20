"use client"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"

// ── Types ─────────────────────────────────────────────────────────────────────
interface Overview {
  views: Metric; visitors: Metric; todayViews: Metric; todayVisitors: Metric
  orders: Metric; revenue: Metric; registrations: Metric
  avgOrder: number; conversion: number
}
interface Metric { current: number; prev: number; change: number }
interface DashboardData {
  period: number; overview: Overview
  daily: { date: string; views: number; sessions: number }[]
  sources: Record<string, { source: string; count: number }[]>
  topPages: { path: string; views: number }[]
  devices: { name: string; count: number }[]
  browsers: { name: string; count: number }[]
  os: { name: string; count: number }[]
  countries: { name: string; count: number }[]
  utmCampaigns: { source: string; medium: string; campaign: string; views: number }[]
  keywords: { keyword: string; count: number }[]
  productViews: { productId: string; name: string; slug: string; views: number }[]
  productPurchases: { productId: string; name: string; purchases: number; revenue: number }[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "М"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "К"
  return String(n)
}
function fmtRub(n: number) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(n)
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })
}

// ── SVG Line Chart ─────────────────────────────────────────────────────────────
function LineChart({ data, color = "#6366f1", label = "просмотров" }: {
  data: { date: string; value: number }[]; color?: string; label?: string
}) {
  if (!data.length) return <div className="h-40 flex items-center justify-center text-gray-600 text-sm">Нет данных</div>

  const values = data.map(d => d.value)
  const max = Math.max(...values, 1)
  const min = 0
  const range = max - min

  const W = 400; const H = 100
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * W
    const y = H - ((d.value - min) / range) * H
    return [x, y] as [number, number]
  })

  const polyline = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")
  const area = `0,${H} ${polyline} ${W},${H}`

  const gradId = "lg-" + color.replace("#", "")

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-36" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#${gradId})`} />
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.5" fill={color} opacity="0.6" />
        ))}
      </svg>
      {/* X-axis labels */}
      <div className="flex justify-between mt-1 px-1">
        {data.filter((_, i) => i % Math.ceil(data.length / 6) === 0 || i === data.length - 1).map(d => (
          <span key={d.date} className="text-[10px] text-gray-600">{fmtDate(d.date)}</span>
        ))}
      </div>
    </div>
  )
}

// ── Horizontal Bar ─────────────────────────────────────────────────────────────
function HBar({ items, colorClass = "bg-brand/70", max: maxProp }: {
  items: { label: string; value: number; sublabel?: string }[]
  colorClass?: string; max?: number
}) {
  if (!items.length) return <p className="text-[var(--text-3)] text-sm text-center py-4">Нет данных</p>
  const max = maxProp ?? Math.max(...items.map(i => i.value), 1)
  return (
    <div className="space-y-2.5">
      {items.map((item, i) => (
        <div key={i}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400 truncate max-w-[60%]" title={item.label}>{item.label}</span>
            <span className="text-white font-medium">{item.value.toLocaleString("ru-RU")}{item.sublabel && <span className="text-gray-600 ml-1">{item.sublabel}</span>}</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${colorClass}`}
              style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Donut Slices ──────────────────────────────────────────────────────────────
function DonutChart({ items, colors }: { items: { name: string; count: number }[], colors: string[] }) {
  const total = items.reduce((s, i) => s + i.count, 0) || 1
  let offset = 0
  const r = 15.9155
  const C = 2 * Math.PI * r

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90">
        {items.map((item, i) => {
          const pct = item.count / total
          const dash = pct * C
          const gap = C - dash
          const el = (
            <circle key={i} cx="18" cy="18" r={r}
              fill="none" stroke={colors[i % colors.length]}
              strokeWidth="3.8"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset * C}
            />
          )
          offset += pct
          return el
        })}
        <circle cx="18" cy="18" r="12" fill="#0d0d14" />
      </svg>
      <div className="space-y-1.5 flex-1 min-w-0">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors[i % colors.length] }} />
            <span className="text-gray-400 truncate">{item.name}</span>
            <span className="text-white ml-auto">{Math.round(item.count / total * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, change, icon, format = "number" }: {
  label: string; value: number; change?: number; icon: string; format?: "number" | "rub" | "pct"
}) {
  const display = format === "rub" ? fmtRub(value) : format === "pct" ? `${value}%` : fmt(value)
  const up = (change ?? 0) >= 0
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-500 text-xs">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-[var(--text)] mb-1">{display}</div>
      {change !== undefined && (
        <div className={`text-xs font-medium ${up ? "text-emerald-400" : "text-red-400"}`}>
          {up ? "↑" : "↓"} {Math.abs(change)}% к прошлому периоду
        </div>
      )}
    </div>
  )
}

// ── Tab Button ─────────────────────────────────────────────────────────────────
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
      active ? "bg-brand text-white" : "text-gray-500 hover:text-white hover:bg-white/5"
    }`}>{children}</button>
  )
}

// ── Section Title ──────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[var(--text)] font-semibold mb-4">{children}</h3>
}

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"]
const SOURCE_ICONS: Record<string, string> = {
  direct: "🔗", search: "🔍", social: "📱", referral: "↗", utm: "📣", internal: "🏠"
}
const SOURCE_LABELS: Record<string, string> = {
  direct: "Прямые переходы", search: "Поисковые системы", social: "Социальные сети",
  referral: "Реферальные", utm: "Реклама (UTM)", internal: "Внутренние"
}

// ── TABS ──────────────────────────────────────────────────────────────────────

function OverviewTab({ d }: { d: DashboardData }) {
  const daily = d.daily.map(row => ({ date: row.date, value: row.views }))
  const dailySess = d.daily.map(row => ({ date: row.date, value: row.sessions }))
  const [chartMode, setChartMode] = useState<"views" | "sessions">("views")

  return (
    <div className="space-y-6">
      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Просмотры сегодня" value={d.overview.todayViews.current} change={d.overview.todayViews.change} icon="👁" />
        <StatCard label="Визиты сегодня" value={d.overview.todayVisitors.current} change={d.overview.todayVisitors.change} icon="👤" />
        <StatCard label={`Просмотры за ${d.period}д`} value={d.overview.views.current} change={d.overview.views.change} icon="📄" />
        <StatCard label={`Визиты за ${d.period}д`} value={d.overview.visitors.current} change={d.overview.visitors.change} icon="🧑" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Заказы" value={d.overview.orders.current} change={d.overview.orders.change} icon="🛒" />
        <StatCard label="Выручка" value={d.overview.revenue.current} change={d.overview.revenue.change} icon="💰" format="rub" />
        <StatCard label="Средний чек" value={Math.round(d.overview.avgOrder)} icon="🧾" format="rub" />
        <StatCard label="Конверсия" value={d.overview.conversion} icon="🎯" format="pct" />
      </div>

      {/* Chart */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Динамика за {d.period} дней</SectionTitle>
          <div className="flex gap-1 bg-white/5 rounded-lg p-1">
            <button onClick={() => setChartMode("views")} className={`text-xs px-3 py-1 rounded-md transition-colors ${chartMode === "views" ? "bg-brand text-white" : "text-[var(--text-3)]"}`}>Просмотры</button>
            <button onClick={() => setChartMode("sessions")} className={`text-xs px-3 py-1 rounded-md transition-colors ${chartMode === "sessions" ? "bg-brand text-white" : "text-[var(--text-3)]"}`}>Визиты</button>
          </div>
        </div>
        <LineChart data={chartMode === "views" ? daily : dailySess} />
      </div>

      {/* Registrations */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Регистрации" value={d.overview.registrations.current} change={d.overview.registrations.change} icon="📝" />
        <div className="card p-4">
          <p className="text-gray-500 text-xs mb-1">Страниц за визит</p>
          <p className="text-2xl font-bold text-[var(--text)]">{d.overview.visitors.current > 0 ? (d.overview.views.current / d.overview.visitors.current).toFixed(1) : "—"}</p>
        </div>
      </div>
    </div>
  )
}

function TrafficTab({ d }: { d: DashboardData }) {
  const allSources = Object.entries(d.sources)
  const totalByType = allSources.map(([type, items]) => ({
    label: SOURCE_LABELS[type] ?? type,
    value: items.reduce((s, i) => s + i.count, 0),
  })).sort((a, b) => b.value - a.value)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Type breakdown */}
        <div className="card p-5">
          <SectionTitle>По типу трафика</SectionTitle>
          <HBar items={totalByType} />
        </div>

        {/* Donut */}
        <div className="card p-5">
          <SectionTitle>Распределение</SectionTitle>
          {totalByType.length ? (
            <DonutChart
              items={totalByType.map(t => ({ name: t.label, count: t.value }))}
              colors={COLORS}
            />
          ) : <p className="text-[var(--text-3)] text-sm text-center py-8">Нет данных</p>}
        </div>
      </div>

      {/* Per-type sources */}
      {allSources.map(([type, items]) => (
        <div key={type} className="card p-5">
          <SectionTitle>{SOURCE_ICONS[type] ?? "🌐"} {SOURCE_LABELS[type] ?? type}</SectionTitle>
          <HBar
            items={items.map(i => ({ label: i.source, value: i.count }))}
            colorClass={type === "search" ? "bg-blue-500/70" : type === "social" ? "bg-purple-500/70" : type === "utm" ? "bg-amber-500/70" : "bg-brand/70"}
          />
        </div>
      ))}

      {/* Referral sites */}
      {d.sources.referral?.length > 0 && (
        <div className="card p-5">
          <SectionTitle>↗ Сайты-источники переходов</SectionTitle>
          <div className="space-y-2">
            {d.sources.referral.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--border)]">
                <a href={`https://${r.source}`} target="_blank" rel="noopener noreferrer" className="text-brand text-sm hover:underline">{r.source}</a>
                <span className="text-[var(--text)] font-semibold text-sm">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PagesTab({ d }: { d: DashboardData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <SectionTitle>Популярные страницы</SectionTitle>
          {d.topPages.length ? (
            <div className="space-y-2">
              {d.topPages.slice(0, 15).map((p, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-[var(--border)]">
                  <span className="text-gray-600 text-xs w-4 text-right">{i + 1}</span>
                  <a href={p.path} target="_blank" rel="noopener noreferrer"
                    className="flex-1 text-sm text-brand hover:underline truncate" title={p.path}>{p.path}</a>
                  <span className="text-[var(--text)] font-semibold text-sm">{p.views}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-[var(--text-3)] text-sm py-8 text-center">Нет данных</p>}
        </div>

        <div className="card p-5">
          <SectionTitle>🔍 Поисковые запросы</SectionTitle>
          <p className="text-gray-600 text-xs mb-4">Запросы, по которым пришли из поисковых систем</p>
          {d.keywords.length ? (
            <HBar items={d.keywords.map(k => ({ label: k.keyword, value: k.count }))} colorClass="bg-blue-500/70" />
          ) : (
            <div className="text-center py-8">
              <p className="text-[var(--text-3)] text-sm">Нет данных о поисковых запросах</p>
              <p className="text-gray-700 text-xs mt-2">Запросы собираются из параметра ?q= реферера поисковых систем</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AudienceTab({ d }: { d: DashboardData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-5">
          <SectionTitle>📱 Устройства</SectionTitle>
          {d.devices.length ? (
            <DonutChart
              items={d.devices.filter(d => d.name)}
              colors={["#6366f1", "#10b981", "#f59e0b"]}
            />
          ) : <p className="text-[var(--text-3)] text-sm text-center py-4">Нет данных</p>}
        </div>
        <div className="card p-5">
          <SectionTitle>🌐 Браузеры</SectionTitle>
          {d.browsers.length ? (
            <DonutChart items={d.browsers.filter(b => b.name)} colors={COLORS} />
          ) : <p className="text-[var(--text-3)] text-sm text-center py-4">Нет данных</p>}
        </div>
        <div className="card p-5">
          <SectionTitle>💻 Операционные системы</SectionTitle>
          {d.os.length ? (
            <DonutChart items={d.os.filter(o => o.name)} colors={["#3b82f6", "#22c55e", "#a855f7", "#f97316", "#64748b"]} />
          ) : <p className="text-[var(--text-3)] text-sm text-center py-4">Нет данных</p>}
        </div>
      </div>

      <div className="card p-5">
        <SectionTitle>🌍 География — топ стран</SectionTitle>
        {d.countries.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
            {d.countries.map((c, i) => {
              const total = d.countries.reduce((s, x) => s + x.count, 0) || 1
              return (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-[var(--border)]">
                  <span className="text-gray-600 text-xs w-4 text-right">{i + 1}</span>
                  <span className="flex-1 text-sm text-gray-300">{c.name}</span>
                  <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-brand/70 rounded-full" style={{ width: `${(c.count / total) * 100}%` }} />
                  </div>
                  <span className="text-[var(--text)] text-sm font-medium w-10 text-right">{c.count}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-[var(--text-3)] text-sm">Данные о географии собираются через ip-api.com</p>
            <p className="text-gray-700 text-xs mt-2">Появятся после накопления трафика</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ProductsTab({ d }: { d: DashboardData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <SectionTitle>👁 Самые просматриваемые товары</SectionTitle>
          {d.productViews.length ? (
            <div className="space-y-2">
              {d.productViews.map((p, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-[var(--border)]">
                  <span className="text-gray-600 text-xs w-4 text-right">{i + 1}</span>
                  <Link href={`/catalog/${p.slug}`} target="_blank" className="flex-1 text-sm text-brand hover:underline truncate" title={p.name}>{p.name}</Link>
                  <span className="text-[var(--text)] font-semibold text-sm">{p.views} просм.</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-[var(--text-3)] text-sm">Просмотры товаров будут отображаться здесь</p>
              <p className="text-gray-700 text-xs mt-2">Вызывайте <code className="text-[var(--text-3)]">trackEvent("product_view")</code> на странице товара</p>
            </div>
          )}
        </div>

        <div className="card p-5">
          <SectionTitle>🛒 Топ по продажам</SectionTitle>
          {d.productPurchases.length ? (
            <div className="space-y-2">
              {d.productPurchases.map((p, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-[var(--border)]">
                  <span className="text-gray-600 text-xs w-4 text-right">{i + 1}</span>
                  <span className="flex-1 text-sm text-gray-300 truncate" title={p.name}>{p.name}</span>
                  <div className="text-right">
                    <div className="text-emerald-400 font-semibold text-sm">{fmtRub(p.revenue)}</div>
                    <div className="text-gray-600 text-xs">{p.purchases} шт.</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-[var(--text-3)] text-sm">Продажи появятся после покупок</p>
              <p className="text-gray-700 text-xs mt-2">Вызывайте <code className="text-[var(--text-3)]">trackEvent("purchase", {"{"} value, productId {"}"} )</code></p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function UtmTab({ d }: { d: DashboardData }) {
  return (
    <div className="space-y-5">
      <div className="card p-5">
        <SectionTitle>📣 UTM-кампании</SectionTitle>
        {d.utmCampaigns.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-600 text-left border-b border-[var(--border)]">
                  {["utm_source", "utm_medium", "utm_campaign", "Переходы"].map(h => (
                    <th key={h} className="pb-3 pr-4 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.utmCampaigns.map((u, i) => (
                  <tr key={i} className="border-b border-[var(--border)] hover:bg-white/2">
                    <td className="py-2.5 pr-4 text-brand">{u.source}</td>
                    <td className="py-2.5 pr-4 text-gray-400">{u.medium}</td>
                    <td className="py-2.5 pr-4 text-gray-300">{u.campaign}</td>
                    <td className="py-2.5 font-semibold text-white">{u.views}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-4xl mb-4">📣</p>
            <p className="text-white font-medium mb-2">UTM-метки не найдены</p>
            <p className="text-[var(--text-3)] text-sm">Добавляйте UTM-параметры к ссылкам в рекламных кампаниях</p>
            <div className="card p-4 mt-4 text-left text-xs text-gray-500">
              <p className="font-medium text-gray-400 mb-2">Пример ссылки:</p>
              <code className="text-gray-300 break-all">gameplaza.site/?utm_source=telegram&utm_medium=post&utm_campaign=sale2024</code>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ExportTab({ period }: { period: number }) {
  const [loading, setLoading] = useState<string | null>(null)

  async function download(type: string, label: string) {
    setLoading(type)
    try {
      const res = await fetch(`/api/analytics/export?type=${type}&period=${period}`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url; a.download = `${type}-${period}d.csv`; a.click()
      URL.revokeObjectURL(url)
    } catch { alert("Ошибка при экспорте") }
    setLoading(null)
  }

  const exports = [
    { type: "pageviews", label: "Просмотры страниц", desc: "Все просмотры с источником, UTM, устройством, страной (до 10К строк)" },
    { type: "events", label: "События", desc: "Покупки, просмотры товаров, добавления в корзину, регистрации" },
    { type: "summary", label: "Сводка по дням", desc: "Агрегированная статистика: просмотры, визиты, заказы, выручка по дням" },
  ]

  return (
    <div className="space-y-4 max-w-lg">
      <div className="card p-4 mb-2 border-amber-500/20">
        <p className="text-amber-400 text-sm">📁 Файлы сохраняются в формате CSV с поддержкой Excel (UTF-8 BOM)</p>
      </div>
      {exports.map(e => (
        <div key={e.type} className="card p-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-white font-medium mb-1">{e.label}</p>
            <p className="text-gray-500 text-xs">{e.desc}</p>
          </div>
          <button onClick={() => download(e.type, e.label)} disabled={loading === e.type}
            className="btn-outline text-sm py-2 px-4 flex-shrink-0 disabled:opacity-50">
            {loading === e.type ? "⏳" : "⬇"} CSV
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
type TabKey = "overview" | "traffic" | "pages" | "audience" | "products" | "utm" | "export"

export default function AdminAnalyticsPage() {
  const [tab, setTab] = useState<TabKey>("overview")
  const [period, setPeriod] = useState(30)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/analytics/dashboard?period=${period}`)
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Ошибка") }
      setData(await res.json())
      setLastRefresh(new Date())
    } catch (e) { setError(e instanceof Error ? e.message : "Ошибка загрузки") }
    setLoading(false)
  }, [period])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const t = setInterval(load, 60_000)
    return () => clearInterval(t)
  }, [load])

  const TABS: { key: TabKey; label: string }[] = [
    { key: "overview", label: "📊 Обзор" },
    { key: "traffic", label: "🌐 Трафик" },
    { key: "pages", label: "📄 Страницы" },
    { key: "audience", label: "👥 Аудитория" },
    { key: "products", label: "🎮 Товары" },
    { key: "utm", label: "📣 UTM" },
    { key: "export", label: "⬇ Экспорт" },
  ]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Аналитика</h1>
          <p className="text-[var(--text-3)] text-sm mt-1">
            {lastRefresh ? `Обновлено: ${lastRefresh.toLocaleTimeString("ru-RU")}` : "Загрузка..."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="flex gap-1 bg-white/5 rounded-xl p-1">
            {([7, 30, 90] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${period === p ? "bg-brand text-white" : "text-gray-500 hover:text-white"}`}>
                {p}д
              </button>
            ))}
          </div>
          <button onClick={load} disabled={loading}
            className="btn-ghost text-sm py-1.5 px-3 disabled:opacity-50">
            {loading ? "↻" : "↻"} {loading ? "..." : "Обновить"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white/5 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <Tab key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>{t.label}</Tab>
        ))}
      </div>

      {/* Content */}
      {error && (
        <div className="card p-5 border-red-500/20 mb-6">
          <p className="text-red-400">❌ {error}</p>
        </div>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[var(--text-3)] text-sm">Загрузка аналитики...</p>
          </div>
        </div>
      )}

      {data && (
        <div className={loading ? "opacity-60 pointer-events-none" : ""}>
          {tab === "overview" && <OverviewTab d={data} />}
          {tab === "traffic" && <TrafficTab d={data} />}
          {tab === "pages" && <PagesTab d={data} />}
          {tab === "audience" && <AudienceTab d={data} />}
          {tab === "products" && <ProductsTab d={data} />}
          {tab === "utm" && <UtmTab d={data} />}
          {tab === "export" && <ExportTab period={period} />}
        </div>
      )}

      <div className="mt-8 pt-5 border-t border-[var(--border)] flex flex-wrap gap-2">
        <Link href="/admin" className="btn-ghost text-sm py-2 px-4">← Дашборд</Link>
        <Link href="/admin/import" className="btn-ghost text-sm py-2 px-4">⬇ Импорт</Link>
        <Link href="/" target="_blank" className="btn-ghost text-sm py-2 px-4">🌐 Сайт</Link>
      </div>
    </div>
  )
}
