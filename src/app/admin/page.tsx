import { prisma } from "../../lib/prisma"
import Link from "next/link"

export const revalidate = 60

export default async function AdminDashboard() {
  const [totalProducts, activeProducts, totalUsers, todayImport, recentLogs] = await Promise.all([
    prisma.product.count().catch(() => 0),
    prisma.product.count({ where: { isActive: true } }).catch(() => 0),
    prisma.user.count().catch(() => 0),
    prisma.importLog.findFirst({ orderBy: { date: "desc" } }).catch(() => null),
    prisma.importLog.findMany({ orderBy: { date: "desc" }, take: 5 }).catch(() => []),
  ])

  const hiddenProducts = totalProducts - activeProducts

  const stats = [
    { label: "Всего товаров", value: totalProducts, color: "text-white", icon: "🎮" },
    { label: "Активных", value: activeProducts, color: "text-emerald-400", icon: "✅" },
    { label: "Скрытых", value: hiddenProducts, color: "text-red-400", icon: "🚫" },
    { label: "Пользователей", value: totalUsers, color: "text-brand-400", icon: "👥" },
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Дашборд</h1>
        <p className="text-gray-500 text-sm mt-1">Обзор магазина GamePlaza</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{s.icon}</span>
            </div>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value.toLocaleString("ru-RU")}</p>
            <p className="text-gray-500 text-sm mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card p-5">
          <h3 className="text-white font-semibold mb-3">Быстрые действия</h3>
          <div className="space-y-2">
            <Link href="/admin/import" className="btn-primary w-full py-2.5 text-sm">⬇️ Запустить импорт</Link>
            <Link href="/admin/products" className="btn-outline w-full py-2.5 text-sm">🎮 Управление товарами</Link>
            <Link href="/catalog" target="_blank" className="btn-ghost w-full py-2.5 text-sm">🌐 Открыть магазин</Link>
          </div>
        </div>

        <div className="card p-5 md:col-span-2">
          <h3 className="text-white font-semibold mb-3">Последние импорты</h3>
          {recentLogs.length === 0 ? (
            <p className="text-gray-600 text-sm">Импортов ещё не было</p>
          ) : (
            <div className="space-y-2">
              {recentLogs.map(log => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b border-[#1f2937] last:border-0">
                  <div>
                    <p className="text-white text-sm">
                      +{log.imported} новых · {log.updated} обновлено · {log.hidden} скрыто
                    </p>
                    <p className="text-gray-600 text-xs">
                      {new Date(log.date).toLocaleString("ru-RU")}
                      {log.duration ? ` · ${(log.duration / 1000).toFixed(1)}с` : ""}
                    </p>
                  </div>
                  {log.errors > 0 && (
                    <span className="badge bg-red-500/20 text-red-400">{log.errors} ошибок</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
