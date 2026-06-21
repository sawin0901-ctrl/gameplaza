"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useState, useTransition } from "react"

const CATEGORIES = [
  { name: "Все товары", slug: "" },
  { name: "Игры Steam", slug: "steam" },
  { name: "Xbox", slug: "xbox" },
  { name: "PlayStation", slug: "playstation" },
  { name: "Nintendo", slug: "nintendo" },
  { name: "Game Pass", slug: "game-pass" },
  { name: "Ключи активации", slug: "keys" },
  { name: "Программы", slug: "software" },
  { name: "Антивирусы", slug: "antivirus" },
  { name: "Windows", slug: "windows" },
  { name: "Office", slug: "office" },
  { name: "VPN & Безопасность", slug: "vpn" },
  { name: "Подарочные карты", slug: "gift-cards" },
  { name: "Акции и скидки", slug: "discount" },
]

interface Props {
  currentCategory?: string
  currentMinPrice?: string
  currentMaxPrice?: string
}

export default function CatalogSidebar({ currentCategory, currentMinPrice, currentMaxPrice }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [minPrice, setMinPrice] = useState(currentMinPrice ?? "")
  const [maxPrice, setMaxPrice] = useState(currentMaxPrice ?? "")

  function goToCategory(slug: string) {
    const params = new URLSearchParams()
    const sort = searchParams.get("sort")
    if (sort) params.set("sort", sort)
    const base = !slug ? "/catalog" : slug === "discount" ? "/catalog/discount" : "/catalog/" + slug
    const qs = params.toString()
    startTransition(() => router.push(base + (qs ? "?" + qs : "")))
  }

  function applyPrice() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("category")
    params.delete("page")
    if (minPrice) params.set("minPrice", minPrice); else params.delete("minPrice")
    if (maxPrice) params.set("maxPrice", maxPrice); else params.delete("maxPrice")
    const qs = params.toString()
    startTransition(() => router.push(pathname + (qs ? "?" + qs : "")))
  }

  function resetFilters() {
    setMinPrice("")
    setMaxPrice("")
    const base = currentCategory ? "/catalog/" + currentCategory : "/catalog"
    startTransition(() => router.push(base))
  }

  const hasFilters = currentMinPrice || currentMaxPrice

  return (
    <aside className="w-full lg:w-56 xl:w-64 flex-shrink-0">
      <div className="sticky top-4 space-y-4">
        {/* Categories */}
        <div className="card p-4">
          <h3 className="text-[var(--text)] font-semibold text-sm mb-3">Категории</h3>
          <ul className="space-y-0.5">
            {CATEGORIES.map(cat => {
              const active = (currentCategory ?? "") === cat.slug
              return (
                <li key={cat.slug}>
                  <button
                    onClick={() => goToCategory(cat.slug)}
                    className={"w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors " + (active ? "bg-brand text-white font-medium" : "text-gray-400 hover:text-white hover:bg-white/5")}>
                    {cat.name}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Price */}
        <div className="card p-4">
          <h3 className="text-[var(--text)] font-semibold text-sm mb-3">Цена, руб.</h3>
          <div className="flex gap-2 mb-3">
            <input type="number" placeholder="От" value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              className="gp-input py-2 text-sm" min="0" />
            <input type="number" placeholder="До" value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              className="gp-input py-2 text-sm" min="0" />
          </div>
          <button onClick={applyPrice} disabled={isPending}
            className="btn-primary w-full py-2 text-sm">
            Применить
          </button>
        </div>

        {/* Reset */}
        {hasFilters && (
          <button onClick={resetFilters} disabled={isPending}
            className="btn-ghost w-full py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10">
            Сбросить фильтры
          </button>
        )}
      </div>
    </aside>
  )
}