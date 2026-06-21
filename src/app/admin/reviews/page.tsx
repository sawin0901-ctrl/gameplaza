"use client"
import { useEffect, useState } from "react"

interface Review { id: string; rating: number; text: string; isApproved: boolean; createdAt: string; user: { name?: string; email: string }; product: { name: string; slug: string } }

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [filter, setFilter] = useState("all")
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)

  async function load(f = filter, p = 1) {
    const r = await fetch(`/api/admin/reviews?filter=${f}&page=${p}`)
    const d = await r.json()
    setReviews(d.reviews ?? []); setTotal(d.total ?? 0); setPages(d.pages ?? 1); setPage(p)
  }
  async function approve(id: string, val: boolean) {
    await fetch("/api/admin/reviews", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, isApproved: val }) })
    await load()
  }
  async function remove(id: string) {
    if (!confirm("Удалить отзыв?")) return
    await fetch(`/api/admin/reviews?id=${id}`, { method: "DELETE" }); await load()
  }

  useEffect(() => { load() }, [])

  const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Отзывы</h1>
          <p className="text-[var(--text-3)] text-sm mt-1">Всего: {total}</p>
        </div>
        <div className="flex gap-2">
          {(["all", "pending", "approved"] as const).map(f => (
            <button key={f} onClick={() => { setFilter(f); load(f) }}
              className={`px-3 py-1.5 rounded-lg text-sm ${filter === f ? "bg-brand text-white" : "border border-[var(--border)] text-[var(--text-2)]"}`}>
              {f === "all" ? "Все" : f === "pending" ? "На модерации" : "Одобрены"}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {reviews.map(r => (
          <div key={r.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-yellow-400 text-sm">{stars(r.rating)}</span>
                  <span className="text-[var(--text-3)] text-xs">{new Date(r.createdAt).toLocaleDateString("ru")}</span>
                  {!r.isApproved && <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">На модерации</span>}
                </div>
                <p className="text-[var(--text)] text-sm">{r.text}</p>
                <div className="flex gap-4 mt-2 text-xs text-[var(--text-3)]">
                  <span>{r.user.name ?? r.user.email}</span>
                  <span>{r.product.name}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                {!r.isApproved
                  ? <button onClick={() => approve(r.id, true)} className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs hover:bg-green-500/30">Одобрить</button>
                  : <button onClick={() => approve(r.id, false)} className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg text-xs hover:bg-yellow-500/30">Скрыть</button>
                }
                <button onClick={() => remove(r.id)} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs hover:bg-red-500/30">Удалить</button>
              </div>
            </div>
          </div>
        ))}
        {reviews.length === 0 && <p className="text-center text-[var(--text-3)] py-12">Отзывов нет</p>}
      </div>
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => load(filter, page - 1)} disabled={page <= 1} className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm text-[var(--text-2)] disabled:opacity-40">←</button>
          <span className="px-3 py-1.5 text-sm text-[var(--text-3)]">{page} / {pages}</span>
          <button onClick={() => load(filter, page + 1)} disabled={page >= pages} className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm text-[var(--text-2)] disabled:opacity-40">→</button>
        </div>
      )}
    </div>
  )
}
