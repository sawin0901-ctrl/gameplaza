import { prisma } from "../../../lib/prisma"
import Link from "next/link"

export const revalidate = 0

export default async function AdminProducts({ searchParams }: { searchParams: Record<string, string> }) {
  const page = Math.max(1, Number(searchParams.page ?? 1))
  const q = searchParams.q ?? ""
  const status = searchParams.status ?? "all"
  const PAGE = 50

  const where = {
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    ...(status === "active" ? { isActive: true } : status === "hidden" ? { isActive: false } : {}),
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { importedAt: "desc" },
      take: PAGE,
      skip: (page - 1) * PAGE,
      include: { category: true },
    }),
    prisma.product.count({ where }),
  ])

  const totalPages = Math.ceil(total / PAGE)

  function buildUrl(p: Record<string, string | number>) {
    const sp = new URLSearchParams()
    if (q) sp.set("q", q)
    if (status !== "all") sp.set("status", status)
    Object.entries(p).forEach(([k, v]) => sp.set(k, String(v)))
    return `/admin/products?${sp.toString()}`
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Товары</h1>
          <p className="text-gray-500 text-sm mt-1">Всего: {total.toLocaleString("ru-RU")}</p>
        </div>
        <Link href="/admin/import" className="btn-primary py-2 px-4 text-sm">⬇️ Импорт</Link>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 flex flex-wrap gap-3">
        <form method="get" action="/admin/products" className="flex gap-2 flex-1 min-w-[200px]">
          <input name="q" defaultValue={q} placeholder="Поиск по названию..."
            className="gp-input py-2 text-sm flex-1" />
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          <button className="btn-primary py-2 px-4 text-sm">Найти</button>
        </form>
        <div className="flex gap-1">
          {[["all","Все"],["active","Активные"],["hidden","Скрытые"]].map(([v,l]) => (
            <Link key={v} href={buildUrl({ status: v, page: 1 })}
              className={`px-3 py-2 rounded-lg text-xs border transition-colors ${status === v ? "bg-brand border-brand text-white" : "border-[#1f2937] text-gray-400 hover:text-white"}`}>
              {l}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1f2937] text-gray-500">
              <th className="text-left px-4 py-3">Товар</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Категория</th>
              <th className="text-right px-4 py-3">Цена</th>
              <th className="text-center px-4 py-3">Статус</th>
              <th className="text-right px-4 py-3">ID</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} className="border-b border-[#1f2937] last:border-0 hover:bg-white/2">
                <td className="px-4 py-3">
                  <Link href={`/product/${p.slug}`} target="_blank"
                    className="text-white hover:text-brand transition-colors line-clamp-1">
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-gray-500">
                  {p.category?.name ?? "—"}
                </td>
                <td className="px-4 py-3 text-right text-white font-medium">
                  {p.price.toLocaleString("ru-RU")} ₽
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`badge ${p.isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                    {p.isActive ? "Активен" : "Скрыт"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-600 text-xs">
                  {p.digisellerProductId}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <div className="text-center py-16 text-gray-600">Товары не найдены</div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex gap-1 mt-4 justify-center">
          {page > 1 && <Link href={buildUrl({ page: page - 1 })} className="px-3 py-1.5 rounded border border-[#1f2937] text-gray-400 hover:text-white text-sm">←</Link>}
          <span className="px-3 py-1.5 text-gray-400 text-sm">Стр. {page} из {totalPages}</span>
          {page < totalPages && <Link href={buildUrl({ page: page + 1 })} className="px-3 py-1.5 rounded border border-[#1f2937] text-gray-400 hover:text-white text-sm">→</Link>}
        </div>
      )}
    </div>
  )
}
