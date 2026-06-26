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
  botScore: number
  botReasons: string[]
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
  const [bulkMsg, setBulkMsg]       = useState<{ ok: boolean; text: string } | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)

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
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isBlocked: block }),
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

  const bulkBlockBots = async () => {
    if (!confirm("Заблокировать всех пользователей с подозрительными email-адресами (боты)?")) return
    setBulkLoading(true)
    setBulkMsg(null)
    const r = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "bulk-block-bots" }),
    })
    const d = await r.json()
    setBulkMsg({ ok: !!d.ok, text: d.message ?? d.error ?? "Готово" })
    setBulkLoading(false)
    load()
  }

  const fmtDate = (s: string) => new Date(s).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })

  const botUsers = data?.users.filter(u => u.botScore >= 60 && !u.isBlocked) ?? []

  return (
    <div className="p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Пользователи</h1>
          {data && (
            <p className="text-gray-500 text-sm mt-0.5">
              Всего: {data.total}
              {botUsers.length > 0 && (
                <span className="ml-2 text-red-400 font-medium">· {botUsers.length} ботов не заблокировано</span>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="search"
            placeholder="Email или имя..."
            value={q}
            onChange={e => setQ(e.target.value)}
            className="gp-input text-sm w-64"
          />
          {botUsers.length > 0 && (
            <button
              onClick={bulkBlockBots}
              disabled={bulkLoading}
              className="text-sm px-4 py-2 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-900/40 transition-colors font-medium shrink-0 flex items-center gap-2"
            >
              {bulkLoading
                ? <><span className="w-3.5 h-3.5 border border-red-400/30 border-t-red-400 rounded-full animate-spin" />Блокирую...</>
                : <>&#9888; Заблокировать ботов ({botUsers.length})</>
              }
            </button>
          )}
          <a href="/api/admin/users/export" className="btn-outline text-sm px-4 py-2 shrink-0">
            &#8659; CSV
          </a>
        </div>
      </div>

      {/* ── Bulk action message ── */}
      {bulkMsg && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm border ${
          bulkMsg.ok ? "bg-emerald-900/20 border-emerald-900/30 text-emerald-400" : "bg-red-900/20 border-red-900/30 text-red-400"
        }`}>
          {bulkMsg.ok ? "✓ " : "⚠ "}{bulkMsg.text}
        </div>
      )}

      {/* ── Table ── */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
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
            ) : (data?.users ?? []).map(u => {
              const isBot = u.botScore >= 60
              return (
                <tr
                  key={u.id}
                  className={`border-b border-gray-800 last:border-0 transition-colors ${
                    isBot && !u.isBlocked
                      ? "bg-red-950/20 hover:bg-red-950/30"
                      : "hover:bg-white/[0.02]"
                  }`}
                >
                  {/* Name / email */}
                  <td className="px-4 py-3">
                    <p className="text-white font-medium flex items-center gap-2">
                      {u.name ?? "—"}
                      {isBot && (
                        <span
                          title={`Бот (счёт ${u.botScore}/100): ${u.botReasons.join(", ")}`}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/50 text-red-400 border border-red-900/40 cursor-help leading-tight"
                        >
                          БОТ {u.botScore}
                        </span>
                      )}
                    </p>
                    <p className={`text-xs ${isBot ? "text-red-400/70" : "text-gray-500"}`}>{u.email}</p>
                    {isBot && u.botReasons.length > 0 && (
                      <p className="text-[10px] text-red-400/50 mt-0.5">{u.botReasons.join(" · ")}</p>
                    )}
                  </td>

                  {/* Role */}
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role === "admin" ? "bg-brand/20 text-brand" : "bg-white/5 text-gray-400"}`}>
                      {u.role}
                    </span>
                  </td>

                  {/* Balance */}
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

                  {/* Orders */}
                  <td className="px-4 py-3 text-right text-gray-400">{u._count.orders}</td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.isBlocked ? "bg-red-900/40 text-red-400" : "bg-emerald-900/30 text-emerald-400"}`}>
                      {u.isBlocked ? "Заблок." : "Активен"}
                    </span>
                  </td>

                  {/* Registration date */}
                  <td className="px-4 py-3 text-right text-gray-600 text-xs">{fmtDate(u.createdAt)}</td>

                  {/* Actions */}
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
              )
            })}
          </tbody>
        </table>
        {data?.users.length === 0 && (
          <div className="text-center py-16 text-gray-600">Пользователи не найдены</div>
        )}
      </div>

      {/* ── Pagination ── */}
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
