"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV = [
  { href: "/admin", label: "Дашборд", icon: "📊" },
  { href: "/admin/products", label: "Товары", icon: "🎮" },
  { href: "/admin/import", label: "Импорт", icon: "⬇️" },
  { href: "/admin/analytics", label: "Аналитика", icon: "📈" },
  { href: "/admin/categories", label: "Категории", icon: "📁" },
  { href: "/admin/users", label: "Пользователи", icon: "👥" },
  { href: "/admin/monitoring", label: "Мониторинг", icon: "🔍" },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="flex-1 p-3 space-y-1">
      {NAV.map(n => {
        const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href)
        return (
          <Link key={n.href} href={n.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              active
                ? "bg-brand/20 text-brand font-medium"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}>
            <span>{n.icon}</span>
            <span>{n.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
