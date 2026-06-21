"use client"
import { useEffect, useState } from "react"

interface CacheInfo { ok: boolean; keys: number; memory: string }

const PATTERNS = [
  { label: "Всё", pattern: "*" },
  { label: "Продукты", pattern: "product:*" },
  { label: "Категории", pattern: "cat:*" },
  { label: "Сессии", pattern: "sess:*" },
]

export default function CachePage() {
  const [info, setInfo] = useState<CacheInfo | null>(null)
  const [msg, setMsg] = useState("")
  const [loading, setLoading] = useState(false)

  async function loadInfo() {
    const r = await fetch("/api/admin/cache")
    setInfo(await r.json())
  }

  async function flush(pattern: string) {
    setLoading(true); setMsg("")
    try {
      const r = await fetch("/api/admin/cache", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pattern }) })
      const d = await r.json()
      setMsg(d.ok ? `Удалено ${d.deleted} ключей (паттерн: ${pattern})` : d.error)
      await loadInfo()
    } finally { setLoading(false) }
  }

  useEffect(() => { loadInfo() }, [])

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-[var(--text)] mb-6">Кэш-менеджер (Redis)</h1>
      {info?.ok && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-brand">{info.keys}</p>
            <p className="text-[var(--text-3)] text-sm mt-1">Ключей в кэше</p>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-brand">{info.memory}</p>
            <p className="text-[var(--text-3)] text-sm mt-1">Использование памяти</p>
          </div>
        </div>
      )}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-4">
        <p className="text-[var(--text-2)] text-sm font-medium mb-3">Очистить кэш:</p>
        <div className="flex flex-wrap gap-2">
          {PATTERNS.map(p => (
            <button key={p.pattern} onClick={() => flush(p.pattern)} disabled={loading}
              className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm hover:bg-red-500/20 transition disabled:opacity-50">
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {msg && <p className="text-sm text-[var(--text-2)] bg-[var(--bg-secondary)] rounded-lg px-4 py-2">{msg}</p>}
    </div>
  )
}
