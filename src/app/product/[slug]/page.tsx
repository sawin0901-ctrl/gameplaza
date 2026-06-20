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

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-600 mb-6 flex items-center gap-1.5 flex-wrap">
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
        <span className="text-gray-400 truncate max-w-[200px]">{product.name}</span>
      </nav>

      {/* Main block */}
      <div className="grid md:grid-cols-2 gap-10">
        {/* Image */}
        <div className="relative aspect-video rounded-xl overflow-hidden bg-[#1a1a26]">
          {product.imageUrl ? (
            <Image src={product.imageUrl} alt={product.name} fill className="object-cover" priority />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-7xl opacity-10">🎮</span>
            </div>
          )}
        </div>

        {/* Info + Widget */}
        <div className="flex flex-col">
          {product.category && (
            <p className="text-brand text-sm font-medium mb-2">{product.category.name}</p>
          )}
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">{product.name}</h1>

          {/* Availability */}
          <div className="flex items-center gap-2 mb-6">
            {product.inStock ? (
              <>
                <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                <span className="text-emerald-400 text-sm font-medium">В наличии</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                <span className="text-red-400 text-sm font-medium">Нет в наличии</span>
              </>
            )}
          </div>

          {/* Официальный виджет Digiseller: живая цена + кнопка покупки */}
          <div className="mb-6">
            <DigisellerWidget productId={product.digisellerProductId} />
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-2 gap-3 mt-auto">
            {[
              { icon: "⚡", text: "Мгновенная доставка" },
              { icon: "🔒", text: "Безопасная оплата" },
              { icon: "🏆", text: "Гарантия качества" },
              { icon: "💬", text: "Поддержка 24/7" },
            ].map(b => (
              <div key={b.text} className="flex items-center gap-2 text-xs text-gray-500">
                <span>{b.icon}</span>
                <span>{b.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Description */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-white mb-4">Описание</h2>
        <div className="card p-6 text-gray-300 text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: sanitizeDescription(product.description) }} />
      </section>

      {/* Related products */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-white mb-6">Похожие товары</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
