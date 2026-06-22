import { prisma } from "../../../lib/prisma"
import ProductCard from "../../../components/ProductCard"
import CatalogSidebar from "../../../components/CatalogSidebar"
import Link from "next/link"
import { Suspense } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { buildCatalogMetadata, buildBreadcrumbJsonLd } from "../../../lib/seo"
import { getCategoryFaq } from "../../../lib/category-faq"

export const revalidate = 60

const PAGE_SIZE = 24

const SORT_OPTS = [
  { value: "newest", label: "Новые сначала" },
  { value: "price_asc", label: "Цена: по возрастанию" },
  { value: "price_desc", label: "Цена: по убыванию" },
  { value: "popular", label: "Популярные" },
  { value: "discount", label: "Акции" },
]

const VALID_SORTS = new Set(["newest", "price_asc", "price_desc", "popular", "discount"])

export async function generateMetadata({ params, searchParams }: { params: { category: string }; searchParams: Record<string, string> }): Promise<Metadata> {
  const categorySlug = params.category.replace(/[^a-z0-9-]/g, "").slice(0, 50)
  const cat = await prisma.category.findUnique({ where: { slug: categorySlug }, select: { name: true } }).catch(() => null)
  if (!cat) return { title: { absolute: "Категория не найдена | GamePlaza" } }
  const sort = VALID_SORTS.has(searchParams.sort ?? "") ? (searchParams.sort ?? "") : ""
  const page = Math.max(1, parseInt(searchParams.page ?? "1") || 1)
  return buildCatalogMetadata({ categoryName: cat.name, categorySlug, sort: sort || undefined, page })
}

export default async function CategoryPage({ params, searchParams }: { params: { category: string }; searchParams: Record<string, string> }) {
  const category = params.category.replace(/[^a-z0-9-]/g, "").slice(0, 50)

  const categoryRow = await prisma.category.findUnique({ where: { slug: category }, select: { name: true } }).catch(() => null)
  if (!categoryRow) notFound()

  const sort = VALID_SORTS.has(searchParams.sort ?? "") ? (searchParams.sort ?? "newest") : "newest"
  const rawPage = parseInt(searchParams.page ?? "1", 10)
  const page = Number.isFinite(rawPage) ? Math.max(1, rawPage) : 1
  const rawMin = parseFloat(searchParams.minPrice ?? "")
  const rawMax = parseFloat(searchParams.maxPrice ?? "")
  const minPrice = Number.isFinite(rawMin) && rawMin >= 0 ? rawMin : undefined
  const maxPrice = Number.isFinite(rawMax) && rawMax >= 0 ? rawMax : undefined

  const where = {
    isActive: true,
    category: { slug: category },
    ...(sort === "discount" ? { discountPercent: { gt: 0 } } : {}),
    ...((minPrice !== undefined || maxPrice !== undefined) ? {
      price: {
        ...(minPrice !== undefined ? { gte: minPrice } : {}),
        ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
      }
    } : {}),
  }

  const orderBy =
    sort === "price_asc"  ? { price: "asc" as const } :
    sort === "price_desc" ? { price: "desc" as const } :
    sort === "popular"    ? { soldCount: "desc" as const } :
    sort === "discount"   ? { discountPercent: "desc" as const } :
    { importedAt: "desc" as const }

  const [products, total] = await Promise.all([
    prisma.product.findMany({ where, orderBy, take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE, include: { category: true } }).catch(() => []),
    prisma.product.count({ where }).catch(() => 0),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gameplaza.site"

  function buildUrl(params2: Record<string, string | number | undefined>) {
    const sp = new URLSearchParams()
    if (sort !== "newest") sp.set("sort", sort)
    if (minPrice !== undefined) sp.set("minPrice", String(minPrice))
    if (maxPrice !== undefined) sp.set("maxPrice", String(maxPrice))
    Object.entries(params2).forEach(([k, v]) => {
      if (v !== undefined && v !== "") sp.set(k, String(v))
      else sp.delete(k)
    })
    const qs = sp.toString()
    return "/catalog/" + category + (qs ? "?" + qs : "")
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd([
        { name: "Главная", url: SITE },
        { name: "Каталог", url: SITE + "/catalog" },
        { name: categoryRow!.name, url: SITE + "/catalog/" + category },
      ])) }} />
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-white transition-colors">Главная</Link>
        <span>/</span>
        <Link href="/catalog" className="hover:text-white transition-colors">Каталог</Link>
        <span>/</span>
        <span className="text-gray-300">{categoryRow!.name}</span>
      </nav>

      <div className="flex gap-6 items-start">
        <Suspense fallback={<div className="w-full lg:w-56 xl:w-64 flex-shrink-0 h-48 rounded-xl bg-white/5 animate-pulse" />}>
          <CatalogSidebar currentCategory={category} currentMinPrice={searchParams.minPrice} currentMaxPrice={searchParams.maxPrice} />
        </Suspense>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">{categoryRow!.name}</h1>
              <p className="text-gray-500 text-sm mt-0.5">{total > 0 ? "Найдено " + total.toLocaleString("ru-RU") + " товаров" : "Товары не найдены"}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-xs hidden sm:block">Сортировка:</span>
              <div className="flex gap-1 flex-wrap">
                {SORT_OPTS.map(opt => (
                  <Link key={opt.value} href={buildUrl({ sort: opt.value === "newest" ? undefined : opt.value })}
                    className={"text-xs px-3 py-1.5 rounded-lg border transition-colors " + (sort === opt.value ? "bg-brand border-brand text-white" : "border-[var(--border)] text-gray-400 hover:text-white hover:border-gray-600")}>
                    {opt.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

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
              <div className="text-5xl mb-4">🔍</div>
              <h2 className="text-white font-bold text-lg mb-2">Товары не найдены</h2>
              <p className="text-gray-500 text-sm mb-6">Попробуйте изменить фильтры или выбрать другую категорию</p>
              <Link href="/catalog" className="btn-primary px-8 py-3">Показать все товары</Link>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-8">
              {page > 1 && (
                <Link href={buildUrl({ page: page - 1 })} className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--border)] text-gray-400 hover:text-white hover:border-gray-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
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
                    className={"w-9 h-9 flex items-center justify-center rounded-lg text-sm transition-colors " + (p2 === page ? "bg-brand text-white font-medium" : "border border-[var(--border)] text-gray-400 hover:text-white hover:border-gray-600")}>
                    {p2}
                  </Link>
                )
              })}
              {page < totalPages && (
                <Link href={buildUrl({ page: page + 1 })} className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--border)] text-gray-400 hover:text-white hover:border-gray-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {faq.length > 0 && (
        <section className="mt-10 max-w-7xl mx-auto px-4">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: faq.map(f => ({
                  "@type": "Question",
                  name: f.q,
                  acceptedAnswer: { "@type": "Answer", text: f.a },
                })),
              }),
            }}
          />
          <h2 className="text-xl font-bold text-white mb-5">Часто задаваемые вопросы</h2>
          <div className="space-y-3">
            {faq.map((item, i) => (
              <details key={i} className="card p-4 group">
                <summary className="flex items-center justify-between cursor-pointer list-none gap-4">
                  <span className="font-medium text-white">{item.q}</span>
                  <svg className="w-5 h-5 text-gray-500 shrink-0 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <p className="mt-3 text-gray-400 text-sm leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}    </div>
  )
}