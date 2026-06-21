"use client"
import { useEffect, useState } from "react"

interface ReferralCode { id: string; code: string; usedCount: number; bonusAmount: number; isActive: boolean; createdAt: string; user: { name?: string; email: string } }

export default function ReferralsPage() {
  const [codes, setCodes] = useState<ReferralCode[]>([])
  const [total, setTotal] = useState(0)
  const [form, setForm] = useState({ userId: "", code: "", bonusAmount: 50 })
  const [msg, setMsg] = useState("")

  async function load() { const r = await fetch("/api/admin/referrals"); const d = await r.json(); setCodes(d.codes ?? []); setTotal(d.total ?? 0) }
  async function create() {
    if (!form.userId) return setMsg("Введите ID пользователя")
    const r = await fetch("/api/admin/referrals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    if (r.ok) { setMsg("Код создан"); setForm({ userId: "", code: "", bonusAmount: 50 }); await load() }
    else setMsg((await r.json()).error)
  }
  async function toggle(c: ReferralCode) {
    await fetch("/api/admin/referrals", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id, isActive: !c.isActive }) })
    await load()
  }
  async function remove(id: string) {
    if (!confirm("Удалить?")) return
    await fetch(`/api/admin/referrals?id=${id}`, { method: "DELETE" }); await load()
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Реферальная программа</h1>
          <p className="text-[var(--text-3)] text-sm mt-1">Всего кодов: {total}</p>
        </div>
      </div>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-6">
        <p className="font-medium text-[var(--text)] mb-3">Создать реферальный код</p>
        <div className="grid grid-cols-3 gap-3">
          <input value={form.userId} onChange={e => setForm(f => ({...f, userId: e.target.value}))} placeholder="ID пользователя *" className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)]" />
          <input value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value.toUpperCase()}))} placeholder="Код (оставьте пустым = авто)" className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] font-mono" />
          <div className="flex gap-2 items-center">
            <input type="number" value={form.bonusAmount} onChange={e => setForm(f => ({...f, bonusAmount: Number(e.target.value)}))} placeholder="Бонус ₽" className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)]" />
            <span className="text-[var(--text-3)] text-sm">₽</span>
          </div>
        </div>
        {msg && <p className="text-sm mt-2 text-[var(--text-2)]">{msg}</p>}
        <button onClick={create} className="mt-3 px-4 py-2 bg-brand text-white rounded-lg text-sm">Создать</button>
      </div>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-4 px-4 py-2 border-b border-[var(--border)] text-xs font-medium text-[var(--text-3)] uppercase">
          <span>Код</span><span>Пользователь</span><span>Использований</span><span>Бонус</span><span>Статус</span><span></span>
        </div>
        {codes.map(c => (
          <div key={c.id} className="grid grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-4 px-4 py-3 border-b border-[var(--border)] last:border-0 items-center text-sm">
            <span className="font-mono font-bold text-brand">{c.code}</span>
            <span className="text-[var(--text-2)]">{c.user.name ?? c.user.email}</span>
            <span className="text-[var(--text-3)]">{c.usedCount}x</span>
            <span className="text-green-400 font-semibold">{c.bonusAmount} ₽</span>
            <button onClick={() => toggle(c)} className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.isActive ? "bg-green-500/20 text-green-400" : "bg-[var(--bg-secondary)] text-[var(--text-3)]"}`}>
              {c.isActive ? "Активен" : "Откл"}
            </button>
            <button onClick={() => remove(c.id)} className="text-red-400 px-2">✕</button>
          </div>
        ))}
        {codes.length === 0 && <p className="p-6 text-center text-[var(--text-3)]">Кодов нет</p>}
      </div>
    </div>
  )
}
