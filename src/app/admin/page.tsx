import { prisma } from "../../lib/prisma"
import Link from "next/link"
import Image from "next/image"
import { LogCleanupButton } from "../../components/admin/LogCleanupButton"
import { DismissAlertsButton } from "../../components/admin/DismissAlertsButton"

export const revalidate = 30

function Ico({ d, cls = "" }: { d: string; cls?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={cls}>
      <path d={d} />
    </svg>
  )
}

const ICONS = {
  products: "M6 11h2m5-2v4M5 8h14a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4a2 2 0 012-2z",
  users:    "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m16-4a4 4 0 00-3-3.87M23 21v-2a4 4 0 00-3-3.87M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  orders:   "M9 5H7a2 2 0 00-2 2v14l2-1 2 1 2-1 2 1 2-1 2 1V7a2 2 0 00-2-2h-2M9 5V3h6v2M9 5h6m-5 5h4m-4 4h2",
  chart:    "M3 3v18h18M7 16l4-4 4 4 5-8",
  refresh:  "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
  ok:       "M20 6L9 17l-5-5",
  warn:     "M12 8v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z",
  plati:    "M9 22a1 1 0 100-2 1 1 0 000 2zm7 0a1 1 0 100-2 1 1 0 000 2zM1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6",
  system:   "M12 15a3 3 0 100-6 3 3 0 000 6zm7.07 0h2m-20 0H1M12 5V3m0 18v-2M19.07 4.93l-1.41 1.41M6.34 17.66l-1.41 1.41M19.07 19.07l-1.41-1.41M6.34 6.34L4.93 4.93",
  folder:   "M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z",
  shield:   "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  trending: "M23 6l-9.5 9.5-5-5L1 18m22-12h-6m6 0v6",
}

// ── SVG mini bar chart (server-side) ─────────────────────────────────────────
interface DayData { date: string; orders: number; revenue: number }

