"use client"
import { useEffect, useState } from "react"
import Image from "next/image"

interface Banner { id: string; title: string; subtitle?: string; imageUrl: string; linkUrl?: string; isActive: boolean; sortOrder: number }

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [form, setForm] = useState({ title: "", subtitle: "", imageUrl: "", linkUrl: "", sortOrder: 0 })
  const [msg, setMsg] = useState("")

  async function load() { const r = await fetch("/api/admin/banners"); const d = await r.json(); setBanners(d.banners ?? []) }
  async function create() {
    if (!form.title || !form.imageUrl) return setMsg("Заполните Название и URL изображения")
    const r = await fetch("/api/admin/banners", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    if (r.ok) { setMsg("Баннер создан"); setForm({ title: "", subtitle: "", imageUrl: "", linkUrl: "", sortOrder: 0 }); await load() }
    else setMsg((await r.json()).error)
  }
  async function toggle(b: Banner) {
    await fetch("/api/admin/banners", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: b.id, isActive: !b.isActive }) })
    await load()
  }
  async function remove(id: string) {
    if (!confirm("Удалить баннер?")) return
    await fetch(`/api/admin/banners?id=${id}`, { method: "DELETE" }); await load()
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[var(--text)] mb-6">Баннеры / Слайдер</h1>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-6">
        <p className="font-medium text-[var(--text)] mb-3">Добавить баннер</p>
        <div className="grid grid-cols-2 gap-3">
          <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="Заголовок *" className="col-span-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)]" />
          <input value={form.subtitle} onChange={e => setForm(f => ({...f, subtitle: e.target.value}))} placeholder="Подзаголовок" className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)]" />
          <input value={form.sortOrder} onChange={e => setForm(f => ({...f, sortOrder: Number(e.target.value)}))} type="number" placeholder="Порядок (0, 1, 2...)" className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)]" />
          <input value={form.imageUrl} onChange={e => setForm(f => ({...f, imageUrl: e.target.value}))} placeholder="URL изображения *" className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)]" />
          <input value={form.linkUrl} onChange={e => setForm(f => ({...f, linkUrl: e.target.value}))} placeholder="Ссылка (необязательно)" className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)]" />
        </div>
        {msg && <p className="text-sm mt-2 text-[var(--text-2)]">{msg}</p>}
        <button onClick={create} className="mt-3 px-4 py-2 bg-brand text-white rounded-lg text-sm">Добавить</button>
      </div>
      <div className="space-y-3">
        {banners.map(b => (
          <div key={b.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-4">
            <div className="w-16 h-10 rounded overflow-hidden bg-[var(--bg-secondary)] flex-shrink-0">
              {b.imageUrl && <Image src={b.imageUrl} alt={b.title} width={64} height={40} className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[var(--text)] truncate">{b.title}</p>
              {b.linkUrl && <p className="text-xs text-[var(--text-3)] truncate">{b.linkUrl}</p>}
            </div>
            <span className="text-xs text-[var(--text-3)]">#{b.sortOrder}</span>
            <button onClick={() => toggle(b)} className={`px-3 py-1 rounded-full text-xs font-semibold ${b.isActive ? "bg-green-500/20 text-green-400" : "bg-[var(--bg-secondary)] text-[var(--text-3)]"}`}>
              {b.isActive ? "Активен" : "Скрыт"}
            </button>
            <button onClick={() => remove(b.id)} className="text-red-400 hover:text-red-300 text-sm px-2">✕</button>
          </div>
        ))}
        {banners.length === 0 && <p className="text-center text-[var(--text-3)] py-8">Баннеров нет</p>}
      </div>
    </div>
  )
}
