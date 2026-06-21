import { prisma } from "../../lib/prisma"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: { absolute: "Отзывы покупателей | GamePlaza" },
  description: "Отзывы покупателей о цифровых товарах GamePlaza. Реальные отзывы о играх, ключах и программном обеспечении.",
}

export const revalidate = 300

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400 text-sm">
      {"★".repeat(rating)}{"☆".repeat(5 - rating)}
    </span>
  )
}

export default async function ReviewsPage() {
  const [reviews, stats] = await Promise.all([
    prisma.review.findMany({
      where: { isApproved: true },
      orderBy: { createdAt: "desc" },
      take: 60,
      include: {
        user: { select: { name: true } },
        product: { select: { name: true, slug: true } },
      },
    }).catch(() => []),
    prisma.review.aggregate({
      where: { isApproved: true },
      _avg: { rating: true },
      _count: true,
    }).catch(() => ({ _avg: { rating: null }, _count: 0 })),
  ])

  const avgRating = stats._avg.rating ?? 0
  const totalCount = typeof stats._count === "number" ? stats._count : 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">Отзывы покупателей</h1>
      <p className="text-gray-500 mb-8">Реальные отзывы от наших покупателей</p>

      {totalCount > 0 && (
        <div className="card p-6 mb-10 flex items-center gap-8">
          <div className="text-center">
            <p className="text-5xl font-bold text-white">{avgRating.toFixed(1)}</p>
            <Stars rating={Math.round(avgRating)} />
            <p className="text-gray-500 text-sm mt-1">{totalCount} отзывов</p>
          </div>
          <div className="flex-1 grid grid-cols-5 gap-1">
            {[5, 4, 3, 2, 1].map(star => {
              const count = reviews.filter(r => r.rating === star).length
              const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0
              return (
                <div key={star} className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="w-2 shrink-0">{star}</span>
                  <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                    <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-4 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="card p-16 text-center text-gray-600">Отзывов пока нет</div>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <div key={review.id} className="card p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
                  <span className="text-brand font-bold text-sm">
                    {(review.user.name ?? "А").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-medium text-white text-sm">{review.user.name ?? "Аноним"}</span>
                    <Stars rating={review.rating} />
                    <span className="text-gray-600 text-xs ml-auto">
                      {new Date(review.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                  </div>
                  {review.product && (
                    <Link href={`/product/${review.product.slug}`}
                      className="text-xs text-brand hover:underline mb-2 block truncate">
                      {review.product.name}
                    </Link>
                  )}
                  <p className="text-gray-300 text-sm leading-relaxed">{review.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}