function BarChart({ data, height = 48 }: { data: DayData[]; height?: number }) {
  const max = Math.max(...data.map(d => d.revenue), 1)
  const w = 280
  const barW = Math.floor(w / data.length) - 4
  const days = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"]

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${height + 20}`} preserveAspectRatio="none" className="overflow-visible">
      {data.map((d, i) => {
        const barH = Math.max(2, Math.round((d.revenue / max) * height))
        const x = i * (w / data.length) + 2
        const y = height - barH
        const date = new Date(d.date)
        const dayLabel = days[date.getDay() === 0 ? 6 : date.getDay() - 1]
        return (
          <g key={i}>
            <rect
              x={x} y={y} width={barW} height={barH}
              rx="3"
              fill={d.revenue > 0 ? "#7c3aed" : "#e5e7eb"}
              opacity={d.revenue > 0 ? 0.85 : 1}
            />
            <text x={x + barW / 2} y={height + 14} textAnchor="middle" fontSize="8" fill="#9ca3af">
              {dayLabel}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default async function AdminDashboard() {
  const now     = new Date()
  const today   = new Date(now); today.setHours(0, 0, 0, 0)
  const since24h = new Date(Date.now() - 86_400_000)
  const since7d  = new Date(Date.now() - 7 * 86_400_000)

  // Build date range for 7-day chart
  const days7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    d.setHours(0, 0, 0, 0)
    return d
  })

  const [
    totalProducts, activeProducts, totalUsers, totalCategories, totalReviews,
    ordersToday, revenueToday, ordersWeek, revenueWeek,
    platiSuccess, platiErrors, platiSkipped,
    sysErrors, cspNew,
    autoSession, pendingSync,
    recentProducts,
    ...dailyStats
  ] = await Promise.all([
    prisma.product.count().catch(() => 0),
    prisma.product.count({ where: { isActive: true } }).catch(() => 0),
    prisma.user.count().catch(() => 0),
    prisma.category.count().catch(() => 0),
    prisma.review.count().catch(() => 0),
    prisma.order.count({ where: { status: "paid", createdAt: { gte: today } } }).catch(() => 0),
    prisma.order.aggregate({ where: { status: "paid", createdAt: { gte: today } }, _sum: { totalAmount: true } }).catch(() => null),
    prisma.order.count({ where: { status: "paid", createdAt: { gte: since7d } } }).catch(() => 0),
    prisma.order.aggregate({ where: { status: "paid", createdAt: { gte: since7d } }, _sum: { totalAmount: true } }).catch(() => null),
    prisma.platiImportLog.count({ where: { status: "success", createdAt: { gte: today } } }).catch(() => 0),
    prisma.platiImportLog.count({ where: { status: "error",   createdAt: { gte: today } } }).catch(() => 0),
    prisma.platiImportLog.count({ where: { status: "skipped", createdAt: { gte: today } } }).catch(() => 0),
    prisma.systemLog.count({ where: { level: "error", status: "new", createdAt: { gte: since24h } } }).catch(() => 0),
    prisma.systemLog.count({ where: { category: "csp-violation", status: "new" } }).catch(() => 0),
    prisma.autoImportSession.findFirst({ where: { status: { in: ["running", "paused"] } }, select: { status: true, doneCount: true, totalCount: true, errorCount: true } }).catch(() => null),
    prisma.product.count({ where: { importSource: "plati", OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: since24h } }] } }).catch(() => 0),
    prisma.product.findMany({ where: { importSource: "plati", isActive: true }, select: { id: true, slug: true, name: true, imageUrl: true, price: true }, orderBy: { importedAt: "desc" }, take: 6 }).catch(() => []),
    // 7 daily order aggregates
    ...days7.map(d => {
      const end = new Date(d); end.setHours(23, 59, 59, 999)
      return prisma.order.aggregate({
        where: { status: "paid", createdAt: { gte: d, lte: end } },
        _sum: { totalAmount: true }, _count: true,
      }).catch(() => ({ _sum: { totalAmount: null }, _count: 0 }))
    }),
  ])

  const hiddenProducts = totalProducts - activeProducts
  const revenue  = (revenueToday as { _sum?: { totalAmount?: number | null } } | null)?._sum?.totalAmount ?? 0
  const revenueW = (revenueWeek  as { _sum?: { totalAmount?: number | null } } | null)?._sum?.totalAmount ?? 0
  const autoPct  = autoSession?.totalCount ? Math.round((autoSession.doneCount / autoSession.totalCount) * 100) : null

  const chartData: DayData[] = days7.map((d, i) => {
    const stat = dailyStats[i] as { _sum?: { totalAmount?: number | null }; _count: number }
    return {
      date:    d.toISOString().slice(0, 10),
      orders:  stat._count ?? 0,
      revenue: stat._sum?.totalAmount ?? 0,
    }
  })
  const hasRevenue = chartData.some(d => d.revenue > 0)

  const kpi = [
    {
      label: "Активных товаров", value: activeProducts.toLocaleString("ru-RU"),
      sub: hiddenProducts + " скрыто · " + totalProducts.toLocaleString("ru-RU") + " всего",
      icon: ICONS.products, href: "/admin/products",
      color: "bg-violet-50 text-violet-600",
      trend: null,
    },
    {
      label: "Пользователей", value: totalUsers.toLocaleString("ru-RU"),
      sub: totalReviews + " отзывов · " + totalCategories + " категорий",
      icon: ICONS.users, href: "/admin/users",
      color: "bg-blue-50 text-blue-600",
      trend: null,
    },
    {
      label: "Заказов сегодня", value: ordersToday.toLocaleString("ru-RU"),
      sub: revenue > 0 ? revenue.toLocaleString("ru-RU", { maximumFractionDigits: 0 }) + " ₽ выручка" : "нет продаж",
      icon: ICONS.orders, href: "/admin/orders",
      color: ordersToday > 0 ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-gray-400",
      trend: ordersToday > 0 ? "+" + ordersToday : null,
    },
    {
      label: "За 7 дней", value: ordersWeek.toLocaleString("ru-RU") + " заказов",
      sub: revenueW > 0 ? revenueW.toLocaleString("ru-RU", { maximumFractionDigits: 0 }) + " ₽" : "нет данных",
      icon: ICONS.chart, href: "/admin/analytics",
      color: ordersWeek > 0 ? "bg-amber-50 text-amber-600" : "bg-gray-50 text-gray-400",
      trend: null,
    },
  ]

  const systemChecks = [
    { label: "Ошибок за 24ч",   val: sysErrors,       warn: sysErrors > 0,        href: "/admin/monitoring", okText: "OK" },
    { label: "CSP нарушений",   val: cspNew,           warn: cspNew > 0,           href: "/admin/security",   okText: "OK" },
    { label: "Скрытых товаров", val: hiddenProducts,   warn: hiddenProducts > 100, href: "/admin/products",   okText: String(hiddenProducts) },
    { label: "Категорий",       val: totalCategories,  warn: false,                href: "/admin/categories", okText: String(totalCategories) },
  ]

  const hasAlerts = sysErrors > 0 || cspNew > 0

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Дашборд</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {now.toLocaleDateString("ru-RU", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <Link href="/" target="_blank"
          className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-white transition-all shadow-sm">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6m4-3h6v6m-11 5L21 3" />
          </svg>
          Магазин
        </Link>
      </div>

      {/* ── KPI Grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpi.map(s => (
          <Link key={s.label} href={s.href}
            className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all block group">
            <div className="flex items-start justify-between mb-3">
              <div className={"w-10 h-10 rounded-xl flex items-center justify-center " + s.color}>
                <Ico d={s.icon} />
              </div>
              {s.trend && (
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{s.trend}</span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900 leading-none">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1.5 font-medium">{s.label}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{s.sub}</p>
          </Link>
        ))}
      </div>

      {/* ── Revenue chart (7 days) ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center text-violet-600">
                <Ico d={ICONS.trending} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Выручка за 7 дней</h3>
                <p className="text-xs text-gray-400">
                  {revenueW > 0
                    ? revenueW.toLocaleString("ru-RU", { maximumFractionDigits: 0 }) + " ₽ · " + ordersWeek + " заказов"
                    : "Нет продаж за период"
                  }
                </p>
              </div>
            </div>
          </div>
          <Link href="/admin/analytics" className="text-xs text-violet-600 hover:text-violet-700 font-medium">
            Аналитика →
          </Link>
        </div>
        {hasRevenue ? (
          <div className="h-16 w-full">
            <BarChart data={chartData} height={48} />
          </div>
        ) : (
          <div className="h-16 flex items-center justify-center">
            <div className="text-center">
              <div className="flex items-end justify-center gap-1 mb-2 opacity-20">
                {[20, 35, 15, 45, 30, 10, 25].map((h, i) => (
                  <div key={i} className="w-6 bg-violet-400 rounded-sm" style={{ height: h }} />
                ))}
              </div>
              <p className="text-xs text-gray-400">Ещё нет продаж — появятся здесь</p>
            </div>
          </div>
        )}
        {hasRevenue && (
          <div className="mt-2 grid grid-cols-7 gap-0 text-center">
            {chartData.map((d, i) => (
              <div key={i} className="text-[9px] text-gray-400 tabular-nums">
                {d.revenue > 0 ? (d.revenue / 1000).toFixed(0) + "к" : ""}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Middle row: import + plati + system ────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Auto-import */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center text-violet-600">
                <Ico d={ICONS.refresh} />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">Авто-импорт</h3>
            </div>
            <span className={"text-[11px] font-semibold px-2.5 py-1 rounded-full " + (
              autoSession?.status === "running" ? "bg-emerald-50 text-emerald-600" :
              autoSession?.status === "paused"  ? "bg-amber-50 text-amber-600" :
              "bg-gray-50 text-gray-500"
            )}>
              {autoSession?.status === "running" ? "Работает" : autoSession?.status === "paused" ? "Пауза" : "Простой"}
            </span>
          </div>

          {autoSession ? (
            <div className="space-y-3">
              {autoPct !== null && (
                <>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{autoSession.doneCount} из {autoSession.totalCount}</span>
                    <span className="font-semibold text-violet-600">{autoPct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: autoPct + "%" }} />
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-emerald-50 rounded-xl p-2.5 text-center">
                  <div className="font-bold text-emerald-600 text-lg">{autoSession.doneCount}</div>
                  <div className="text-gray-500 mt-0.5">добавлено</div>
                </div>
                <div className="bg-rose-50 rounded-xl p-2.5 text-center">
                  <div className={"font-bold text-lg " + (autoSession.errorCount > 0 ? "text-rose-500" : "text-gray-400")}>{autoSession.errorCount}</div>
                  <div className="text-gray-500 mt-0.5">ошибок</div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">Нет активной сессии</p>
          )}

          <Link href="/admin/auto-import"
            className="mt-4 flex items-center justify-center gap-1 text-sm text-violet-600 hover:text-violet-700 font-medium">
            Управление →
          </Link>
        </div>

        {/* Plati.Market today */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
              <Ico d={ICONS.plati} />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm">Plati.Market сегодня</h3>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center mb-4">
            {[
              { label: "Добавлено",  value: platiSuccess, col: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Ошибок",     value: platiErrors,  col: platiErrors > 0 ? "text-rose-500" : "text-gray-400", bg: platiErrors > 0 ? "bg-rose-50" : "bg-gray-50" },
              { label: "Пропущено",  value: platiSkipped, col: "text-gray-400",    bg: "bg-gray-50" },
            ].map(s => (
              <div key={s.label} className={"rounded-xl p-2.5 " + s.bg}>
                <div className={"text-xl font-bold " + s.col}>{s.value}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-3">
            <span>Ожидают синхронизации</span>
            <span className={"font-bold " + (pendingSync > 50 ? "text-amber-500" : "text-gray-600")}>{pendingSync}</span>
          </div>
          <Link href="/admin/auto-import"
            className="mt-3 flex items-center justify-center gap-1 text-sm text-violet-600 hover:text-violet-700 font-medium">
            Открыть →
          </Link>
        </div>

        {/* System status */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-500">
                <Ico d={ICONS.system} />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">Состояние системы</h3>
            </div>
            {hasAlerts && <DismissAlertsButton />}
          </div>
          <div className="space-y-0.5">
            {systemChecks.map(s => (
              <Link key={s.label} href={s.href}
                className="flex items-center justify-between py-2 px-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors">
                <span className="text-sm text-gray-600">{s.label}</span>
                {s.warn && s.val > 0 ? (
                  <span className="flex items-center gap-1 text-rose-500 font-semibold text-sm">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01" />
                    </svg>
                    {s.val.toLocaleString("ru")}
                  </span>
                ) : (
                  <span className={`text-sm font-semibold ${s.warn ? "text-amber-500" : "text-emerald-500"}`}>
                    {s.okText}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent products ─────────────────────────────────────────────── */}
      {recentProducts.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Последние добавленные товары</h3>
            <Link href="/admin/products" className="text-sm text-violet-600 hover:text-violet-700 font-medium">
              Все товары →
            </Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {recentProducts.map(p => (
              <Link key={p.id} href={"/product/" + p.slug} target="_blank"
                className="group text-center hover:opacity-80 transition-opacity">
                <div className="aspect-square rounded-xl overflow-hidden bg-gray-50 border border-gray-100 mb-2 relative">
                  {p.imageUrl ? (
                    <Image src={p.imageUrl} alt={p.name} fill className="object-cover" sizes="80px" unoptimized={p.imageUrl.startsWith("/uploads/")} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl opacity-20">🎮</div>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 line-clamp-2 leading-tight">{p.name}</p>
                <p className="text-[11px] font-bold text-violet-600 mt-0.5">{Number(p.price).toLocaleString("ru-RU")} ₽</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Bottom row: log cleanup ─────────────────────────────────────── */}
      <div className="flex justify-end">
        <div className="w-full max-w-sm">
          <LogCleanupButton />
        </div>
      </div>

    </div>
  )
}
