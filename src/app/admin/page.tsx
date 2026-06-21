import { prisma } from "../../lib/prisma"
import Link from "next/link"

export const revalidate = 30

export default async function AdminDashboard() {
  const now = new Date()
  const today = new Date(now); today.setHours(0, 0, 0, 0)
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [
    totalProducts, activeProducts, totalUsers, totalCategories, totalReviews,
    ordersToday, revenueToday,
    platiSuccess, platiErrors, platiSkipped,
    sysErrors, cspNew,
    recentLogs,
  ] = await Promise.all([
    prisma.product.count().catch(() => 0),
    prisma.product.count({ where: { isActive: true } }).catch(() => 0),
    prisma.user.count().catch(() => 0),
    prisma.category.count().catch(() => 0),
    prisma.review.count().catch(() => 0),
    prisma.order.count({ where: { status: "paid", createdAt: { gte: today } } }).catch(() => 0),
    prisma.order.aggregate({ where: { status: "paid", createdAt: { gte: today } }, _sum: { totalAmount: true } }).catch(() => null),
    prisma.platiImportLog.count({ where: { status: "success", createdAt: { gte: today } } }).catch(() => 0),
    prisma.platiImportLog.count({ where: { status: "error", createdAt: { gte: today } } }).catch(() => 0),
    prisma.platiImportLog.count({ where: { status: "skipped", createdAt: { gte: today } } }).catch(() => 0),
    prisma.systemLog.count({ where: { level: "error", createdAt: { gte: since24h } } }).catch(() => 0),
    prisma.systemLog.count({ where: { category: "csp-violation", status: "new" } }).catch(() => 0),
    prisma.importLog.findMany({ orderBy: { date: "desc" }, take: 5 }).catch(() => []),
  ])

  const hiddenProducts = totalProducts - activeProducts
  const revenue = (revenueToday as any)?._sum?.totalAmount ?? 0

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text)]">Дашборд</h1>
        <p className="text-[var(--text-3)] text-sm mt-1">{now.toLocaleDateString("ru-RU", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      {/* Главные метрики */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {([
          { label: "Всего товаров", value: totalProducts.toLocaleString("ru"), sub: hiddenProducts + " скрыто", icon: "🎮", color: "text-[var(--text)]" },
          { label: "Активных", value: activeProducts.toLocaleString("ru"), sub: totalCategories + " категорий", icon: "✅", color: "text-emerald-400" },
          { label: "Пользователей", value: totalUsers.toLocaleString("ru"), sub: totalReviews + " отзывов", icon: "👥", color: "text-brand" },
          { label: "Заказов сегодня", value: ordersToday.toLocaleString("ru"), sub: revenue > 0 ? revenue.toLocaleString("ru") + " ₽" : "нет выручки", icon: "🧾", color: ordersToday > 0 ? "text-emerald-400" : "text-[var(--text-3)]" },
        ] as const).map(s => (
          <div key={s.label} className="card p-5">
            <span className="text-2xl">{s.icon}</span>
            <p className={"text-3xl font-bold mt-3 " + s.color}>{s.value}</p>
            <p className="text-[var(--text-3)] text-sm mt-1">{s.label}</p>
            <p className="text-[var(--text-3)] text-xs mt-0.5 opacity-70">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Импорт + Система */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <h3 className="font-semibold text-[var(--text)] mb-4">Импорт Plati.Market сегодня</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            {([
              { label: "Импортировано", value: platiSuccess, color: "text-emerald-400" },
              { label: "Ошибки", value: platiErrors, color: platiErrors > 0 ? "text-red-400" : "text-[var(--text-3)]" },
              { label: "Пропущено", value: platiSkipped, color: platiSkipped > 0 ? "text-yellow-400" : "text-[var(--text-3)]" },
            ] as const).map(s => (
              <div key={s.label} className="bg-[var(--bg-3,var(--bg))] rounded-xl p-3">
                <div className={"text-2xl font-bold " + s.color}>{s.value}</div>
                <div className="text-xs text-[var(--text-3)] mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <Link href="/admin/import/plati" className="block mt-4 text-center text-sm text-brand hover:underline">Открыть импорт →</Link>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-[var(--text)] mb-4">Состояние системы</h3>
          <div className="space-y-3">
            {([
              { label: "Ошибок за 24ч", value: sysErrors, warn: sysErrors > 0, href: "/admin/monitoring" },
              { label: "CSP нарушений (новых)", value: cspNew, warn: cspNew > 0, href: "/admin/security" },
              { label: "Товаров скрыто", value: hiddenProducts, warn: hiddenProducts > 100, href: "/admin/products?active=false" },
            ] as const).map(s => (
              <Link key={s.label} href={s.href} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0 hover:text-brand transition-colors">
                <span className="text-sm text-[var(--text-2)]">{s.label}</span>
                <span className={"font-bold " + (s.warn && s.value > 0 ? "text-red-400" : "text-emerald-400")}>
                  {s.value === 0 ? "✓ 0" : (s.warn ? "⚠ " : "") + s.value}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Быстрые действия + импорт Digiseller */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <h3 className="font-semibold text-[var(--text)] mb-3">Быстрые действия</h3>
          <div className="space-y-2">
            <Link href="/admin/import/plati" className="btn-primary w-full py-2.5 text-sm">⬇️ Импорт Plati.Market</Link>
            <Link href="/admin/products" className="btn-outline w-full py-2.5 text-sm">🎮 Управление товарами</Link>
            <Link href="/admin/security" className="btn-ghost w-full py-2.5 text-sm">🔒 Безопасность</Link>
            <Link href="/catalog" target="_blank" className="btn-ghost w-full py-2.5 text-sm">🌐 Открыть магазин</Link>
          </div>
        </div>
        <div className="card p-5 md:col-span-2">
          <h3 className="font-semibold text-[var(--text)] mb-3">Последние импорты Digiseller</h3>
          {recentLogs.length === 0 ? (
            <p className="text-[var(--text-3)] text-sm">Импортов ещё не было</p>
          ) : (
            <div className="space-y-2">
              {recentLogs.map(log => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <div>
                    <p className="text-[var(--text)] text-sm">{"+" + log.imported + " новых · " + log.updated + " обновлено · " + (log.hidden ?? 0) + " скрыто"}</p>
                    <p className="text-[var(--text-3)] text-xs">{new Date(log.date).toLocaleString("ru-RU")}{log.duration ? " · " + (log.duration / 1000).toFixed(1) + "с" : ""}</p>
                  </div>
                  {log.errors > 0 && <span className="text-xs text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">{log.errors + " ошибок"}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}