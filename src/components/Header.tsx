"use client"
import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import Image from "next/image"
import LanguageSwitcher from "./LanguageSwitcher"

const CATS = [
  { name: "Steam Games", slug: "steam", emoji: "🎮" },
  { name: "Xbox", slug: "xbox", emoji: "🎯" },
  { name: "PlayStation", slug: "playstation", emoji: "🕹️" },
  { name: "Nintendo", slug: "nintendo", emoji: "🎪" },
  { name: "Game Pass", slug: "game-pass", emoji: "⭐" },
  { name: "Keys", slug: "keys", emoji: "🔑" },
  { name: "Software", slug: "software", emoji: "💻" },
  { name: "Antivirus", slug: "antivirus", emoji: "🛡️" },
  { name: "Windows", slug: "windows", emoji: "🪟" },
  { name: "Office", slug: "office", emoji: "📊" },
  { name: "VPN", slug: "vpn", emoji: "🔒" },
  { name: "Subscriptions", slug: "subscriptions", emoji: "✨" },
  { name: "Gift Cards", slug: "gift-cards", emoji: "🎁" },
  { name: "Steam Wallet", slug: "steam-wallet", emoji: "💳" },
]

interface Suggestion {
  slug: string
  name: string
  price: number
  imageUrl?: string | null
  digisellerProductId: number
}

export default function Header() {
  const [search, setSearch] = useState("")
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [mob, setMob] = useState(false)
  const [catOpen, setCatOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const router = useRouter()
  const catRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const { data: session, status } = useSession()

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false)
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSuggestOpen(false)
    }
    document.addEventListener("mousedown", fn)
    return () => document.removeEventListener("mousedown", fn)
  }, [])

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); setSuggestOpen(false); return }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setSuggestions(data)
      setSuggestOpen(data.length > 0)
    } catch {
      setSuggestions([])
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchSuggestions(search), 300)
    return () => clearTimeout(timer)
  }, [search, fetchSuggestions])

  function onSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = search.trim()
    if (q) {
      router.push(`/catalog?q=${encodeURIComponent(q)}`)
      setMob(false)
      setSuggestOpen(false)
    }
  }

  const initials = session?.user?.name
    ? session.user.name.slice(0, 2).toUpperCase()
    : session?.user?.email?.slice(0, 2).toUpperCase() ?? "??"

  return (
    <header className="sticky top-0 z-50 bg-[#0a0a0f]/95 backdrop-blur-sm border-b border-[#1f2937]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-3 h-16">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0 mr-2">
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center font-bold text-white text-sm">G</div>
            <span className="font-bold text-lg hidden sm:block">
              <span className="text-brand">Game</span><span className="text-white">Plaza</span>
            </span>
          </Link>

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

          {/* Search with autocomplete */}
          <div ref={searchRef} className="flex-1 max-w-lg hidden md:block mx-4 relative">
            <form onSubmit={onSearch}>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="search" value={search}
                  onChange={e => setSearch(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setSuggestOpen(true)}
                  placeholder="Поиск по каталогу..." className="gp-input pl-10 py-2 text-sm" />
              </div>
            </form>
            {suggestOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#111118] border border-[#1f2937] rounded-xl shadow-2xl overflow-hidden z-50">
                {suggestions.map(s => (
                  <Link key={s.slug} href={`/product/${s.slug}`}
                    onClick={() => { setSuggestOpen(false); setSearch("") }}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors">
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-[#1a1a26] flex-shrink-0">
                      {s.imageUrl
                        ? <Image src={s.imageUrl} alt={s.name} width={36} height={36} className="object-cover w-full h-full" unoptimized />
                        : <div className="w-full h-full flex items-center justify-center text-xs text-gray-600">🎮</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{s.name}</p>
                      <p className="text-xs text-brand">{s.price.toLocaleString("ru-RU")} ₽</p>
                    </div>
                  </Link>
                ))}
                <button onClick={onSearch}
                  className="w-full px-3 py-2 text-xs text-gray-500 hover:text-white hover:bg-white/5 transition-colors text-left border-t border-[#1f2937]">
                  Показать все результаты для «{search}»
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <LanguageSwitcher />
            {status === "loading" ? (
              <div className="w-8 h-8 rounded-full bg-[#1a1a26] animate-pulse" />
            ) : session ? (
              <div className="relative hidden md:block" ref={userRef}>
                <button onClick={() => setUserOpen(v => !v)} className="flex items-center gap-2 btn-ghost px-3 py-2">
                  <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center text-xs font-bold text-white">{initials}</div>
                  <span className="text-sm text-gray-300 max-w-[100px] truncate">{session.user?.name ?? session.user?.email}</span>
                  <svg className={`w-3.5 h-3.5 transition-transform ${userOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {userOpen && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-[#111118] border border-[#1f2937] rounded-xl shadow-2xl p-1.5 animate-fade-in">
                    {session.user.role === "admin" && (
                      <Link href="/admin" onClick={() => setUserOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-brand hover:text-brand-400 transition-colors">
                        ⚙️ Админ панель
                      </Link>
                    )}
                    <Link href="/profile" onClick={() => setUserOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-gray-400 hover:text-white transition-colors">
                      👤 Профиль
                    </Link>
                    <button onClick={() => signOut({ callbackUrl: "/" })}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/10 text-sm text-gray-400 hover:text-red-400 transition-colors">
                      🚪 Выйти
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link href="/auth/login" className="btn-ghost text-sm">Войти</Link>
                <Link href="/auth/register" className="btn-primary text-sm px-4 py-2">Регистрация</Link>
              </div>
            )}
            <button onClick={() => setMob(v => !v)} className="md:hidden btn-ghost p-2">
              {mob
                ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              }
            </button>
          </div>
        </div>

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
            {session ? (
              <div className="flex gap-2">
                <Link href="/profile" onClick={() => setMob(false)} className="btn-ghost text-sm flex-1 text-center border border-[#1f2937] rounded-xl py-2.5">Профиль</Link>
                <button onClick={() => signOut({ callbackUrl: "/" })} className="text-sm flex-1 text-center border border-red-500/20 text-red-400 rounded-xl py-2.5">Выйти</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link href="/auth/login" onClick={() => setMob(false)} className="btn-ghost text-sm flex-1 text-center border border-[#1f2937] rounded-xl py-2.5">Войти</Link>
                <Link href="/auth/register" onClick={() => setMob(false)} className="btn-primary text-sm flex-1">Регистрация</Link>
              </div>
            )}
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
