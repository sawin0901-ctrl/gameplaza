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
  const [mobileOpen, setMobileOpen] = useState(false)

  function goToCategory(slug: string) {
    const params = new URLSearchParams()
    const sort = searchParams.get("sort")
    if (sort) params.set("sort", sort)
    const base = !slug ? "/catalog" : slug === "discount" ? "/catalog/discount" : "/catalog/" + slug
    const qs = params.toString()
    setMobileOpen(false)
    startTransition(() => router.push(base + (qs ? "?" + qs : "")))
  }

  function applyPrice() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("category")
    params.delete("page")
    if (minPrice) params.set("minPrice", minPrice); else params.delete("minPrice")
    if (maxPrice) params.set("maxPrice", maxPrice); else params.delete("maxPrice")
    const qs = params.toString()
    setMobileOpen(false)
    startTransition(() => router.push(pathname + (qs ? "?" + qs : "")))
  }

  function resetFilters() {
    setMinPrice("")
    setMaxPrice("")
    const base = currentCategory ? "/catalog/" + currentCategory : "/catalog"
    setMobileOpen(false)
    startTransition(() => router.push(base))
  }

  const hasFilters = currentMinPrice || currentMaxPrice
  const activeCategory = CATEGORIES.find(c => c.slug === (currentCategory ?? ""))

  const sidebarContent = (
    <div className="space-y-4">
      <div className="card p-4">
        <h3 className="text-[var(--text)] font-semibold text-sm mb-3">Категории</h3>
        <ul className="space-y-0.5">
          {CATEGORIES.map(cat => {
            const active = (currentCategory ?? "") === cat.slug
            return (
              <li key={cat.slug}>
                <button
                  onClick={() => goToCategory(cat.slug)}
                  className={"w-full text-left px-3 py-2 rounded-lg text-sm transition-colors " + (active ? "bg-brand text-white font-medium" : "text-[var(--text-3)] hover:text-[var(--text)] hover:bg-white/5")}>
                  {cat.name}
                </button>
              </li>
            )
          })}
        </ul>
      </div>

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

      {hasFilters && (
        <button onClick={resetFilters} disabled={isPending}
          className="btn-ghost w-full py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10">
          Сбросить фильтры
        </button>
      )}
    </div>
  )

  return (
    <aside className="w-full lg:w-56 xl:w-64 flex-shrink-0">
      {/* Mobile: collapsible toggle button */}
      <div className="lg:hidden mb-3">
        <button
          onClick={() => setMobileOpen(v => !v)}
          className="w-full card px-4 py-3 flex items-center justify-between text-sm font-medium text-[var(--text)]">
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            Фильтры
            {(hasFilters || currentCategory) && (
              <span className="text-xs bg-brand text-white px-1.5 py-0.5 rounded-full">
                {activeCategory && activeCategory.slug ? activeCategory.name : hasFilters ? "Цена" : ""}
              </span>
            )}
          </span>
          <svg className={`w-4 h-4 text-[var(--text-3)] transition-transform ${mobileOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {mobileOpen && <div className="mt-2">{sidebarContent}</div>}
      </div>

      {/* Desktop: always visible with sticky */}
      <div className="hidden lg:block">
        <div className="sticky top-4">
          {sidebarContent}
        </div>
      </div>
    </aside>
  )
}