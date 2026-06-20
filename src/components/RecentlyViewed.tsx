"use client"
import { useEffect, useState } from "react"
import Link from "next/link"

interface RecentItem {
  slug: string
  name: string
  price: number
  imageUrl: string | null
}

const KEY = "gp_recently_viewed"
const MAX = 10

export function addToRecentlyViewed(item: RecentItem) {
  if (typeof window === "undefined") return
  try {
    const raw = localStorage.getItem(KEY)
    const items: RecentItem[] = raw ? JSON.parse(raw) : []
    const filtered = items.filter(i => i.slug !== item.slug)
    const updated = [item, ...filtered].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(updated))
  } catch {}
}

export default function RecentlyViewed({ currentSlug }: { currentSlug?: string }) {
  const [items, setItems] = useState<RecentItem[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      const all: RecentItem[] = raw ? JSON.parse(raw) : []
      setItems(all.filter(i => i.slug !== currentSlug).slice(0, 6))
    } catch {}
  }, [currentSlug])

  if (items.length === 0) return null

  return (
    <section className="mt-12">
      <h2 className="text-lg font-semibold text-white mb-4">Вы смотрели</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {items.map(item => (
          <Link key={item.slug} href={`/product/${item.slug}`}
            className="card p-3 hover:border-brand/40 transition-colors group">
            {item.imageUrl && (
              <img src={item.imageUrl} alt={item.name}
                className="w-full aspect-square object-cover rounded-lg mb-2 opacity-80 group-hover:opacity-100 transition-opacity" />
            )}
            <div className="text-white text-xs font-medium line-clamp-2 mb-1">{item.name}</div>
            <div className="text-brand text-xs font-semibold">{item.price.toLocaleString("ru-RU")} ₽</div>
          </Link>
        ))}
      </div>
    </section>
  )
}
