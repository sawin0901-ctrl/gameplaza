"use client"
import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

const CATS = [
  { name: "Игры Steam", slug: "steam", emoji: "🎮" },
  { name: "Xbox", slug: "xbox", emoji: "🎯" },
  { name: "PlayStation", slug: "playstation", emoji: "🕹️" },
  { name: "Nintendo", slug: "nintendo", emoji: "🎪" },
  { name: "Game Pass", slug: "game-pass", emoji: "⭐" },
  { name: "Ключи активации", slug: "keys", emoji: "🔑" },
  { name: "Программы", slug: "software", emoji: "💻" },
  { name: "Антивирусы", slug: "antivirus", emoji: "🛡️" },
  { name: "Windows", slug: "windows", emoji: "🪟" },
  { name: "Office", slug: "office", emoji: "📊" },
  { name: "VPN", slug: "vpn", emoji: "🔒" },
  { name: "Подписки", slug: "subscriptions", emoji: "✨" },
  { name: "Подарочные карты", slug: "gift-cards", emoji: "🎁" },
  { name: "Steam Пополнение", slug: "steam-wallet", emoji: "💳" },
]

export default function Header() {
  const [search, setSearch] = useState("")
  const [mob, setMob] = useState(false)
  const [catOpen, setCatOpen] = useState(false)
  const router = useRouter()
  const catRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false)
    }
    document.addEventListener("mousedown", fn)
    return () => document.removeEventListener("mousedown", fn)
  }, [])

  function onSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = search.trim()
    if (q) { router.push(`/catalog?q=${encodeURIComponent(q)}`); setMob(false) }
  }

  return (
    <header className="sticky top-0 z-50 bg-[#0a0a0f]/95 backdrop-blur-sm border-b border-[#1f2937]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-3 h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0 mr-2">
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center font-bold text-white text-sm">G</div>
            <span className="font-bold text-lg hidden sm:block">
              <span className="text-brand">Game</span><span className="text-white">Plaza</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/catalog" className="btn-ghost text-sm">Каталог</Link>
            <div className="relative" ref={catRef}>
              <button onClick={() => setCatOpen(v => !v)} className="btn-ghost text-sm flex items-center gap-1">
                Категории
                <svg className={`w-3.5 h-3.5 transition-transform ${catOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {catOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-[#111118] border border-[#1f2937] rounded-xl shadow-2xl p-1.5 grid gap-0.5 animate-fade-in">
                  {CATS.map(c => (
                    <Link key={c.slug} href={`/catalog?category=${c.slug}`} onClick={() => setCatOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-gray-400 hover:text-white transition-colors">
                      <span>{c.emoji}</span><span>{c.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <Link href="/catalog?sort=discount" className="btn-ghost text-sm">🔥 Акции</Link>
          </nav>

          {/* Search */}
          <form onSubmit={onSearch} className="flex-1 max-w-lg hidden md:block mx-4">
            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Поиск по каталогу..." className="gp-input pl-10 py-2 text-sm" />
            </div>
          </form>

          {/* Auth */}
          <div className="flex items-center gap-2 ml-auto">
            <Link href="/auth/login" className="hidden md:flex btn-ghost text-sm items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Войти
            </Link>
            <Link href="/auth/register" className="hidden md:flex btn-primary text-sm px-4 py-2">Регистрация</Link>
            <button onClick={() => setMob(v => !v)} className="md:hidden btn-ghost p-2">
              {mob
                ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              }
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mob && (
          <div className="md:hidden border-t border-[#1f2937] py-4 space-y-4 animate-slide-up">
            <form onSubmit={onSearch}>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..." className="gp-input pl-10 text-sm" />
              </div>
            </form>
            <div className="flex gap-2">
              <Link href="/auth/login" onClick={() => setMob(false)} className="btn-ghost text-sm flex-1 text-center border border-[#1f2937] rounded-xl py-2.5">Войти</Link>
              <Link href="/auth/register" onClick={() => setMob(false)} className="btn-primary text-sm flex-1">Регистрация</Link>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {CATS.map(c => (
                <Link key={c.slug} href={`/catalog?category=${c.slug}`} onClick={() => setMob(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-gray-400">
                  <span>{c.emoji}</span><span className="truncate">{c.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
