import { prisma } from "../../../lib/prisma"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Заказы — Admin" }
export const revalidate = 0

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  processing: "bg-blue-500/20 text-blue-400",
  completed: "bg-emerald-500/20 text-emerald-400",
  cancelled: "bg-red-500/20 text-red-400",
  refunded: "bg-gray-500/20 text-gray-400",
}
const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидание", processing: "В обработке", completed: "Выполнен",
  cancelled: "Отменён", refunded: "Возврат",
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Record<string, string>
}) {
  const page = Math.max(1, Number(searchParams.page ?? 1))
  const status = searchParams.status ?? "all"
  const q = searchParams.q ?? ""
  const PAGE = 30

  const where = {
    ...(status !== "all" ? { status } : {}),
    ...(q ? { OR: [{ email: { contains: q, mode: "insensitive" as const } }, { id: { contains: q } }] } : {}),
  }

  const [orders, total, stats] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE,
      skip: (page - 1) * PAGE,
      include: {
        items: { select: { name: true, price: true } },
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.order.count({ where }),
    prisma.order.aggregate({ _count: true, _sum: { totalAmount: true } }),
  ])

  const totalPages = Math.ceil(total / PAGE)
  const fmt = (n: number) => n.toLocaleString("ru-RU") + " ₽"

  function buildUrl(p: Record<string, string | number>) {
    const sp = new URLSearchParams()
    if (q) sp.set("q", q)
    if (status !== "all") sp.set("status", status)
    Object.entries(p).forEach(([k, v]) => sp.set(k, String(v)))
    return `/admin/orders?${sp.toString()}`
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Заказы</h1>
          <p className="text-[var(--text-3)] text-sm mt-1">Всего: {stats._count} · Выручка: {fmt(stats._sum.totalAmount ?? 0)}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {(["pending","processing","completed","cancelled"] as const).map(s => (
          <Link key={s} href={buildUrl({ status: s, page: 1 })}
            className={`card p-4 hover:border-brand/40 transition-colors ${status === s ? "border-brand/40" : ""}`}>
            <div className={`badge ${STATUS_COLORS[s]} mb-1 text-xs`}>{STATUS_LABELS[s]}</div>
          </Link>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 flex flex-wrap gap-3">
        <form method="get" action="/admin/orders" className="flex gap-2 flex-1 min-w-[200px]">
          <input name="q" defaultValue={q} placeholder="Email или ID заказа..."
            className="gp-input py-2 text-sm flex-1" />
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          <button className="btn-primary py-2 px-4 text-sm">Найти</button>
        </form>
        <div className="flex gap-1 flex-wrap">
          {(["all","pending","processing","completed","cancelled","refunded"] as const).map(s => (
            <Link key={s} href={buildUrl({ status: s, page: 1 })}
              className={`px-3 py-2 rounded-lg text-xs border transition-colors ${status === s ? "bg-brand border-brand text-white" : "border-[var(--border)] text-gray-400 hover:text-white"}`}>
              {s === "all" ? "Все" : STATUS_LABELS[s]}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-gray-500 text-xs">
              <th className="text-left px-4 py-3">Заказ</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Покупатель</th>
              <th className="text-left px-4 py-3 hidden lg:table-cell">Товары</th>
              <th className="text-right px-4 py-3">Сумма</th>
              <th className="text-center px-4 py-3">Статус</th>
              <th className="text-right px-4 py-3">Дата</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} className="border-b border-[var(--border)] last:border-0 hover:bg-white/2">
                <td className="px-4 py-3 font-mono text-xs text-gray-400">
                  #{o.id.slice(-8).toUpperCase()}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <div className="text-white text-xs">{o.user?.name ?? o.email}</div>
                  <div className="text-gray-600 text-xs">{o.email}</div>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">
                  {o.items.slice(0, 2).map((i, idx) => (
                    <div key={idx} className="line-clamp-1">{i.name}</div>
                  ))}
                  {o.items.length > 2 && <div className="text-[var(--text-3)]">+{o.items.length - 2} ещё</div>}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-white">
                  {fmt(o.totalAmount)}
                  {o.discount > 0 && <div className="text-emerald-400 text-xs">-{fmt(o.discount)}</div>}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`badge ${STATUS_COLORS[o.status] ?? "bg-gray-500/20 text-gray-400"}`}>
                    {STATUS_LABELS[o.status] ?? o.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-600 text-xs">
                  {new Date(o.createdAt).toLocaleDateString("ru-RU")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <div className="text-center py-16 text-gray-600">Заказы не найдены</div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex gap-1 mt-4 justify-center">
          {page > 1 && <Link href={buildUrl({ page: page - 1 })} className="px-3 py-1.5 rounded border border-[var(--border)] text-gray-400 hover:text-white text-sm">←</Link>}
          <span className="px-3 py-1.5 text-gray-400 text-sm">Стр. {page} из {totalPages}</span>
          {page < totalPages && <Link href={buildUrl({ page: page + 1 })} className="px-3 py-1.5 rounded border border-[var(--border)] text-gray-400 hover:text-white text-sm">→</Link>}
        </div>
      )}
    </div>
  )
}
