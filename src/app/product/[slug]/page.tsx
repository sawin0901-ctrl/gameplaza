import { prisma } from "@/lib/prisma"
import { buildProductMetadata } from "@/lib/seo"
import { notFound } from "next/navigation"
import Image from "next/image"
import DigisellerWidget from "@/components/DigisellerWidget"
import ProductCard from "@/components/ProductCard"
import type { Metadata } from "next"

export const revalidate = 300

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await prisma.product.findUnique({ where: { slug: params.slug } })
  if (!product) return {}
  return buildProductMetadata(product)
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug, isActive: true },
    include: {
      category: true,
      relatedProducts: { where: { isActive: true }, take: 4 },
    },
  })
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
      <nav className="text-sm text-gray-500 mb-6">
        <a href="/" className="hover:text-white">Главная</a>
        <span className="mx-2">/</span>
        <a href="/catalog" className="hover:text-white">Каталог</a>
        {product.category && (
          <>
            <span className="mx-2">/</span>
            <a href={`/catalog?category=${product.category.slug}`} className="hover:text-white">{product.category.name}</a>
          </>
        )}
      </nav>

      <div className="grid md:grid-cols-2 gap-10">
        <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-800">
          {product.imageUrl ? (
            <Image src={product.imageUrl} alt={product.name} fill className="object-cover" priority />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">Нет изображения</div>
          )}
        </div>

        <div>
          {product.category && <p className="text-brand text-sm mb-2">{product.category.name}</p>}
          <h1 className="text-2xl font-bold mb-4">{product.name}</h1>
          <p className="text-3xl font-bold text-brand mb-6">{product.price.toLocaleString("ru-RU")} ₽</p>
          <DigisellerWidget productId={product.digisellerProductId} price={product.price} />
          <div className="mt-4 text-xs text-gray-500">
            {product.inStock ? (
              <span className="text-green-400">В наличии: {product.quantity} шт.</span>
            ) : (
              <span className="text-red-400">Нет в наличии</span>
            )}
          </div>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-bold mb-4">Описание</h2>
        <div
          className="prose prose-invert max-w-none text-gray-300 text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: product.description }}
        />
      </section>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold mb-4">Похожие товары</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {related.map(p => (
              <ProductCard key={p.id} slug={p.slug} name={p.name} price={p.price} imageUrl={p.imageUrl} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}