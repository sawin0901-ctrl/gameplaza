"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

const NAV = [
  { group: "Главное", items: [
    { href: "/admin",              label: "Дашборд",          icon: "📊" },
    { href: "/admin/analytics",    label: "Аналитика",        icon: "📈" },
    { href: "/admin/analytics/products", label: "Топ товаров", icon: "🔥" },
    { href: "/admin/monitoring",   label: "Мониторинг",       icon: "🔍", badge: true },
    { href: "/admin/changelog",    label: "Журнал действий",  icon: "📋" },
    { href: "/admin/health",       label: "Health Check",     icon: "🩺" },
  ]},
  { group: "Магазин", items: [
    { href: "/admin/products",     label: "Товары",           icon: "🎮" },
    { href: "/admin/orders",       label: "Заказы",           icon: "🧾" },
    { href: "/admin/promo",        label: "Промокоды",        icon: "🎟️" },
    { href: "/admin/flash-sales",  label: "Flash-распродажи", icon: "⚡" },
    { href: "/admin/bundles",      label: "Наборы",           icon: "📦" },
    { href: "/admin/keys",         label: "Склад ключей",     icon: "🔑" },
    { href: "/admin/referrals",    label: "Рефералы",         icon: "🤝" },
  ]},
  { group: "Контент", items: [
    { href: "/admin/banners",      label: "Баннеры",          icon: "🖼️" },
    { href: "/admin/categories",   label: "Категории",        icon: "📁" },
    { href: "/admin/faq",          label: "FAQ",              icon: "❓" },
    { href: "/admin/reviews",      label: "Отзывы",           icon: "⭐" },
    { href: "/admin/seo",          label: "SEO",              icon: "🔎" },
    { href: "/admin/sitemap",      label: "Sitemap",          icon: "🗺️" },
  ]},
  { group: "Пользователи", items: [
    { href: "/admin/users",        label: "Пользователи",     icon: "👥" },
    { href: "/admin/tickets",      label: "Тикеты",           icon: "💬", badge: true },
  ]},
  { group: "Система", items: [
    { href: "/admin/import",       label: "Импорт Digiseller", icon: "⬇️" },
    { href: "/admin/import/plati", label: "Plati.Market",     icon: "🛒" },
    { href: "/admin/features",     label: "Feature Flags",    icon: "🚩" },
    { href: "/admin/cache",        label: "Кэш",              icon: "🗑️" },
    { href: "/admin/queue",        label: "Очередь задач",    icon: "⚙️" },
    { href: "/admin/backup",       label: "Резервные копии",  icon: "💾" },
  ]},
]

export default function AdminNav() {
  const pathname = usePathname()
  const [errorCount, setErrorCount] = useState(0)
  const [ticketCount, setTicketCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [logs, tickets] = await Promise.all([
          fetch("/api/admin/monitoring/logs?status=new&count=true").then(r => r.ok ? r.json() : null).catch(() => null),
          fetch("/api/admin/tickets?status=open").then(r => r.ok ? r.json() : null).catch(() => null),
        ])
        if (!cancelled) {
          if (logs) setErrorCount(logs.count ?? 0)
          if (tickets) setTicketCount(tickets.total ?? 0)
        }
      } catch {}
    }
    load()
    const t = setInterval(load, 60_000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  return (
    <nav className="flex-1 p-3 overflow-y-auto">
      {NAV.map(section => (
        <div key={section.group} className="mb-4">
          <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-3)] mb-1">{section.group}</p>
          <div className="space-y-0.5">
            {section.items.map(n => {
              const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href)
              const count = n.badge ? (n.href.includes("ticket") ? ticketCount : errorCount) : 0
              return (
                <Link key={n.href} href={n.href}
                  className={`relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active
                      ? "bg-brand/20 text-brand font-medium"
                      : "text-[var(--text-3)] hover:text-[var(--text)] hover:bg-[rgba(0,0,0,0.05)]"
                  }`}>
                  <span className="text-base">{n.icon}</span>
                  <span className="truncate">{n.label}</span>
                  {count > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}