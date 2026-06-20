"use client"
import { useState } from "react"

export interface ReviewData {
  id: string
  rating: number
  text: string
  user: { name: string | null }
  createdAt: string
}

interface Props {
  initialReviews: ReviewData[]
  productId: string
  userId: string | null
  alreadyReviewed: boolean
}

function StarRating({
  value,
  onChange,
}: {
  value: number
  onChange?: (v: number) => void
}) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          onMouseEnter={() => onChange && setHovered(star)}
          onMouseLeave={() => onChange && setHovered(0)}
          className={`text-2xl transition-transform ${onChange ? "hover:scale-110 cursor-pointer" : "cursor-default"}`}
          aria-label={`${star} звезд`}
        >
          <span className={(hovered || value) >= star ? "text-yellow-400" : "text-gray-600"}>
            ★
          </span>
        </button>
      ))}
    </div>
  )
}

function ReviewCard({ review }: { review: ReviewData }) {
  const date = new Date(review.createdAt).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand/20 flex items-center justify-center text-brand font-semibold text-sm shrink-0">
            {(review.user.name ?? "А")[0].toUpperCase()}
          </div>
          <div>
            <p className="text-white text-sm font-medium">{review.user.name ?? "Аноним"}</p>
            <p className="text-gray-600 text-xs">{date}</p>
          </div>
        </div>
        <StarRating value={review.rating} />
      </div>
      <p className="text-gray-300 text-sm leading-relaxed">{review.text}</p>
    </div>
  )
}

export default function ReviewsTabContent({
  initialReviews,
  productId,
  userId,
  alreadyReviewed,
}: Props) {
  const [reviews, setReviews] = useState<ReviewData[]>(initialReviews)
  const [rating, setRating] = useState(5)
  const [text, setText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(alreadyReviewed)

  const avg =
    reviews.length
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (text.trim().length < 10) {
      setError("Отзыв слишком короткий — минимум 10 символов")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating, text: text.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Ошибка при отправке")
        return
      }
      setReviews(prev => [data.review, ...prev])
      setText("")
      setDone(true)
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Средняя оценка */}
      {reviews.length > 0 && (
        <div className="flex items-center gap-4 p-4 card">
          <div className="text-center">
            <div className="text-4xl font-bold text-white">{avg}</div>
            <StarRating value={Math.round(Number(avg))} />
            <div className="text-xs text-gray-500 mt-1">{reviews.length} отзывов</div>
          </div>
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map(star => {
              const count = reviews.filter(r => r.rating === star).length
              const pct = reviews.length ? (count / reviews.length) * 100 : 0
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="text-gray-400 w-4 text-right">{star}</span>
                  <span className="text-yellow-400 text-xs">★</span>
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-gray-600 w-4">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Список отзывов */}
      {reviews.length === 0 ? (
        <div className="text-center py-12 text-gray-600">
          <div className="text-4xl mb-3">💬</div>
          <p>Отзывов пока нет. Будьте первым!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      )}

      {/* Форма добавления отзыва */}
      {!userId ? (
        <div className="card p-5 text-center">
          <p className="text-gray-400 text-sm mb-3">
            Чтобы оставить отзыв, необходимо войти в аккаунт
          </p>
          <a
            href="/auth/login"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand/80 transition-colors"
          >
            Войти
          </a>
        </div>
      ) : done ? (
        <div className="card p-5 text-center text-emerald-400 text-sm">
          ✓ Вы уже оставили отзыв на этот товар
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card p-5 space-y-4">
          <h3 className="text-white font-semibold">Оставить отзыв</h3>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Оценка</label>
            <StarRating value={rating} onChange={setRating} />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Текст отзыва</label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Поделитесь впечатлением о товаре..."
              className="w-full bg-[#0f0f17] border border-[#1e1e2e] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand resize-none"
            />
            <div className="text-right text-xs text-gray-600 mt-1">{text.length}/2000</div>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-brand text-white text-sm font-medium hover:bg-brand/80 transition-colors disabled:opacity-50"
          >
            {submitting ? "Отправка..." : "Опубликовать отзыв"}
          </button>
        </form>
      )}
    </div>
  )
}
