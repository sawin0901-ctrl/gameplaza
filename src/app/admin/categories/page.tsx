import { prisma } from "../../../lib/prisma"

export const revalidate = 0

export default async function AdminCategories() {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Категории</h1>
        <p className="text-gray-500 text-sm mt-1">Всего: {categories.length}</p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1f2937] text-gray-500">
              <th className="text-left px-4 py-3">Название</th>
              <th className="text-left px-4 py-3">Slug</th>
              <th className="text-right px-4 py-3">Товаров</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(c => (
              <tr key={c.id} className="border-b border-[#1f2937] last:border-0 hover:bg-white/2">
                <td className="px-4 py-3 text-white">{c.name}</td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{c.slug}</td>
                <td className="px-4 py-3 text-right text-gray-400">{c._count.products}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {categories.length === 0 && (
          <div className="text-center py-16 text-gray-600">Категорий нет</div>
        )}
      </div>
    </div>
  )
}
