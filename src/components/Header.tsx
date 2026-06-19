"use client"
import Link from "next/link"
import { useState } from "react"

export default function Header() {
  const [search, setSearch] = useState("")

  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
        <Link href="/" className="text-2xl font-bold text-brand">
          Game<span className="text-white">Plaza</span>
        </Link>
        <nav className="hidden md:flex gap-4 text-sm text-gray-300">
          <Link href="/catalog" className="hover:text-white transition-colors">Каталог</Link>
        </nav>
        <form action="/catalog" className="flex-1 max-w-md ml-auto">
          <input
            type="search"
            name="q"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск товаров..."
            className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
          />
        </form>
      </div>
    </header>
  )
}