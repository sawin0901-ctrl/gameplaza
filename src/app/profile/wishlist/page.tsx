import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "../../../lib/prisma"
import ProductCard from "../../../components/ProductCard"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Избранное — GamePlaza",
}

export default async function WishlistPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/auth/login")

  const items = await prisma.wishlist.findMany({
    where: { userId: session.user.id },
    include: {
      product: {
        include: { category: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const products = items.map(i => i.product).filter(p => p.isActive)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/profile" className="text-gray-500 hover:text-white transition-colors text-sm">
          ← Профиль
        </Link>
        <span className="text-gray-700">/</span>
        <h1 className="text-2xl font-bold text-white">Избранное</h1>
        {products.length > 0 && (
          <span className="bg-brand/20 text-brand text-xs px-2 py-1 rounded-full">
            {products.length}
          </span>
        )}
      </div>

      {products.length === 0 ? (
        <div className="card p-16 text-center border-dashed max-w-md mx-auto">
          <div className="text-5xl mb-4">♡</div>
          <h2 className="text-white font-bold text-lg mb-2">Список пуст</h2>
          <p className="text-gray-500 text-sm mb-6">
            Нажмите ♥ на карточке товара, чтобы добавить в избранное
          </p>
          <Link href="/catalog" className="btn-primary px-8 py-3">Перейти в каталог</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map(p => (
            <ProductCard
              key={p.id}
              id={p.id}
              slug={p.slug}
              name={p.name}
              price={p.price}
              oldPrice={p.oldPrice ?? undefined}
              discountPercent={p.discountPercent ?? undefined}
              imageUrl={p.imageUrl}
              category={p.category?.name}
              soldCount={p.soldCount}
              digisellerProductId={p.digisellerProductId}
              initialWishlisted={true}
            />
          ))}
        </div>
      )}
    </div>
  )
}
