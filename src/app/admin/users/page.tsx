"use client"
import { useState, useEffect, useCallback } from "react"

interface User {
  id: string
  name: string | null
  email: string
  role: string
  isBlocked: boolean
  balance: number
  createdAt: string
  _count: { orders: number }
}

interface ApiResponse {
  users: User[]
  total: number
  page: number
  pages: number
}

export default function AdminUsersPage() {
  const [data, setData]             = useState<ApiResponse | null>(null)
  const [q, setQ]                   = useState("")
  const [search, setSearch]         = useState("")
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(true)
  const [actionId, setActionId]     = useState<string | null>(null)
  const [balanceId, setBalanceId]   = useState<string | null>(null)
  const [balanceAmt, setBalanceAmt] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (search) params.set("q", search)
    const r = await fetch(`/api/admin/users?${params}`)
    const d = await r.json()
    setData(d)
    setLoading(false)
  }, [search, page])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const t = setTimeout(() => { setSearch(q); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [q])

  const toggleBlock = async (id: string, block: boolean) => {
    setActionId(id)
    await fetch(`/api/admin/users/${id}/block`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ block }),
    })
    setData(d => d ? { ...d, users: d.users.map(u => u.id === id ? { ...u, isBlocked: block } : u) } : d)
    setActionId(null)
  }

  const adjustBalance = async (id: string) => {
    const amount = parseFloat(balanceAmt)
    if (isNaN(amount)) return
    setActionId(id)
    await fetch(`/api/admin/users/${id}/balance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    })
    setBalanceId(null)
    setBalanceAmt("")
    load()
    setActionId(null)
  }

  const fmtDate = (s: string) => new Date(s).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Пользователи</h1>
          {data && <p className="text-gray-500 text-sm mt-0.5">Всего: {data.total}</p>}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="search"
            placeholder="Email или имя..."
            value={q}
            onChange={e => setQ(e.target.value)}
            className="gp-input text-sm w-64"
          />
          <a
            href="/api/admin/users/export"
            className="btn-outline text-sm px-4 py-2 shrink-0"
          >
            &#8659; CSV
          </a>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">Пользователь</th>
              <th className="text-center px-4 py-3">Роль</th>
              <th className="text-right px-4 py-3">Баланс</th>
              <th className="text-right px-4 py-3">Заказы</th>
              <th className="text-center px-4 py-3">Статус</th>
              <th className="text-right px-4 py-3">Регистрация</th>
              <th className="text-center px-4 py-3">Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-800">
                  <td colSpan={7} className="px-4 py-3">
                    <div className="h-4 bg-gray-800 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : (data?.users ?? []).map(u => (
              <tr key={u.id} className="border-b border-gray-800 last:border-0 hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <p className="text-white font-medium">{u.name ?? "—"}</p>
                  <p className="text-gray-500 text-xs">{u.email}</p>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role === "admin" ? "bg-brand/20 text-brand" : "bg-white/5 text-gray-400"}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {balanceId === u.id ? (
                    <div className="flex items-center gap-1 justify-end">
                      <input
                        type="number"
                        value={balanceAmt}
                        onChange={e => setBalanceAmt(e.target.value)}
                        placeholder="±сумма"
                        className="gp-input text-xs w-20 py-1 text-right"
                        autoFocus
                      />
                      <button onClick={() => adjustBalance(u.id)} disabled={!!actionId}
                        className="text-xs text-emerald-400 hover:text-emerald-300 px-1">&#10003;</button>
                      <button onClick={() => setBalanceId(null)}
                        className="text-xs text-gray-500 hover:text-gray-300 px-1">&#10007;</button>
                    </div>
                  ) : (
                    <button onClick={() => { setBalanceId(u.id); setBalanceAmt("") }}
                      className="text-white font-semibold hover:text-brand transition-colors">
                      {Number(u.balance).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} &#8381;
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-gray-400">{u._count.orders}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.isBlocked ? "bg-red-900/40 text-red-400" : "bg-emerald-900/30 text-emerald-400"}`}>
                    {u.isBlocked ? "Заблок." : "Активен"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-600 text-xs">{fmtDate(u.createdAt)}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    disabled={actionId === u.id}
                    onClick={() => toggleBlock(u.id, !u.isBlocked)}
                    className={`text-xs px-3 py-1 rounded-lg transition-colors ${u.isBlocked
                      ? "bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/40"
                      : "bg-red-900/20 text-red-400 hover:bg-red-900/40"
                    }`}
                  >
                    {actionId === u.id ? "..." : u.isBlocked ? "Разбл." : "Блок."}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.users.length === 0 && (
          <div className="text-center py-16 text-gray-600">Пользователи не найдены</div>
        )}
      </div>

      {data && data.pages > 1 && (
        <div className="flex items-center gap-2 mt-4 justify-center">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="btn-ghost text-sm px-3 py-1.5 disabled:opacity-40">&#8592;</button>
          <span className="text-sm text-gray-500">{page} / {data.pages}</span>
          <button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}
            className="btn-ghost text-sm px-3 py-1.5 disabled:opacity-40">&#8594;</button>
        </div>
      )}
    </div>
  )
}