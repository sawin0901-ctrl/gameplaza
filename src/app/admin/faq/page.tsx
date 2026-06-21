"use client"
import { useEffect, useState } from "react"

interface FAQItem { id: string; question: string; answer: string; category: string; isActive: boolean; sortOrder: number }

const CATEGORIES = ["general", "payment", "delivery", "account", "technical"]

export default function FAQPage() {
  const [items, setItems] = useState<FAQItem[]>([])
  const [form, setForm] = useState({ question: "", answer: "", category: "general", sortOrder: 0 })
  const [editing, setEditing] = useState<FAQItem | null>(null)
  const [msg, setMsg] = useState("")

  async function load() { const r = await fetch("/api/admin/faq"); const d = await r.json(); setItems(d.items ?? []) }
  async function save() {
    if (!form.question.trim() || !form.answer.trim()) return setMsg("Заполните вопрос и ответ")
    const method = editing ? "PATCH" : "POST"
    const body = editing ? { id: editing.id, ...form } : form
    const r = await fetch("/api/admin/faq", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    if (r.ok) { setMsg(editing ? "Обновлено" : "Добавлено"); setForm({ question: "", answer: "", category: "general", sortOrder: 0 }); setEditing(null); await load() }
    else setMsg((await r.json()).error)
  }
  async function remove(id: string) {
    if (!confirm("Удалить вопрос?")) return
    await fetch(`/api/admin/faq?id=${id}`, { method: "DELETE" }); await load()
  }
  async function toggle(item: FAQItem) {
    await fetch("/api/admin/faq", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, isActive: !item.isActive }) })
    await load()
  }
  function edit(item: FAQItem) { setEditing(item); setForm({ question: item.question, answer: item.answer, category: item.category, sortOrder: item.sortOrder }) }

  useEffect(() => { load() }, [])

  const grouped = CATEGORIES.reduce<Record<string, FAQItem[]>>((acc, cat) => { acc[cat] = items.filter(i => i.category === cat); return acc }, {})

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[var(--text)] mb-6">FAQ — Частые вопросы</h1>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-6">
        <p className="font-medium text-[var(--text)] mb-3">{editing ? "Редактировать вопрос" : "Добавить вопрос"}</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)]">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input value={form.sortOrder} onChange={e => setForm(f => ({...f, sortOrder: Number(e.target.value)}))} type="number" placeholder="Порядок" className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)]" />
          </div>
          <input value={form.question} onChange={e => setForm(f => ({...f, question: e.target.value}))} placeholder="Вопрос *" className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)]" />
          <textarea value={form.answer} onChange={e => setForm(f => ({...f, answer: e.target.value}))} placeholder="Ответ *" rows={3} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] resize-none" />
        </div>
        {msg && <p className="text-sm mt-2 text-[var(--text-2)]">{msg}</p>}
        <div className="flex gap-2 mt-3">
          <button onClick={save} className="px-4 py-2 bg-brand text-white rounded-lg text-sm">{editing ? "Сохранить" : "Добавить"}</button>
          {editing && <button onClick={() => { setEditing(null); setForm({ question: "", answer: "", category: "general", sortOrder: 0 }); setMsg("") }} className="px-4 py-2 border border-[var(--border)] text-[var(--text-2)] rounded-lg text-sm">Отмена</button>}
        </div>
      </div>
      {CATEGORIES.map(cat => grouped[cat]?.length > 0 && (
        <div key={cat} className="mb-4">
          <p className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">{cat}</p>
          <div className="space-y-2">
            {grouped[cat].map(item => (
              <div key={item.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-[var(--text)] text-sm">{item.question}</p>
                    <p className="text-[var(--text-3)] text-sm mt-1 line-clamp-2">{item.answer}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => toggle(item)} className={`px-2 py-0.5 rounded-full text-xs ${item.isActive ? "bg-green-500/20 text-green-400" : "bg-[var(--bg-secondary)] text-[var(--text-3)]"}`}>{item.isActive ? "Вкл" : "Выкл"}</button>
                    <button onClick={() => edit(item)} className="text-brand text-sm px-2">✎</button>
                    <button onClick={() => remove(item.id)} className="text-red-400 text-sm px-2">✕</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
