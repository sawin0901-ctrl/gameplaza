import { prisma } from "../../lib/prisma"
import ProductCard from "../../components/ProductCard"
import { buildCatalogMetadata } from "../../lib/seo"
import type { Metadata } from "next"

export const revalidate = 120

interface SearchParams { q?: string; category?: string; page?: string }

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  return buildCatalogMetadata(searchParams.category)
}

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1"))
  const perPage = 24
  const where = {
    isActive: true,
    ...(searchParams.q ? { name: { contains: searchParams.q, mode: "insensitive" as const } } : {}),
    ...(searchParams.category ? { category: { slug: searchParams.category } } : {}),
  }

  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where, orderBy: { importedAt: "desc" },
      take: perPage, skip: (page - 1) * perPage,
      include: { category: true },
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ])

  const pages = Math.ceil(total / perPage)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Каталог</h1>
      <div className="flex gap-2 flex-wrap mb-6">
        <a href="/catalog" className="px-3 py-1 rounded-full text-sm bg-gray-800 hover:bg-brand transition-colors">Все</a>
        {categories.map(c => (
          <a key={c.id} href={`/catalog?category=${c.slug}`} className="px-3 py-1 rounded-full text-sm bg-gray-800 hover:bg-brand transition-colors">{c.name}</a>
        ))}
      </div>
      <p className="text-gray-400 text-sm mb-4">Найдено: {total.toLocaleString("ru-RU")} товаров</p>
      {products.length === 0 ? (
        <p className="text-center text-gray-500 py-16">Товары не найдены</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(p => (
            <ProductCard key={p.id} slug={p.slug} name={p.name} price={p.price} imageUrl={p.imageUrl} category={p.category?.name} />
          ))}
        </div>
      )}
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <a key={p} href={`/catalog?page=${p}${searchParams.q ? `&q=${searchParams.q}` : ""}`}
              className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm ${p === page ? "bg-brand text-white" : "bg-gray-800 hover:bg-gray-700"}`}>
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}