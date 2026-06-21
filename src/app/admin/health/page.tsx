"use client"
import { useEffect, useState } from "react"

interface Check { ok: boolean; ms?: number; error?: string; status?: number }
interface HealthData { ok: boolean; db: Check; redis: Check; digiseller: Check; mail: Check; checkedAt: string }

function Badge({ ok }: { ok: boolean }) {
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ok ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>{ok ? "OK" : "FAIL"}</span>
}

function Row({ label, data }: { label: string; data: Check }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-0">
      <div>
        <p className="text-[var(--text)] font-medium">{label}</p>
        {data.error && <p className="text-red-400 text-xs mt-0.5">{data.error}</p>}
        {data.ms !== undefined && <p className="text-[var(--text-3)] text-xs mt-0.5">{data.ms}ms</p>}
      </div>
      <Badge ok={data.ok} />
    </div>
  )
}

export default function HealthPage() {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(false)

  async function check() {
    setLoading(true)
    try {
      const r = await fetch("/api/admin/health")
      setData(await r.json())
    } finally { setLoading(false) }
  }

  useEffect(() => { check() }, [])

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Health Check</h1>
          {data && <p className="text-[var(--text-3)] text-sm mt-1">Проверено: {new Date(data.checkedAt).toLocaleString("ru")}</p>}
        </div>
        <div className="flex items-center gap-3">
          {data && <Badge ok={data.ok} />}
          <button onClick={check} disabled={loading} className="px-4 py-2 bg-brand text-white rounded-lg text-sm disabled:opacity-50">
            {loading ? "Проверяю..." : "Обновить"}
          </button>
        </div>
      </div>
      {data && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <Row label="База данных (PostgreSQL)" data={data.db} />
          <Row label="Redis / BullMQ" data={data.redis} />
          <Row label="Digiseller API" data={data.digiseller} />
          <Row label="Email (SMTP)" data={data.mail} />
        </div>
      )}
    </div>
  )
}
