"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"

interface SR {
  products: { id: string; name: string; slug: string; price: number; isActive: boolean }[]
  users: { id: string; name: string | null; email: string }[]
  orders: { id: string; email: string; totalAmount: number; status: string }[]
}

const QUICK = [
  ["Товары", "/admin/products"], ["Заказы", "/admin/orders"],
  ["Пользователи", "/admin/users"], ["Авто-импорт", "/admin/auto-import"],
  ["Аналитика", "/admin/analytics"], ["Мониторинг", "/admin/monitoring"],
]

export function AdminSearch() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const [results, setResults] = useState<SR | null>(null)
  const [loading, setLoading] = useState(false)
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen(o => !o) }
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); setQ(""); setResults(null) }
  }, [open])

  const search = useCallback(async (val: string) => {
    if (val.length < 2) { setResults(null); return }
    setLoading(true)
    try {
      const r = await fetch("/api/admin/search?q=" + encodeURIComponent(val))
      setResults(await r.json()); setCursor(0)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { const t = setTimeout(() => search(q), 250); return () => clearTimeout(t) }, [q, search])

  const allItems: { label: string; sub: string; href: string }[] = []
  if (results) {
    results.products.forEach(p => allItems.push({ label: p.name, sub: Number(p.price).toLocaleString("ru") + " ₽", href: "/product/" + p.slug }))
    results.users.forEach(u => allItems.push({ label: u.name ?? u.email, sub: u.email, href: "/admin/users" }))
    results.orders.forEach(o => allItems.push({ label: "#" + o.id.slice(-8).toUpperCase(), sub: o.email, href: "/admin/orders" }))
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c + 1, allItems.length - 1)) }
    if (e.key === "ArrowUp") { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === "Enter" && allItems[cursor]) { router.push(allItems[cursor].href); setOpen(false) }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text)] transition-colors text-sm w-full">
      <span className="text-xs">🔍</span>
      <span className="flex-1 text-left text-xs">Поиск...</span>
      <kbd className="text-[10px] bg-[var(--bg)] border border-[var(--border)] rounded px-1 opacity-60">⌘K</kbd>
    </button>
  )

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-start justify-center pt-20 px-4" onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <span className="text-gray-500 text-sm">🔍</span>
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} onKeyDown={handleKey}
            placeholder="Поиск товаров, пользователей, заказов..."
            className="flex-1 bg-transparent text-[var(--text)] placeholder-gray-600 outline-none text-sm" />
          {loading && <span className="text-gray-600 text-xs animate-pulse">...</span>}
          <kbd className="text-[10px] bg-[var(--bg)] border border-[var(--border)] rounded px-1 text-gray-600">Esc</kbd>
        </div>

        {results && (
          <div className="max-h-80 overflow-y-auto p-2">
            {allItems.length === 0
              ? <p className="text-center text-gray-600 py-8 text-sm">Ничего не найдено</p>
              : <>
                  {results.products.length > 0 && <p className="px-3 py-1 text-[10px] uppercase tracking-widest text-gray-600">Товары</p>}
                  {results.products.map((p, i) => (
                    <button key={p.id} onClick={() => { router.push("/product/" + p.slug); setOpen(false) }}
                      className={"w-full text-left flex items-center justify-between px-3 py-2 rounded-lg transition-colors " + (cursor === i ? "bg-brand/20 text-brand" : "hover:bg-white/5 text-[var(--text)]")}>
                      <span className="text-sm truncate">{p.name}</span>
                      <span className="text-xs text-gray-500 shrink-0 ml-2">{Number(p.price).toLocaleString("ru")} ₽</span>
                    </button>
                  ))}
                  {results.users.length > 0 && <p className="px-3 py-1 text-[10px] uppercase tracking-widest text-gray-600 mt-1">Пользователи</p>}
                  {results.users.map((u, i) => {
                    const idx = results.products.length + i
                    return (
                      <button key={u.id} onClick={() => { router.push("/admin/users"); setOpen(false) }}
                        className={"w-full text-left flex items-center justify-between px-3 py-2 rounded-lg transition-colors " + (cursor === idx ? "bg-brand/20 text-brand" : "hover:bg-white/5 text-[var(--text)]")}>
                        <span className="text-sm">{u.name ?? u.email}</span>
                        <span className="text-xs text-gray-500">{u.email}</span>
                      </button>
                    )
                  })}
                  {results.orders.length > 0 && <p className="px-3 py-1 text-[10px] uppercase tracking-widest text-gray-600 mt-1">Заказы</p>}
                  {results.orders.map((o, i) => {
                    const idx = results.products.length + results.users.length + i
                    return (
                      <button key={o.id} onClick={() => { router.push("/admin/orders"); setOpen(false) }}
                        className={"w-full text-left flex items-center justify-between px-3 py-2 rounded-lg transition-colors " + (cursor === idx ? "bg-brand/20 text-brand" : "hover:bg-white/5 text-[var(--text)]")}>
                        <span className="text-sm font-mono">#{o.id.slice(-8).toUpperCase()}</span>
                        <span className="text-xs text-gray-500">{o.email}</span>
                      </button>
                    )
                  })}
                </>
            }
          </div>
        )}

        {!results && q.length < 2 && (
          <div className="p-3">
            <p className="text-[10px] uppercase tracking-widest text-gray-600 px-2 mb-2">Быстрый переход</p>
            <div className="grid grid-cols-2 gap-0.5">
              {QUICK.map(([label, href]) => (
                <button key={href} onClick={() => { router.push(href); setOpen(false) }}
                  className="text-left px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-[var(--text-2)] transition-colors">
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}