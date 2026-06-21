"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"

interface NotifItem {
  type: string; count: number; label: string; href: string; icon: string
}

export function NotificationBell() {
  const [total, setTotal] = useState(0)
  const [items, setItems] = useState<NotifItem[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  async function load() {
    try {
      const r = await fetch("/api/admin/notifications")
      if (!r.ok) return
      const d = await r.json()
      setTotal(d.total ?? 0)
      setItems(d.items ?? [])
    } catch {}
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 60_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(p => !p)}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-3)] hover:text-[var(--text)] hover:bg-[rgba(0,0,0,0.05)] transition-colors">
        <span className="text-base">🔔</span>
        {total > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-72 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl shadow-xl z-50">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <p className="text-sm font-semibold text-[var(--text)]">Уведомления</p>
          </div>
          {items.length === 0 ? (
            <p className="text-sm text-[var(--text-3)] p-4 text-center">Всё в порядке</p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {items.map(item => (
                <Link key={item.type} href={item.href} onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[rgba(0,0,0,0.04)] transition-colors">
                  <span className="text-lg shrink-0">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text)] truncate">{item.label}</p>
                  </div>
                  <span className="text-sm font-bold text-red-400 shrink-0">{item.count}</span>
                </Link>
              ))}
            </div>
          )}
          <div className="px-4 py-2 border-t border-[var(--border)]">
            <button onClick={() => { load(); }} className="text-xs text-[var(--text-3)] hover:text-[var(--text)]">Обновить</button>
          </div>
        </div>
      )}
    </div>
  )
}