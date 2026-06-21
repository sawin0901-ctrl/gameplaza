"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"

interface Product {
  id: string
  slug: string
  name: string
  imageUrl: string | null
  price: number
}

const KEY = "gp-recent"

export function RecentlyViewed({ currentId }: { currentId: string }) {
  const [items, setItems] = useState<Product[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      const list: Product[] = raw ? JSON.parse(raw) : []
      setItems(list.filter(p => p.id !== currentId).slice(0, 5))
    } catch {}
  }, [currentId])

  if (items.length === 0) return null

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-white mb-5">Недавно просмотренные</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {items.map(p => (
          <Link
            key={p.id}
            href={`/product/${p.slug}`}
            className="card p-3 hover:border-brand/50 transition-colors group block"
          >
            <div className="aspect-square relative rounded overflow-hidden mb-2 bg-gray-800">
              {p.imageUrl && (
                <Image
                  src={p.imageUrl}
                  alt={p.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                />
              )}
            </div>
            <p className="text-xs text-gray-300 line-clamp-2 mb-1 leading-snug">{p.name}</p>
            <p className="text-sm font-bold text-brand">{p.price.toLocaleString("ru-RU")} &#8381;</p>
          </Link>
        ))}
      </div>
    </section>
  )
}