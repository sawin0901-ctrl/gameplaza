import { prisma } from "../../lib/prisma"
import Link from "next/link"
import Image from "next/image"
import { LogCleanupButton } from "../../components/admin/LogCleanupButton"

export const revalidate = 30

export default async function AdminDashboard() {
  const now = new Date()
  const today = new Date(now); today.setHours(0, 0, 0, 0)
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

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
    prisma.platiImportLog.count({ where: { status: "error", createdAt: { gte: today } } }).catch(() => 0),
    prisma.platiImportLog.count({ where: { status: "skipped", createdAt: { gte: today } } }).catch(() => 0),
    prisma.systemLog.count({ where: { level: "error", createdAt: { gte: since24h } } }).catch(() => 0),
    prisma.systemLog.count({ where: { category: "csp-violation", status: "new" } }).catch(() => 0),
    prisma.autoImportSession.findFirst({ where: { status: { in: ["running", "paused"] } }, select: { status: true, mode: true, doneCount: true, totalCount: true, errorCount: true, skipCount: true } }).catch(() => null),
    prisma.product.count({ where: { importSource: "plati", OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: since24h } }] } }).catch(() => 0),
    prisma.product.findMany({ where: { importSource: "plati", isActive: true }, select: { id: true, slug: true, name: true, imageUrl: true, price: true }, orderBy: { importedAt: "desc" }, take: 6 }).catch(() => []),
  ])

  const hiddenProducts = totalProducts - activeProducts
  const revenue = (revenueToday as any)?._sum?.totalAmount ?? 0
  const revenueW = (revenueWeek as any)?._sum?.totalAmount ?? 0

  const autoPct = autoSession && autoSession.totalCount > 0
    ? Math.round((autoSession.doneCount / autoSession.totalCount) * 100)
    : null

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Дашборд</h1>
          <p className="text-[var(--text-3)] text-sm mt-0.5">{now.toLocaleDateString("ru-RU", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <Link href="/" target="_blank" className="btn-ghost text-sm px-4 py-2">Открыть магазин ↗</Link>
      </div>

      {/* KPI карточки */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Активных товаров", value: activeProducts.toLocaleString("ru"), sub: totalProducts.toLocaleString("ru") + " всего, " + hiddenProducts + " скрыто", icon: "🎮", color: "text-[var(--text)]", href: "/admin/products" },
          { label: "Пользователей", value: totalUsers.toLocaleString("ru"), sub: totalReviews + " отзывов • " + totalCategories + " категорий", icon: "👥", color: "text-brand", href: "/admin/users" },
          { label: "Заказов сегодня", value: ordersToday.toLocaleString("ru"), sub: revenue > 0 ? revenue.toLocaleString("ru") + " ₽" : "нет выручки", icon: "🧾", color: ordersToday > 0 ? "text-emerald-400" : "text-[var(--text-3)]", href: "/admin/orders" },
          { label: "Заказов за 7 дней", value: ordersWeek.toLocaleString("ru"), sub: revenueW > 0 ? revenueW.toLocaleString("ru") + " ₽" : "нет выручки", icon: "📈", color: ordersWeek > 0 ? "text-emerald-400" : "text-[var(--text-3)]", href: "/admin/analytics" },
        ].map(s => (
          <Link key={s.label} href={s.href} className="card p-5 hover:border-brand/40 transition-colors block">
            <span className="text-2xl">{s.icon}</span>
            <p className={"text-3xl font-bold mt-3 " + s.color}>{s.value}</p>
            <p className="text-[var(--text-3)] text-xs mt-1">{s.label}</p>
            <p className="text-[var(--text-3)] text-[11px] mt-0.5 opacity-70">{s.sub}</p>
          </Link>
        ))}
      </div>

      {/* Авто-импорт + Система */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Авто-импорт статус */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-[var(--text)]">Авто-импорт</h3>
            <span className={"text-xs font-medium px-2 py-0.5 rounded-full " + (
              autoSession?.status === "running" ? "bg-emerald-400/10 text-emerald-400" :
              autoSession?.status === "paused" ? "bg-yellow-400/10 text-yellow-400" :
              "bg-[var(--bg)] text-[var(--text-3)] border border-[var(--border)]"
            )}>
              {autoSession?.status === "running" ? "▶ Работает" : autoSession?.status === "paused" ? "⏸ Пауза" : "○ Простой"}
            </span>
          </div>
          {autoSession ? (
            <div className="space-y-2">
              {autoPct !== null && (
                <div>
                  <div className="flex justify-between text-xs text-[var(--text-3)] mb-1">
                    <span>{autoSession.doneCount} из {autoSession.totalCount}</span>
                    <span>{autoPct}%</span>
                  </div>
                  <div className="h-1.5 bg-[var(--bg)] rounded-full overflow-hidden">
                    <div className="h-full bg-brand rounded-full transition-all" style={{ width: autoPct + "%" }} />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[var(--bg)] rounded-lg p-2 text-center">
                  <div className="font-bold text-emerald-400">{autoSession.doneCount}</div>
                  <div className="text-[var(--text-3)]">добавлено</div>
                </div>
                <div className="bg-[var(--bg)] rounded-lg p-2 text-center">
                  <div className={"font-bold " + (autoSession.errorCount > 0 ? "text-red-400" : "text-[var(--text-3)]")}>{autoSession.errorCount}</div>
                  <div className="text-[var(--text-3)]">ошибок</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-[var(--text-3)] text-sm mb-3">Нет активной сессии</p>
            </div>
          )}
          <Link href="/admin/auto-import" className="block mt-3 text-center text-sm text-brand hover:underline">Управление →</Link>
        </div>

        {/* Импорт Plati сегодня */}
        <div className="card p-5">
          <h3 className="font-semibold text-[var(--text)] mb-3">Plati.Market сегодня</h3>
          <div className="grid grid-cols-3 gap-2 text-center mb-3">
            {[
              { label: "Добавлено", value: platiSuccess, color: "text-emerald-400" },
              { label: "Ошибок", value: platiErrors, color: platiErrors > 0 ? "text-red-400" : "text-[var(--text-3)]" },
              { label: "Пропущено", value: platiSkipped, color: "text-[var(--text-3)]" },
            ].map(s => (
              <div key={s.label} className="bg-[var(--bg)] rounded-xl p-2 border border-[var(--border)]">
                <div className={"text-xl font-bold " + s.color}>{s.value}</div>
                <div className="text-[10px] text-[var(--text-3)] mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs text-[var(--text-3)] border-t border-[var(--border)] pt-2">
            <span>Ожидают синхронизации:</span>
            <span className={"font-bold " + (pendingSync > 50 ? "text-yellow-400" : "text-[var(--text-2)]")}>{pendingSync}</span>
          </div>
          <Link href="/admin/auto-import" className="block mt-2 text-center text-sm text-brand hover:underline">Открыть →</Link>
        </div>

        {/* Система */}
        <div className="card p-5">
          <h3 className="font-semibold text-[var(--text)] mb-3">Состояние системы</h3>
          <div className="space-y-2">
            {[
              { label: "Ошибок за 24ч", value: sysErrors, warn: sysErrors > 0, href: "/admin/monitoring", ok: "OK" },
              { label: "CSP нарушений", value: cspNew, warn: cspNew > 0, href: "/admin/security", ok: "OK" },
              { label: "Товаров скрыто", value: hiddenProducts, warn: hiddenProducts > 100, href: "/admin/products", ok: String(hiddenProducts) },
              { label: "Категорий", value: totalCategories, warn: false, href: "/admin/categories", ok: String(totalCategories) },
            ].map(s => (
              <Link key={s.label} href={s.href} className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0 hover:text-brand transition-colors">
                <span className="text-sm text-[var(--text-2)]">{s.label}</span>
                <span className={"text-sm font-bold " + (s.warn && s.value > 0 ? "text-red-400" : "text-emerald-400")}>
                  {s.warn && s.value > 0 ? "⚠ " + s.value : s.ok}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Последние импортированные товары */}
      {recentProducts.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--text)]">Последние добавленные товары</h3>
            <Link href="/admin/products" className="text-sm text-brand hover:underline">Все товары →</Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {recentProducts.map(p => (
              <Link key={p.id} href={"/product/" + p.slug} target="_blank"
                className="group text-center hover:opacity-80 transition-opacity">
                <div className="aspect-square rounded-lg overflow-hidden bg-[var(--bg)] border border-[var(--border)] mb-1.5 relative">
                  {p.imageUrl ? (
                    <Image src={p.imageUrl} alt={p.name} fill className="object-cover" sizes="80px" unoptimized={p.imageUrl.startsWith("/uploads/")} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl opacity-20">&#127918;</div>
                  )}
                </div>
                <p className="text-[10px] text-[var(--text-3)] line-clamp-2 leading-tight">{p.name}</p>
                <p className="text-[11px] font-bold text-brand mt-0.5">{Number(p.price).toLocaleString("ru")} &#8381;</p>
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