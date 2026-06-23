import { prisma } from "../../lib/prisma"
import Link from "next/link"
import Image from "next/image"
import { LogCleanupButton } from "../../components/admin/LogCleanupButton"

export const revalidate = 30

// Minimal SVG icon helper (server-side JSX)
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
}

export default async function AdminDashboard() {
  const now = new Date()
  const today    = new Date(now); today.setHours(0, 0, 0, 0)
  const since24h = new Date(Date.now() - 86_400_000)
  const since7d  = new Date(Date.now() - 7 * 86_400_000)

  const [
    totalProducts, activeProducts, totalUsers, totalCategories, totalReviews,
    ordersToday, revenueToday, ordersWeek, revenueWeek,
    platiSuccess, platiErrors, platiSkipped,
    sysErrors, cspNew,
    autoSession, pendingSync,
    recentProducts,
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
    prisma.systemLog.count({ where: { level: "error", createdAt: { gte: since24h } } }).catch(() => 0),
    prisma.systemLog.count({ where: { category: "csp-violation", status: "new" } }).catch(() => 0),
    prisma.autoImportSession.findFirst({ where: { status: { in: ["running", "paused"] } }, select: { status: true, doneCount: true, totalCount: true, errorCount: true, skipCount: true } }).catch(() => null),
    prisma.product.count({ where: { importSource: "plati", OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: since24h } }] } }).catch(() => 0),
    prisma.product.findMany({ where: { importSource: "plati", isActive: true }, select: { id: true, slug: true, name: true, imageUrl: true, price: true }, orderBy: { importedAt: "desc" }, take: 6 }).catch(() => []),
  ])

  const hiddenProducts = totalProducts - activeProducts
  const revenue  = (revenueToday as { _sum?: { totalAmount?: number | null } } | null)?._sum?.totalAmount ?? 0
  const revenueW = (revenueWeek  as { _sum?: { totalAmount?: number | null } } | null)?._sum?.totalAmount ?? 0
  const autoPct  = autoSession?.totalCount ? Math.round((autoSession.doneCount / autoSession.totalCount) * 100) : null

  const kpi = [
    {
      label: "Активных товаров", value: activeProducts.toLocaleString("ru-RU"),
      sub: hiddenProducts + " скрыто · " + totalProducts.toLocaleString("ru-RU") + " всего",
      icon: ICONS.products, href: "/admin/products",
      color: "bg-violet-50 text-violet-600", border: "border-violet-100",
    },
    {
      label: "Пользователей", value: totalUsers.toLocaleString("ru-RU"),
      sub: totalReviews + " отзывов · " + totalCategories + " категорий",
      icon: ICONS.users, href: "/admin/users",
      color: "bg-blue-50 text-blue-600", border: "border-blue-100",
    },
    {
      label: "Заказов сегодня", value: ordersToday.toLocaleString("ru-RU"),
      sub: revenue > 0 ? revenue.toLocaleString("ru-RU") + " ₽ выручка" : "нет продаж",
      icon: ICONS.orders, href: "/admin/orders",
      color: ordersToday > 0 ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-gray-400", border: "border-emerald-100",
    },
    {
      label: "За 7 дней", value: ordersWeek.toLocaleString("ru-RU") + " заказов",
      sub: revenueW > 0 ? revenueW.toLocaleString("ru-RU") + " ₽" : "нет данных",
      icon: ICONS.chart, href: "/admin/analytics",
      color: ordersWeek > 0 ? "bg-amber-50 text-amber-600" : "bg-gray-50 text-gray-400", border: "border-amber-100",
    },
  ]

  const systemChecks = [
    { label: "Ошибок за 24ч",   val: sysErrors,      warn: sysErrors > 0,      href: "/admin/monitoring", icon: ICONS.warn },
    { label: "CSP нарушений",   val: cspNew,          warn: cspNew > 0,         href: "/admin/security",   icon: ICONS.shield },
    { label: "Скрытых товаров", val: hiddenProducts,  warn: hiddenProducts > 100, href: "/admin/products", icon: ICONS.products },
    { label: "Категорий",       val: totalCategories, warn: false,               href: "/admin/categories", icon: ICONS.folder },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Дашборд</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {now.toLocaleDateString("ru-RU", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <Link href="/" target="_blank"
          className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 hover:bg-white transition-all">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6m4-3h6v6m-11 5L21 3" />
          </svg>
          Магазин
        </Link>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpi.map(s => (
          <Link key={s.label} href={s.href}
            className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all block">
            <div className={"w-10 h-10 rounded-xl flex items-center justify-center " + s.color}>
              <Ico d={s.icon} />
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-3 leading-none">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1.5 font-medium">{s.label}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{s.sub}</p>
          </Link>
        ))}
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Auto-import status */}
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
              "bg-gray-50 text-gray-400"
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
                    <span className="font-semibold">{autoPct}%</span>
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
            <p className="text-sm text-gray-400 text-center py-3">Нет активной сессии</p>
          )}

          <Link href="/admin/auto-import"
            className="mt-4 flex items-center justify-center gap-1 text-sm text-violet-600 hover:text-violet-700 font-medium">
            Управление →
          </Link>
        </div>

        {/* Plati today */}
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
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-600">
              <Ico d={ICONS.system} />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm">Состояние системы</h3>
          </div>
          <div className="space-y-1">
            {systemChecks.map(s => (
              <Link key={s.label} href={s.href}
                className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors">
                <span className="text-sm text-gray-600">{s.label}</span>
                {s.warn && s.val > 0 ? (
                  <span className="flex items-center gap-1 text-rose-500 font-semibold text-sm">
                    <Ico d={ICONS.warn} cls="w-3.5 h-3.5" />
                    {s.val}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-500 text-sm font-semibold">
                    {s.label === "Категорий" || s.label === "Скрытых товаров" ? s.val : "OK"}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent products */}
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
                    <div className="w-full h-full flex items-center justify-center text-2xl opacity-20">&#127918;</div>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 line-clamp-2 leading-tight">{p.name}</p>
                <p className="text-[11px] font-bold text-violet-600 mt-0.5">{Number(p.price).toLocaleString("ru-RU")} &#8381;</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <LogCleanupButton />
      </div>
    </div>
  )
}