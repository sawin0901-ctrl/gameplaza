import { prisma } from "@/lib/prisma"
import { importQueue } from "@/lib/queue"

export const dynamic = "force-dynamic"

export default async function MonitoringPage() {
  const [totalProducts, activeProducts, hiddenProducts, queuedItems, todayLog] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.count({ where: { isActive: false } }),
    prisma.importQueue.count({ where: { status: "pending" } }),
    prisma.importLog.findFirst({ orderBy: { date: "desc" } }),
  ])

  const queueStats = await importQueue.getJobCounts("waiting", "active", "failed")

  const stats = [
    { label: "Всего товаров", value: totalProducts, color: "text-white" },
    { label: "Активных", value: activeProducts, color: "text-green-400" },
    { label: "Скрытых", value: hiddenProducts, color: "text-red-400" },
    { label: "В очереди (БД)", value: queuedItems, color: "text-yellow-400" },
    { label: "Очередь Redis (ожидание)", value: queueStats.waiting, color: "text-blue-400" },
    { label: "Очередь Redis (обработка)", value: queueStats.active, color: "text-purple-400" },
    { label: "Ошибок в очереди", value: queueStats.failed, color: "text-red-400" },
    { label: "Импортировано сегодня", value: todayLog?.imported ?? 0, color: "text-brand" },
    { label: "Обновлено сегодня", value: todayLog?.updated ?? 0, color: "text-brand" },
    { label: "Ошибок сегодня", value: todayLog?.errors ?? 0, color: "text-red-400" },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-8">Мониторинг системы</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-gray-800 rounded-xl p-5">
            <p className="text-gray-400 text-xs mb-1">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value.toLocaleString("ru-RU")}</p>
          </div>
        ))}
      </div>
    </div>
  )
}