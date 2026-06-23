"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

// SVG path data — Heroicons-style, 24×24 viewport, stroke-based
const P: Record<string, string> = {
  grid4:       "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z",
  chart:       "M3 3v18h18M7 16l4-4 4 4 5-8",
  star:        "M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z",
  gamepad:     "M6 11h2m5-2v4M5 8h14a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4a2 2 0 012-2z",
  receipt:     "M9 5H7a2 2 0 00-2 2v14l2-1 2 1 2-1 2 1 2-1 2 1V7a2 2 0 00-2-2h-2M9 5V3h6v2M9 5h6m-5 5h4m-4 4h2",
  tag:         "M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01",
  zap:         "M13 2L3 14h9l-1 8 10-12h-9z",
  box:         "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  key:         "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.78 7.78 5.5 5.5 0 017.77-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4",
  share2:      "M8.59 13.51l6.83 3.98m-.01-10.98l-6.82 3.98M21 5a3 3 0 11-6 0 3 3 0 016 0zm0 14a3 3 0 11-6 0 3 3 0 016 0zM9 12a3 3 0 11-6 0 3 3 0 016 0z",
  refresh:     "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
  cart:        "M9 22a1 1 0 100-2 1 1 0 000 2zm7 0a1 1 0 100-2 1 1 0 000 2zM1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6",
  download:    "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4m4-5l5 5 5-5m-5 5V3",
  image:       "M21 19a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h4l2-3h4l2 3h4a2 2 0 012 2z",
  folder:      "M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z",
  helpCircle:  "M12 22a10 10 0 100-20 10 10 0 000 20zm0-4v.01M12 8a3 3 0 013 3c0 2-3 3-3 4",
  sparkles:    "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.47V19a2 2 0 11-4 0v-.53a3.374 3.374 0 00-.946-2.288l-.548-.547z",
  search:      "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  globe:       "M3 12a9 9 0 1018 0A9 9 0 003 12zm9-9a9 9 0 010 18m0-18a9 9 0 000 18M3 12h18",
  users:       "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m16-4a4 4 0 00-3-3.87M23 21v-2a4 4 0 00-3-3.87M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  message:     "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  activity:    "M22 12h-4l-3 9L9 3l-3 9H2",
  shield:      "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  clipList:    "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  heart:       "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z",
  flag:        "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zm0 7v-7",
  trash2:      "M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2",
  gear:        "M12 15a3 3 0 100-6 3 3 0 000 6zm7.07 0h2m-20 0H1M12 5V3m0 18v-2M19.07 4.93l-1.41 1.41M6.34 17.66l-1.41 1.41M19.07 19.07l-1.41-1.41M6.34 6.34L4.93 4.93",
  save:        "M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zm-7-3a3 3 0 100-6 3 3 0 000 6zM7 3v4h8V3",
  package2:    "M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12l8.73-5.04M12 22.08V12",
  chevRight:   "M9 18l6-6-6-6",
  arrowLeft:   "M19 12H5m7-7l-7 7 7 7",
}

function Icon({ name, size = 15 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d={P[name] || ""} />
    </svg>
  )
}

