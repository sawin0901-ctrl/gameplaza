"use client"
import { useEffect, useState } from "react"

interface Message { id: string; isAdmin: boolean; text: string; createdAt: string }
interface Ticket { id: string; email: string; subject: string; status: string; priority: string; createdAt: string; messages: Message[]; user?: { name?: string; email: string } }

const PRIORITY_COLOR: Record<string, string> = { low: "text-[var(--text-3)]", normal: "text-blue-400", high: "text-orange-400", urgent: "text-red-400" }
const STATUS_COLOR: Record<string, string> = { open: "bg-green-500/20 text-green-400", pending: "bg-yellow-500/20 text-yellow-400", closed: "bg-[var(--bg-secondary)] text-[var(--text-3)]" }

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [reply, setReply] = useState("")
  const [statusFilter, setStatusFilter] = useState("open")
  const [total, setTotal] = useState(0)

  async function load() {
    const r = await fetch(`/api/admin/tickets?status=${statusFilter}`)
    const d = await r.json()
    setTickets(d.tickets ?? []); setTotal(d.total ?? 0)
    if (selected) setSelected(d.tickets?.find((t: Ticket) => t.id === selected.id) ?? null)
  }
  async function sendReply() {
    if (!selected || !reply.trim()) return
    await fetch("/api/admin/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticketId: selected.id, text: reply }) })
    setReply(""); await load()
  }
  async function closeTicket() {
    if (!selected) return
    await fetch("/api/admin/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "close", ticketId: selected.id }) })
    await load()
  }

  useEffect(() => { load() }, [statusFilter])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--text)]">Тикеты / Поддержка <span className="text-[var(--text-3)] font-normal text-base">({total})</span></h1>
        <div className="flex gap-2">
          {(["open", "pending", "closed", "all"] as const).map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setSelected(null) }}
              className={`px-3 py-1.5 rounded-lg text-sm ${statusFilter === s ? "bg-brand text-white" : "border border-[var(--border)] text-[var(--text-2)]"}`}>
              {s === "all" ? "Все" : s === "open" ? "Открытые" : s === "pending" ? "В работе" : "Закрытые"}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-[320px_1fr] gap-4">
        <div className="space-y-2">
          {tickets.map(t => (
            <div key={t.id} onClick={() => setSelected(t)} className={`bg-[var(--card)] border rounded-xl p-3 cursor-pointer transition ${selected?.id === t.id ? "border-brand" : "border-[var(--border)] hover:border-brand/40"}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLOR[t.status] ?? ""}`}>{t.status}</span>
                <span className={`text-xs font-semibold ${PRIORITY_COLOR[t.priority]}`}>{t.priority}</span>
              </div>
              <p className="text-sm font-medium text-[var(--text)] line-clamp-1">{t.subject}</p>
              <p className="text-xs text-[var(--text-3)] mt-0.5">{t.email}</p>
              <p className="text-xs text-[var(--text-3)] mt-0.5">{new Date(t.createdAt).toLocaleDateString("ru")}</p>
            </div>
          ))}
          {tickets.length === 0 && <p className="text-center text-[var(--text-3)] py-8 text-sm">Тикетов нет</p>}
        </div>
        {selected ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl flex flex-col">
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--text)]">{selected.subject}</p>
                <p className="text-xs text-[var(--text-3)] mt-0.5">{selected.email}</p>
              </div>
              {selected.status !== "closed" && (
                <button onClick={closeTicket} className="px-3 py-1.5 bg-[var(--bg-secondary)] text-[var(--text-2)] rounded-lg text-sm hover:bg-[var(--border)]">Закрыть тикет</button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selected.messages.map(m => (
                <div key={m.id} className={`flex ${m.isAdmin ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${m.isAdmin ? "bg-brand text-white" : "bg-[var(--bg-secondary)] text-[var(--text)]"}`}>
                    <p>{m.text}</p>
                    <p className={`text-xs mt-1 ${m.isAdmin ? "text-white/60" : "text-[var(--text-3)]"}`}>{new Date(m.createdAt).toLocaleString("ru")}</p>
                  </div>
                </div>
              ))}
            </div>
            {selected.status !== "closed" && (
              <div className="p-4 border-t border-[var(--border)] flex gap-2">
                <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Ответ..." rows={2} className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] resize-none" />
                <button onClick={sendReply} className="px-4 py-2 bg-brand text-white rounded-lg text-sm self-end">Отправить</button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl flex items-center justify-center">
            <p className="text-[var(--text-3)]">Выберите тикет</p>
          </div>
        )}
      </div>
    </div>
  )
}
