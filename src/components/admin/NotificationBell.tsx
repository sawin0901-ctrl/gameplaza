"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"

interface NotifItem {
  type: string; count: number; label: string; href: string; icon: string
}

export function NotificationBell() {
  const [total, setTotal]       = useState(0)
  const [items, setItems]       = useState<NotifItem[]>([])
  const [open, setOpen]         = useState(false)
  const [clearing, setClearing] = useState(false)
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

  async function dismissAll() {
    setClearing(true)
    try {
      await fetch("/api/admin/notifications", { method: "PATCH" })
      setTotal(0)
      setItems([])
    } catch {}
    setClearing(false)
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
      <button
        onClick={() => setOpen(p => !p)}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[15px] h-3.5 flex items-center justify-center px-0.5 leading-none">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">
              Уведомления
              {total > 0 && <span className="ml-1.5 text-xs font-normal text-gray-400">({total})</span>}
            </p>
            {total > 0 && (
              <button
                onClick={dismissAll}
                disabled={clearing}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
              >
                {clearing
                  ? <span className="w-3 h-3 border border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" /></svg>
                }
                Сбросить всё
              </button>
            )}
          </div>

          {/* Items */}
          {items.length === 0 ? (
            <div className="py-8 text-center">
              <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <p className="text-sm text-gray-400">Всё в порядке</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
              {items.map(item => (
                <Link key={item.type} href={item.href} onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <span className="text-base shrink-0">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{item.label}</p>
                  </div>
                  <span className="text-sm font-bold text-red-500 shrink-0 tabular-nums">{item.count}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-100 flex justify-end">
            <button onClick={load} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Обновить
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
