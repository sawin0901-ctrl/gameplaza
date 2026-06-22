"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

const NAV = [
  { group: "Главное", items: [
    { href: "/admin",                    label: "Дашборд",           icon: "📊" },
    { href: "/admin/analytics",          label: "Аналитика",         icon: "📈" },
    { href: "/admin/analytics/products", label: "Топ товаров",       icon: "🔥" },
  ]},
  { group: "Магазин", items: [
    { href: "/admin/products",    label: "Товары",           icon: "🎮" },
    { href: "/admin/orders",      label: "Заказы",           icon: "🧾" },
    { href: "/admin/promo",       label: "Промокоды",        icon: "🎟️" },
    { href: "/admin/flash-sales", label: "Flash-распродажи", icon: "⚡" },
    { href: "/admin/bundles",     label: "Наборы",           icon: "📦" },
    { href: "/admin/keys",        label: "Склад ключей",     icon: "🔑" },
    { href: "/admin/referrals",   label: "Рефералы",         icon: "🤝" },
  ]},
  { group: "Импорт", items: [
    { href: "/admin/auto-import",  label: "Авто-импорт",      icon: "🤖" },
    { href: "/admin/import/plati", label: "Plati.Market",     icon: "🛒" },
    { href: "/admin/import",       label: "Digiseller",       icon: "⬇️" },
  ]},
  { group: "Контент", items: [
    { href: "/admin/banners",    label: "Баннеры",    icon: "🖼️" },
    { href: "/admin/categories", label: "Категории",  icon: "📁" },
    { href: "/admin/faq",        label: "FAQ",        icon: "❓" },
    { href: "/admin/reviews",    label: "Отзывы",     icon: "⭐" },
    { href: "/admin/seo",        label: "SEO",        icon: "🔎" },
    { href: "/admin/sitemap",    label: "Sitemap",    icon: "🗺️" },
  ]},
  { group: "Пользователи", items: [
    { href: "/admin/users",   label: "Пользователи", icon: "👥" },
    { href: "/admin/tickets", label: "Тикеты",       icon: "💬", badge: "tickets" },
  ]},
  { group: "Система", items: [
    { href: "/admin/monitoring",       label: "Мониторинг",      icon: "🔍", badge: "errors" },
    { href: "/admin/products-monitor", label: "Мониторинг товаров", icon: "📦", badge: "products" },
    { href: "/admin/security",         label: "Безопасность",    icon: "🔒" },
    { href: "/admin/changelog",        label: "Журнал действий", icon: "📋" },
    { href: "/admin/health",           label: "Health Check",    icon: "🩺" },
    { href: "/admin/features",         label: "Feature Flags",   icon: "🚩" },
    { href: "/admin/cache",            label: "Кэш",             icon: "🗑️" },
    { href: "/admin/queue",            label: "Очередь",         icon: "⚙️" },
    { href: "/admin/backup",           label: "Бэкапы",          icon: "💾" },
  ]},
]

export default function AdminNav() {
  const pathname = usePathname()
  const [errorCount, setErrorCount] = useState(0)
  const [ticketCount, setTicketCount] = useState(0)
  const [productCount, setProductCount] = useState(0)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    try {
      const saved = localStorage.getItem("admin-nav-collapsed")
      if (saved) setCollapsed(JSON.parse(saved))
    } catch {}
  }, [])

  function toggleGroup(group: string) {
    setCollapsed(prev => {
      const next = { ...prev, [group]: !prev[group] }
      try { localStorage.setItem("admin-nav-collapsed", JSON.stringify(next)) } catch {}
      return next
    })
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [logs, tickets, productLogs] = await Promise.all([
          fetch("/api/admin/monitoring/logs?status=new&count=true").then(r => r.ok ? r.json() : null).catch(() => null),
          fetch("/api/admin/tickets?status=open").then(r => r.ok ? r.json() : null).catch(() => null),
          fetch("/api/admin/monitoring/product-check/logs?page=1").then(r => r.ok ? r.json() : null).catch(() => null),
        ])
        if (!cancelled) {
          if (logs) setErrorCount(logs.count ?? 0)
          if (tickets) setTicketCount(tickets.total ?? 0)
          if (productLogs) setProductCount(productLogs.stats?.pendingNotifs ?? 0)
        }
      } catch {}
    }
    load()
    const t = setInterval(load, 60_000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  return (
    <nav className="flex-1 p-3 overflow-y-auto">
      {NAV.map(section => {
        const isCollapsed = collapsed[section.group]
        const hasAlert = section.items.some(n => {
          if (n.badge === "errors") return errorCount > 0
          if (n.badge === "tickets") return ticketCount > 0
          if (n.badge === "products") return productCount > 0
          return false
        })
        return (
          <div key={section.group} className="mb-1">
            <button
              onClick={() => toggleGroup(section.group)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors rounded-lg hover:bg-black/5"
            >
              <span>{section.group}</span>
              <span className="flex items-center gap-1">
                {hasAlert && !isCollapsed && <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />}
                <span className="text-[8px] opacity-50">{isCollapsed ? "▶" : "▼"}</span>
              </span>
            </button>
            {!isCollapsed && (
              <div className="space-y-0.5 mt-0.5">
                {section.items.map(n => {
                  const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href)
                  const count = n.badge === "errors" ? errorCount : n.badge === "tickets" ? ticketCount : n.badge === "products" ? productCount : 0
                  return (
                    <Link key={n.href} href={n.href}
                      className={"relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors " + (
                        active
                          ? "bg-brand/20 text-brand font-medium"
                          : "text-[var(--text-3)] hover:text-[var(--text)] hover:bg-[rgba(0,0,0,0.05)]"
                      )}>
                      <span className="text-base shrink-0">{n.icon}</span>
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
            )}
          </div>
        )
      })}
    </nav>
  )
}