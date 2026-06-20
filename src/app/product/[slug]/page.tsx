import { cache } from "react"
import { prisma } from "../../../lib/prisma"
import { buildProductMetadata } from "../../../lib/seo"
import { sanitizeDescription } from "../../../lib/sanitize"
import { notFound } from "next/navigation"
import Image from "next/image"
import DigisellerWidget from "../../../components/DigisellerWidget"
import ProductCard from "../../../components/ProductCard"
import type { Metadata } from "next"

export const revalidate = 300

const getProduct = cache(async (slug: string) =>
  prisma.product.findUnique({
    where: { slug, isActive: true },
    include: {
      category: true,
      relatedProducts: { where: { isActive: true }, take: 4 },
    },
  })
)

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProduct(params.slug)
  if (!product) return {}
  return buildProductMetadata(product)
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug)
  if (!product) notFound()

  const categoryProducts = product.categoryId
    ? await prisma.product.findMany({
        where: { categoryId: product.categoryId, isActive: true, id: { not: product.id } },
        take: 4,
        orderBy: { importedAt: "desc" },
      })
    : []

  const related = [...product.relatedProducts, ...categoryProducts].slice(0, 4)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description.replace(/<[^>]+>/g, "").slice(0, 300),
    image: product.imageUrl ?? undefined,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "RUB",
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: "GamePlaza" },
    },
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Breadcrumb */}
      <nav className="text-sm text-gray-600 mb-5 flex items-center gap-1.5 flex-wrap">
        <a href="/" className="hover:text-white transition-colors">Главная</a>
        <span>/</span>
        <a href="/catalog" className="hover:text-white transition-colors">Каталог</a>
        {product.category && (
          <>
            <span>/</span>
            <a href={`/catalog?category=${product.category.slug}`} className="hover:text-white transition-colors">
              {product.category.name}
            </a>
          </>
        )}
        <span>/</span>
        <span className="text-gray-400 truncate max-w-[180px]">{product.name}</span>
      </nav>

      {/*
        Desktop/Laptop (≥1024px): 2-col grid
          LEFT  = image + title + description
          RIGHT = widget (sticky)
        Mobile/Tablet (<1024px): single column
          image → title → widget → description
      */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-x-10 items-start">

        {/* ═══ LEFT COLUMN ═══ */}
        <div>
          {/* Image + Info row */}
          <div className="flex flex-col sm:flex-row gap-5 items-start mb-5">

            {/* Image */}
            <div className="w-full sm:w-[220px] shrink-0">
              <div
                className="rounded-xl overflow-hidden bg-[#1a1a26]"
                style={{ position: "relative", width: "100%", paddingTop: "100%" }}
              >
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 220px"
                    className="object-contain"
                    style={{ position: "absolute", inset: 0 }}
                    priority
                  />
                ) : (
                  <div style={{ position: "absolute", inset: 0 }} className="flex items-center justify-center">
                    <span className="text-7xl opacity-10">🎮</span>
                  </div>
                )}
              </div>
            </div>

            {/* Title + status + badges */}
            <div className="flex-1 min-w-0">
              {product.category && (
                <p className="text-brand text-sm font-medium mb-1">{product.category.name}</p>
              )}
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight mb-3 break-words">
                {product.name}
              </h1>

              <div className="flex items-center gap-2 mb-5">
                {product.inStock ? (
                  <>
                    <span className="w-2 h-2 bg-emerald-400 rounded-full shrink-0" />
                    <span className="text-emerald-400 text-sm font-medium">В наличии</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-red-400 rounded-full shrink-0" />
                    <span className="text-red-400 text-sm font-medium">Нет в наличии</span>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: "⚡", text: "Мгновенная доставка" },
                  { icon: "🔒", text: "Безопасная оплата" },
                  { icon: "🏆", text: "Гарантия качества" },
                  { icon: "💬", text: "Поддержка 24/7" },
                ].map(b => (
                  <div key={b.text} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="shrink-0">{b.icon}</span>
                    <span>{b.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Widget — only on mobile/tablet (hidden on desktop where it's in right column) */}
          <div className="block lg:hidden mb-5">
            <DigisellerWidget productId={product.digisellerProductId} />
          </div>

          {/* Description — starts right after image+info, no big gap */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">Описание</h2>
            <div
              className="card p-5 text-gray-300 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitizeDescription(product.description) }}
            />
          </section>
        </div>

        {/* ═══ RIGHT COLUMN: Widget desktop only ═══ */}
        <div className="hidden lg:block" style={{ position: "sticky", top: "96px" }}>
          <DigisellerWidget productId={product.digisellerProductId} />
        </div>

      </div>

      {/* Related products */}
      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-white mb-5">Похожие товары</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {related.map(p => (
              <ProductCard
                key={p.id}
                slug={p.slug}
                name={p.name}
                price={p.price}
                imageUrl={p.imageUrl}
                digisellerProductId={p.digisellerProductId}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