type NavItem = { href: string; label: string; icon: string; badge?: "errors" | "tickets" | "products" }
const NAV: { group: string; items: NavItem[] }[] = [
  { group: "Главное", items: [
    { href: "/admin",                    label: "Дашборд",            icon: "grid4"      },
    { href: "/admin/analytics",          label: "Аналитика",          icon: "chart"      },
    { href: "/admin/analytics/products", label: "Топ товаров",        icon: "star"       },
  ]},
  { group: "Магазин", items: [
    { href: "/admin/products",    label: "Товары",            icon: "gamepad"    },
    { href: "/admin/orders",      label: "Заказы",            icon: "receipt"    },
    { href: "/admin/promo",       label: "Промокоды",         icon: "tag"        },
    { href: "/admin/flash-sales", label: "Flash-продажи",     icon: "zap"        },
    { href: "/admin/bundles",     label: "Наборы",            icon: "box"        },
    { href: "/admin/keys",        label: "Склад ключей",      icon: "key"        },
    { href: "/admin/referrals",   label: "Рефералы",          icon: "share2"     },
  ]},
  { group: "Импорт", items: [
    { href: "/admin/auto-import",  label: "Авто-импорт",       icon: "refresh"    },
    { href: "/admin/import/plati", label: "Plati.Market",      icon: "cart"       },
    { href: "/admin/import",       label: "Digiseller",        icon: "download"   },
  ]},
  { group: "Контент", items: [
    { href: "/admin/banners",    label: "Баннеры",     icon: "image"       },
    { href: "/admin/categories", label: "Категории",   icon: "folder"      },
    { href: "/admin/faq",        label: "FAQ",         icon: "helpCircle"  },
    { href: "/admin/reviews",    label: "Отзывы",      icon: "sparkles"    },
    { href: "/admin/seo",        label: "SEO",         icon: "search"      },
    { href: "/admin/sitemap",    label: "Sitemap",     icon: "globe"       },
  ]},
  { group: "Пользователи", items: [
    { href: "/admin/users",   label: "Пользователи",  icon: "users"       },
    { href: "/admin/tickets", label: "Тикеты",        icon: "message",    badge: "tickets"  },
  ]},
  { group: "Система", items: [
    { href: "/admin/monitoring",       label: "Мониторинг",      icon: "activity",  badge: "errors"   },
    { href: "/admin/products-monitor", label: "Мониторинг товаров", icon: "package2", badge: "products" },
    { href: "/admin/security",         label: "Безопасность",    icon: "shield"     },
    { href: "/admin/changelog",        label: "Журнал действий", icon: "clipList"   },
    { href: "/admin/health",           label: "Health Check",    icon: "heart"      },
    { href: "/admin/features",         label: "Feature Flags",   icon: "flag"       },
    { href: "/admin/cache",            label: "Кэш",             icon: "trash2"     },
    { href: "/admin/queue",            label: "Очередь",         icon: "gear"       },
    { href: "/admin/backup",           label: "Бэкапы",          icon: "save"       },
  ]},
]

export default function AdminNav() {
  const pathname = usePathname()
  const [errorCount,   setErrorCount]   = useState(0)
  const [ticketCount,  setTicketCount]  = useState(0)
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
        const [logs, tickets, products] = await Promise.all([
          fetch("/api/admin/monitoring/logs?status=new&count=true").then(r => r.ok ? r.json() : null).catch(() => null),
          fetch("/api/admin/tickets?status=open").then(r => r.ok ? r.json() : null).catch(() => null),
          fetch("/api/admin/monitoring/product-check/logs?page=1").then(r => r.ok ? r.json() : null).catch(() => null),
        ])
        if (!cancelled) {
          if (logs)     setErrorCount(logs.count ?? 0)
          if (tickets)  setTicketCount(tickets.total ?? 0)
          if (products) setProductCount(products.stats?.pendingNotifs ?? 0)
        }
      } catch {}
    }
    load()
    const t = setInterval(load, 60_000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  const getBadge = (badge?: string) =>
    badge === "errors" ? errorCount : badge === "tickets" ? ticketCount : badge === "products" ? productCount : 0

  return (
    <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden scrollbar-thin">
      {NAV.map(section => {
        const isCollapsed = !!collapsed[section.group]
        const hasAlert = section.items.some(n => getBadge(n.badge) > 0)
        return (
          <div key={section.group} className="mb-0.5">
            <button
              onClick={() => toggleGroup(section.group)}
              className="w-full flex items-center justify-between px-3 pt-4 pb-1 group"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-4)] group-hover:text-[var(--text-3)] transition-colors select-none">
                {section.group}
              </span>
              <span className="flex items-center gap-1.5 text-[var(--text-4)]">
                {hasAlert && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />}
                <span className={"inline-flex transition-transform duration-200 " + (isCollapsed ? "" : "rotate-90")}>
                  <Icon name="chevRight" size={11} />
                </span>
              </span>
            </button>

            {!isCollapsed && (
              <div className="mt-0.5 px-2 space-y-px">
                {section.items.map(n => {
                  const active = n.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(n.href)
                  const count = getBadge(n.badge)
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      className={"group flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13px] font-[450] transition-all duration-150 " + (
                        active
                          ? "bg-violet-50 text-violet-700 shadow-[inset_2px_0_0_#7c3aed]"
                          : "text-[var(--text-3)] hover:text-[var(--text)] hover:bg-gray-100"
                      )}
                    >
                      <span className={"transition-colors " + (active ? "text-violet-600" : "text-[var(--text-4)] group-hover:text-[var(--text-3)]")}>
                        <Icon name={n.icon} />
                      </span>
                      <span className="truncate flex-1 min-w-0">{n.label}</span>
                      {count > 0 && (
                        <span className="ml-auto shrink-0 bg-rose-500 text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
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
      <div className="h-4" />
    </nav>
  )
}