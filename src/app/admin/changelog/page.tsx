"use client"
import { useEffect, useState } from "react"

interface LogEntry { id: string; adminEmail: string; action: string; entity?: string; entityId?: string; ip?: string; createdAt: string }

const ACTION_COLORS: Record<string, string> = {
  "create": "text-green-400", "delete": "text-red-400", "update": "text-blue-400",
  "block": "text-orange-400", "unblock": "text-green-400", "flush": "text-purple-400",
}

function getColor(action: string) {
  for (const [k, v] of Object.entries(ACTION_COLORS)) if (action.includes(k)) return v
  return "text-[var(--text-3)]"
}

export default function ChangelogPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)

  async function load(p = 1) {
    const r = await fetch(`/api/admin/changelog?page=${p}`)
    const d = await r.json()
    setLogs(d.logs ?? []); setTotal(d.total ?? 0); setPages(d.pages ?? 1); setPage(p)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Журнал действий</h1>
          <p className="text-[var(--text-3)] text-sm mt-1">Всего: {total} записей</p>
        </div>
      </div>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 px-4 py-2 border-b border-[var(--border)] text-xs font-medium text-[var(--text-3)] uppercase">
          <span>Действие</span><span>Объект</span><span>Администратор</span><span>Время</span>
        </div>
        {logs.length === 0 && <p className="p-6 text-center text-[var(--text-3)]">Журнал пуст</p>}
        {logs.map(l => (
          <div key={l.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 px-4 py-3 border-b border-[var(--border)] last:border-0 items-center text-sm">
            <span className={`font-mono font-medium ${getColor(l.action)}`}>{l.action}</span>
            <span className="text-[var(--text-2)]">{l.entity ? `${l.entity}${l.entityId ? ` #${l.entityId.slice(0,8)}` : ""}` : "—"}</span>
            <span className="text-[var(--text-3)]">{l.adminEmail}</span>
            <span className="text-[var(--text-3)] whitespace-nowrap">{new Date(l.createdAt).toLocaleString("ru")}</span>
          </div>
        ))}
      </div>
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => load(page - 1)} disabled={page <= 1} className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm text-[var(--text-2)] disabled:opacity-40">←</button>
          <span className="px-3 py-1.5 text-sm text-[var(--text-3)]">{page} / {pages}</span>
          <button onClick={() => load(page + 1)} disabled={page >= pages} className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm text-[var(--text-2)] disabled:opacity-40">→</button>
        </div>
      )}
    </div>
  )
}
