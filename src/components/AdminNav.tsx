"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

const NAV = [
  { href: "/admin", label: "Дашборд", icon: "📊" },
  { href: "/admin/products", label: "Товары", icon: "🎮" },
  { href: "/admin/orders", label: "Заказы", icon: "🧾" },
  { href: "/admin/promo", label: "Промокоды", icon: "🎟️" },
  { href: "/admin/import", label: "Импорт", icon: "⬇️" },
  { href: "/admin/analytics", label: "Аналитика", icon: "📈" },
  { href: "/admin/monitoring", label: "Мониторинг", icon: "🔍", badge: true },
  { href: "/admin/categories", label: "Категории", icon: "📁" },
  { href: "/admin/users", label: "Пользователи", icon: "👥" },
]

export default function AdminNav() {
  const pathname = usePathname()
  const [errorCount, setErrorCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    function load() {
      fetch("/api/admin/monitoring/logs?status=new&count=true")
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (!cancelled && d) setErrorCount(d.count) })
        .catch(() => {})
    }
    load()
    const t = setInterval(load, 60_000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  return (
    <nav className="flex-1 p-3 space-y-1">
      {NAV.map(n => {
        const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href)
        const count = n.badge ? errorCount : 0
        return (
          <Link key={n.href} href={n.href}
            className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              active
                ? "bg-brand/20 text-brand font-medium"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}>
            <span>{n.icon}</span>
            <span>{n.label}</span>
            {count > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
