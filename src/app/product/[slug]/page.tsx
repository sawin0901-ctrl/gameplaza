import { cache } from "react"
import { prisma } from "../../../lib/prisma"
import { buildProductMetadata, buildBreadcrumbJsonLd, stripHtml } from "../../../lib/seo"
import { sanitizeDescription } from "../../../lib/sanitize"
import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/auth"
import Image from "next/image"
import DigisellerWidget from "../../../components/DigisellerWidget"
import ProductCard from "../../../components/ProductCard"
import ProductTabs from "../../../components/ProductTabs"
import ReviewsTabContent from "../../../components/ReviewsTabContent"
import ImageGallery from "../../../components/ImageGallery"
import type { Metadata } from "next"

export const revalidate = 60

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
  const [product, session] = await Promise.all([
    getProduct(params.slug),
    getServerSession(authOptions),
  ])
  if (!product) notFound()

  const [reviews, userReview] = await Promise.all([
    prisma.review.findMany({
      where: { productId: product.id },
      select: {
        id: true,
        rating: true,
        text: true,
        createdAt: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    session?.user?.id
      ? prisma.review.findUnique({
          where: { productId_userId: { productId: product.id, userId: session.user.id } },
          select: { id: true },
        })
      : null,
  ])

  const categoryProducts = product.categoryId
    ? await prisma.product.findMany({
        where: { categoryId: product.categoryId, isActive: true, id: { not: product.id } },
        take: 4,
        orderBy: { importedAt: "desc" },
      })
    : []
  const seenIds = new Set(product.relatedProducts.map(p => p.id))
  const uniqueCategory = categoryProducts.filter(p => !seenIds.has(p.id))
  const related = [...product.relatedProducts, ...uniqueCategory].slice(0, 4)

  const avgRating =
    reviews.length
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : null

  const descriptionText = (stripHtml(product.description) || product.name).slice(0, 300)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://gameplaza.site"}/product/${product.slug}`,
    description: descriptionText,
    image: product.imageUrl ?? undefined,
    aggregateRating: avgRating
      ? {
          "@type": "AggregateRating",
          ratingValue: avgRating.toFixed(1),
          reviewCount: reviews.length,
        }
      : undefined,
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

  const jsonLdString = JSON.stringify(jsonLd).replace(/<\/script>/gi, "<\\/script>")

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gameplaza.site"
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Главная", url: siteUrl },
    { name: "Каталог", url: `${siteUrl}/catalog` },
    ...(product.category ? [{ name: product.category.name, url: `${siteUrl}/catalog?category=${product.category.slug}` }] : []),
    { name: product.name, url: `${siteUrl}/product/${product.slug}` },
  ])
  const breadcrumbJsonLdString = JSON.stringify(breadcrumbJsonLd).replace(/<\/script>/gi, "<\\/script>")

  // Галерея: главная картинка + все дополнительные из скрапера
  const galleryImages = [
    ...(product.imageUrl ? [{ url: product.imageUrl, alt: product.name }] : []),
    ...product.galleryImages.map(url => ({ url, alt: product.name })),
  ]

  const specs = [
    { label: "Артикул", value: String(product.digisellerProductId) },
    product.category ? { label: "Категория", value: product.category.name } : null,
    { label: "Цена", value: `${product.price.toLocaleString("ru-RU")} ₽` },
    product.oldPrice
      ? { label: "Старая цена", value: `${product.oldPrice.toLocaleString("ru-RU")} ₽` }
      : null,
    { label: "Наличие", value: product.inStock ? "В наличии" : "Нет в наличии" },
    product.soldCount > 0
      ? { label: "Продано", value: `${product.soldCount}+ шт.` }
      : null,
    { label: "Доставка", value: "Мгновенная (цифровой товар)" },
    { label: "Гарантия", value: "Предоставляется" },
  ].filter(Boolean) as { label: string; value: string }[]

  const serializedReviews = reviews.map(r => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }))

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLdString }}
      />

      {/* Breadcrumb */}
      <nav className="text-sm text-gray-600 mb-5 flex items-center gap-1.5 flex-wrap">
        <a href="/" className="hover:text-white transition-colors">Главная</a>
        <span>/</span>
        <a href="/catalog" className="hover:text-white transition-colors">Каталог</a>
        {product.category && (
          <>
            <span>/</span>
            <a
              href={`/catalog?category=${product.category.slug}`}
              className="hover:text-white transition-colors"
            >
              {product.category.name}
            </a>
          </>
        )}
        <span>/</span>
        <span className="text-gray-400 truncate max-w-[180px]">{product.name}</span>
      </nav>

      {/* Главный блок: изображение + инфо | виджет */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-x-10 items-start">

        {/* ═══ Левая колонка ═══ */}
        <div>
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {/* Изображение */}
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
                    unoptimized={product.imageUrl.startsWith("/uploads/")}
                  />
                ) : (
                  <div
                    style={{ position: "absolute", inset: 0 }}
                    className="flex items-center justify-center"
                  >
                    <span className="text-7xl opacity-10">🎮</span>
                  </div>
                )}
              </div>
            </div>

            {/* Заголовок + статус + бейджи */}
            <div className="flex-1 min-w-0">
              {product.category && (
                <p className="text-brand text-sm font-medium mb-1">{product.category.name}</p>
              )}
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight mb-2 break-words">
                {product.name}
              </h1>

              {product.price > 50 && (
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-2xl font-bold text-white">
                    {product.price.toLocaleString("ru-RU")} ₽
                  </span>
                  {product.oldPrice && product.oldPrice > product.price && (
                    <span className="text-sm text-gray-500 line-through">
                      {product.oldPrice.toLocaleString("ru-RU")} ₽
                    </span>
                  )}
                </div>
              )}

              {reviews.length > 0 && avgRating && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex text-yellow-400 text-sm leading-none">
                    {"★".repeat(Math.min(5, Math.round(avgRating)))}
                    {"☆".repeat(5 - Math.min(5, Math.round(avgRating)))}
                  </div>
                  <span className="text-[var(--text-3)] text-sm">{reviews.length} отзывов</span>
                </div>
              )}

              <div className="flex items-center gap-2 mb-5 flex-wrap">
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
                {product.soldCount > 0 && (
                  <span className="text-[var(--text-3)] text-sm">• Продано {product.soldCount}+</span>
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

          {/* Виджет на мобильных */}
          <div className="block lg:hidden mt-5">
            <DigisellerWidget productId={product.digisellerProductId} />
          </div>

          {/* ═══ Вкладки — сразу под инфо ═══ */}
          <div className="mt-6">
            <ProductTabs
          tabs={[
            { id: "description", label: "Описание" },
            { id: "reviews", label: "Отзывы", count: reviews.length },
            { id: "images", label: "Изображения", count: galleryImages.length },
            { id: "specs", label: "Характеристики" },
          ]}
          panels={[
            /* ── Описание ── */
            <div
              key="description"
              className="product-desc"
              dangerouslySetInnerHTML={{ __html: sanitizeDescription(product.description) }}
            />,

            /* ── Отзывы ── */
            <ReviewsTabContent
              key="reviews"
              initialReviews={serializedReviews}
              productId={product.id}
              userId={session?.user?.id ?? null}
              alreadyReviewed={!!userReview}
            />,

            /* ── Галерея ── */
            <ImageGallery key="images" images={galleryImages} />,

            /* ── Характеристики ── */
            <div key="specs" className="card overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {specs.map((row, i) => (
                    <tr key={row.label} className={i % 2 === 0 ? "bg-white/[0.02]" : ""}>
                      <td className="px-4 py-3 text-gray-500 font-medium w-[40%] border-b border-[var(--border)]">
                        {row.label}
                      </td>
                      <td className="px-4 py-3 text-white border-b border-[var(--border)]">
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>,
          ]}
            />
          </div>
        </div>

        {/* ═══ Правая колонка: виджет sticky ═══ */}
        <div className="hidden lg:block" style={{ position: "sticky", top: "96px", alignSelf: "start" }}>
          <DigisellerWidget productId={product.digisellerProductId} />
        </div>
      </div>

      {/* Похожие товары */}
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