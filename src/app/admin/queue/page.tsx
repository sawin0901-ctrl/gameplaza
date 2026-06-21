"use client"
import { useEffect, useState } from "react"

interface QueueData { ok: boolean; waiting: number; active: number; completed: number; failed: number; delayed: number; failedJobs: { id?: string; name: string; failedReason: string; attemptsMade: number }[]; error?: string }

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-[var(--text-3)] text-sm mt-1">{label}</p>
    </div>
  )
}

export default function QueuePage() {
  const [data, setData] = useState<QueueData | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState("")

  async function load() { const r = await fetch("/api/admin/queue"); setData(await r.json()) }
  async function clear() {
    setLoading(true); setMsg("")
    const r = await fetch("/api/admin/queue", { method: "DELETE" })
    const d = await r.json()
    setMsg(d.ok ? "Очередь очищена" : d.error)
    await load(); setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--text)]">Очередь задач (BullMQ)</h1>
        <div className="flex gap-2">
          <button onClick={load} className="px-4 py-2 border border-[var(--border)] text-[var(--text-2)] rounded-lg text-sm hover:bg-[var(--bg-secondary)]">Обновить</button>
          <button onClick={clear} disabled={loading} className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm hover:bg-red-500/20 disabled:opacity-50">Очистить failed/done</button>
        </div>
      </div>
      {msg && <p className="mb-4 text-sm text-[var(--text-2)] bg-[var(--bg-secondary)] rounded-lg px-4 py-2">{msg}</p>}
      {data?.ok && (
        <>
          <div className="grid grid-cols-5 gap-3 mb-6">
            <Stat label="Ожидание" value={data.waiting} color="text-yellow-400" />
            <Stat label="Активные" value={data.active} color="text-blue-400" />
            <Stat label="Выполнено" value={data.completed} color="text-green-400" />
            <Stat label="Ошибки" value={data.failed} color="text-red-400" />
            <Stat label="Отложены" value={data.delayed} color="text-purple-400" />
          </div>
          {data.failedJobs.length > 0 && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)]"><p className="font-medium text-[var(--text)]">Упавшие задачи</p></div>
              {data.failedJobs.map((j, i) => (
                <div key={i} className="px-4 py-3 border-b border-[var(--border)] last:border-0">
                  <p className="text-sm text-[var(--text)] font-medium">{j.name}</p>
                  <p className="text-xs text-red-400 mt-0.5">{j.failedReason}</p>
                  <p className="text-xs text-[var(--text-3)] mt-0.5">Попыток: {j.attemptsMade}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {data && !data.ok && <p className="text-red-400 text-sm">Redis недоступен: {data.error}</p>}
    </div>
  )
}
