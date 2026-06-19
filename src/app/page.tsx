import { prisma } from "../lib/prisma"
import ProductCard from "../components/ProductCard"
import Link from "next/link"

export const revalidate = 300

export default async function HomePage() {
  const [featured, stats] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { importedAt: "desc" },
      take: 8,
      include: { category: true },
    }),
    prisma.product.count({ where: { isActive: true } }),
  ])

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <section className="text-center py-16">
        <h1 className="text-5xl font-bold mb-4">
          Game<span className="text-brand">Plaza</span>
        </h1>
        <p className="text-gray-400 text-lg mb-6">Цифровые товары — быстро, безопасно, выгодно</p>
        <Link href="/catalog" className="bg-brand hover:bg-brand-dark text-white px-6 py-3 rounded-lg font-semibold transition-colors">
          Перейти в каталог
        </Link>
        <p className="mt-4 text-gray-500 text-sm">{stats.toLocaleString("ru-RU")} товаров в каталоге</p>
      </section>
      <section>
        <h2 className="text-2xl font-bold mb-6">Новые поступления</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {featured.map(p => (
            <ProductCard key={p.id} slug={p.slug} name={p.name} price={p.price} imageUrl={p.imageUrl} category={p.category?.name} />
          ))}
        </div>
        <div className="text-center mt-8">
          <Link href="/catalog" className="text-brand hover:underline">Смотреть все товары</Link>
        </div>
      </section>
    </div>
  )
}