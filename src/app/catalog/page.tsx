import { prisma } from "../../lib/prisma"
import ProductCard from "../../components/ProductCard"
import { buildCatalogMetadata } from "../../lib/seo"
import type { Metadata } from "next"

export const revalidate = 120

interface SearchParams { q?: string; category?: string; page?: string; sort?: string }

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

  const orderBy = searchParams.sort === "price_asc"
    ? { price: "asc" as const }
    : searchParams.sort === "price_desc"
    ? { price: "desc" as const }
    : { importedAt: "desc" as const }

  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      take: perPage,
      skip: (page - 1) * perPage,
      include: { category: true },
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ])

  const pages = Math.ceil(total / perPage)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="section-title mb-2">
          {searchParams.q
            ? `Поиск: «${searchParams.q}»`
            : searchParams.category
            ? categories.find(c => c.slug === searchParams.category)?.name ?? "Каталог"
            : "Каталог товаров"}
        </h1>
        <p className="section-sub">Найдено: {total.toLocaleString("ru-RU")} товаров</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <a href="/catalog" className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${!searchParams.category ? "bg-brand text-white" : "bg-[#1a1a26] text-gray-400 hover:text-white"}`}>
          Все
        </a>
        {categories.map(c => (
          <a key={c.id} href={`/catalog?category=${c.slug}`}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${searchParams.category === c.slug ? "bg-brand text-white" : "bg-[#1a1a26] text-gray-400 hover:text-white"}`}>
            {c.name}
          </a>
        ))}
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-gray-600 text-sm">Сортировка:</span>
        {[
          { label: "Новинки", val: "" },
          { label: "Дешевле", val: "price_asc" },
          { label: "Дороже", val: "price_desc" },
        ].map(s => (
          <a key={s.val} href={`/catalog?${searchParams.category ? `category=${searchParams.category}&` : ""}sort=${s.val}`}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${(searchParams.sort ?? "") === s.val ? "bg-brand/20 text-brand border border-brand/30" : "bg-[#1a1a26] text-gray-500 hover:text-white"}`}>
            {s.label}
          </a>
        ))}
      </div>

      {/* Grid */}
      {products.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-white font-semibold mb-2">Ничего не найдено</p>
          <p className="text-gray-500 text-sm">Попробуйте другой запрос или категорию</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(p => (
            <ProductCard
              key={p.id}
              slug={p.slug}
              name={p.name}
              price={p.price}
              imageUrl={p.imageUrl}
              category={p.category?.name}
              digisellerProductId={p.digisellerProductId}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-10">
          {page > 1 && (
            <a href={`/catalog?page=${page - 1}${searchParams.category ? `&category=${searchParams.category}` : ""}${searchParams.q ? `&q=${searchParams.q}` : ""}`}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-sm bg-[#1a1a26] text-gray-400 hover:text-white">
              ←
            </a>
          )}
          {Array.from({ length: Math.min(pages, 10) }, (_, i) => i + 1).map(p => (
            <a key={p} href={`/catalog?page=${p}${searchParams.category ? `&category=${searchParams.category}` : ""}${searchParams.q ? `&q=${searchParams.q}` : ""}`}
              className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${p === page ? "bg-brand text-white" : "bg-[#1a1a26] text-gray-400 hover:text-white"}`}>
              {p}
            </a>
          ))}
          {page < pages && (
            <a href={`/catalog?page=${page + 1}${searchParams.category ? `&category=${searchParams.category}` : ""}${searchParams.q ? `&q=${searchParams.q}` : ""}`}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-sm bg-[#1a1a26] text-gray-400 hover:text-white">
              →
            </a>
          )}
        </div>
      )}
    </div>
  )
}
