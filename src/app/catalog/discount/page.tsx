import { prisma } from "../../../lib/prisma"
import ProductCard from "../../../components/ProductCard"
import CatalogSidebar from "../../../components/CatalogSidebar"
import Link from "next/link"
import type { Metadata } from "next"

export const revalidate = 60

const PAGE_SIZE = 24

export const metadata: Metadata = {
  title: "Акции и скидки на цифровые товары | GamePlaza",
  description: "Лучшие скидки на игры, ключи и программы. Сэкономьте на покупке цифровых товаров в GamePlaza.",
  alternates: { canonical: "https://gameplaza.site/catalog/discount" },
}

export default async function DiscountPage({ searchParams }: { searchParams: Record<string, string> }) {
  const rawPage = parseInt(searchParams.page ?? "1", 10)
  const page = Number.isFinite(rawPage) ? Math.max(1, rawPage) : 1

  const where = { isActive: true, discountPercent: { gt: 0 } }
  const orderBy = { discountPercent: "desc" as const }

  const [products, total] = await Promise.all([
    prisma.product.findMany({ where, orderBy, take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE, include: { category: true } }).catch(() => []),
    prisma.product.count({ where }).catch(() => 0),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function buildUrl(p: number) {
    return p === 1 ? "/catalog/discount" : "/catalog/discount?page=" + p
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-white transition-colors">Главная</Link>
        <span>/</span>
        <Link href="/catalog" className="hover:text-white transition-colors">Каталог</Link>
        <span>/</span>
        <span className="text-gray-300">Акции и скидки</span>
      </nav>

      <div className="flex gap-6 items-start">
        <CatalogSidebar currentCategory="discount" />
        <div className="flex-1 min-w-0">
          <div className="mb-5">
            <h1 className="text-xl font-bold text-white">Акции и скидки</h1>
            <p className="text-gray-500 text-sm mt-0.5">{total > 0 ? "Найдено " + total.toLocaleString("ru-RU") + " товаров со скидкой" : "Сейчас акций нет"}</p>
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
              <div className="text-5xl mb-4">🏷️</div>
              <h2 className="text-white font-bold text-lg mb-2">Сейчас акций нет</h2>
              <p className="text-gray-500 text-sm mb-6">Акции появятся при следующей синхронизации с Digiseller</p>
              <Link href="/catalog" className="btn-primary px-8 py-3">Смотреть все товары</Link>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-8">
              {page > 1 && <Link href={buildUrl(page - 1)} className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--border)] text-gray-400 hover:text-white transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></Link>}
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p2 = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i
                return <Link key={p2} href={buildUrl(p2)} className={"w-9 h-9 flex items-center justify-center rounded-lg text-sm transition-colors " + (p2 === page ? "bg-brand text-white font-medium" : "border border-[var(--border)] text-gray-400 hover:text-white")}>{p2}</Link>
              })}
              {page < totalPages && <Link href={buildUrl(page + 1)} className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--border)] text-gray-400 hover:text-white transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></Link>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}