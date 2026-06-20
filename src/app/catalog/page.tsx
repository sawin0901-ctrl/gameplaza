import { prisma } from "../../lib/prisma"
import ProductCard from "../../components/ProductCard"
import CatalogSidebar from "../../components/CatalogSidebar"
import Link from "next/link"
import type { Metadata } from "next"

export const revalidate = 60

const PAGE_SIZE = 24

const SORT_OPTS = [
  { value: "newest", label: "Новые сначала" },
  { value: "price_asc", label: "Цена: по возрастанию" },
  { value: "price_desc", label: "Цена: по убыванию" },
  { value: "popular", label: "Популярные" },
  { value: "discount", label: "🔥 Акции" },
]

export async function generateMetadata({ searchParams }: { searchParams: Record<string, string> }): Promise<Metadata> {
  const q = searchParams.q ?? ""
  const sort = searchParams.sort ?? ""
  const title = sort === "discount"
    ? "Акции и скидки — GamePlaza"
    : q ? `Поиск: ${q} — GamePlaza` : "Каталог цифровых товаров — GamePlaza"
  return {
    title,
    description: "Игры, программы, ключи активации. Мгновенная доставка через Digiseller.",
  }
}

export default async function CatalogPage({ searchParams }: { searchParams: Record<string, string> }) {
  const query = searchParams.q ?? ""
  const category = searchParams.category ?? ""
  const sort = searchParams.sort ?? "newest"
  const page = Math.max(1, Number(searchParams.page ?? 1))
  const minPrice = searchParams.minPrice ? Number(searchParams.minPrice) : undefined
  const maxPrice = searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined

  const where = {
    isActive: true,
    ...(sort === "discount" ? { discountPercent: { gt: 0 } } : {}),
    ...(query ? {
      OR: [
        { name: { contains: query, mode: "insensitive" as const } },
        { description: { contains: query, mode: "insensitive" as const } },
      ]
    } : {}),
    ...(category ? { category: { slug: category } } : {}),
    ...(minPrice !== undefined || maxPrice !== undefined ? {
      price: {
        ...(minPrice !== undefined ? { gte: minPrice } : {}),
        ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
      }
    } : {}),
  }

  const orderBy =
    sort === "price_asc" ? { price: "asc" as const } :
    sort === "price_desc" ? { price: "desc" as const } :
    sort === "popular" ? { soldCount: "desc" as const } :
    sort === "discount" ? { discountPercent: "desc" as const } :
    { importedAt: "desc" as const }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: { category: true },
    }).catch(() => []),
    prisma.product.count({ where }).catch(() => 0),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function buildUrl(params: Record<string, string | number>) {
    const sp = new URLSearchParams()
    if (query) sp.set("q", query)
    if (category) sp.set("category", category)
    if (sort !== "newest") sp.set("sort", sort)
    if (minPrice !== undefined) sp.set("minPrice", String(minPrice))
    if (maxPrice !== undefined) sp.set("maxPrice", String(maxPrice))
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") sp.set(k, String(v))
      else sp.delete(k)
    })
    return `/catalog?${sp.toString()}`
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-white transition-colors">Главная</Link>
        <span>/</span>
        <span className="text-gray-300">Каталог</span>
        {query && <><span>/</span><span className="text-gray-300">«{query}»</span></>}
        {sort === "discount" && <><span>/</span><span className="text-gray-300">Акции</span></>}
      </nav>

      <div className="flex gap-6 items-start">
        {/* Sidebar */}
        <CatalogSidebar
          currentCategory={category}
          currentMinPrice={searchParams.minPrice}
          currentMaxPrice={searchParams.maxPrice}
        />

        {/* Main */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">
                {sort === "discount" ? "🔥 Акции и скидки" : query ? `Поиск: «${query}»` : "Все товары"}
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {total > 0 ? `Найдено ${total.toLocaleString("ru-RU")} товаров` : "Товары не найдены"}
              </p>
            </div>
            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-xs hidden sm:block">Сортировка:</span>
              <div className="flex gap-1 flex-wrap">
                {SORT_OPTS.map(opt => (
                  <Link key={opt.value} href={buildUrl({ sort: opt.value })}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      sort === opt.value
                        ? "bg-brand border-brand text-white"
                        : "border-[#1f2937] text-gray-400 hover:text-white hover:border-gray-600"
                    }`}>
                    {opt.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Grid */}
          {products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map(p => (
                <ProductCard key={p.id}
                  slug={p.slug} name={p.name} price={p.price}
                  oldPrice={p.oldPrice ?? undefined} discountPercent={p.discountPercent ?? undefined}
                  imageUrl={p.imageUrl} category={p.category?.name}
                  rating={p.rating ?? undefined} reviewCount={p.reviewCount ?? undefined}
                  soldCount={p.soldCount}
                  digisellerProductId={p.digisellerProductId}
                />
              ))}
            </div>
          ) : (
            <div className="card p-16 text-center border-dashed">
              <div className="text-5xl mb-4">{sort === "discount" ? "🏷️" : "🔍"}</div>
              <h2 className="text-white font-bold text-lg mb-2">
                {sort === "discount" ? "Нет товаров со скидкой" : "Ничего не найдено"}
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                {sort === "discount"
                  ? "Акции появятся при следующей синхронизации с Digiseller"
                  : "Попробуйте другой запрос или сбросьте фильтры"}
              </p>
              <Link href="/catalog" className="btn-primary px-8 py-3">Показать все товары</Link>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-8">
              {page > 1 && (
                <Link href={buildUrl({ page: page - 1 })}
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#1f2937] text-gray-400 hover:text-white hover:border-gray-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
              )}
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let p2: number
                if (totalPages <= 7) p2 = i + 1
                else if (page <= 4) p2 = i + 1
                else if (page >= totalPages - 3) p2 = totalPages - 6 + i
                else p2 = page - 3 + i
                return (
                  <Link key={p2} href={buildUrl({ page: p2 })}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm transition-colors ${
                      p2 === page
                        ? "bg-brand text-white font-medium"
                        : "border border-[#1f2937] text-gray-400 hover:text-white hover:border-gray-600"
                    }`}>
                    {p2}
                  </Link>
                )
              })}
              {page < totalPages && (
                <Link href={buildUrl({ page: page + 1 })}
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#1f2937] text-gray-400 hover:text-white hover:border-gray-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
