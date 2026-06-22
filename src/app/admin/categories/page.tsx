"use client"
import { useEffect, useState } from "react"
import Link from "next/link"

interface Category { id: string; name: string; slug: string; _count: { products: number } }

export default function AdminCategoriesPage() {
  const [cats, setCats] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editSlug, setEditSlug] = useState("")
  const [newName, setNewName] = useState("")
  const [newSlug, setNewSlug] = useState("")
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  async function load() {
    setLoading(true)
    const r = await fetch("/api/admin/categories")
    setCats(await r.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function flash(text: string, ok = true) { setMsg({ text, ok }); setTimeout(() => setMsg(null), 2500) }

  async function save(id: string) {
    setSaving(true)
    await fetch("/api/admin/categories", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, name: editName, slug: editSlug }) })
    setEditing(null); await load(); flash("Сохранено")
    setSaving(false)
  }

  async function remove(id: string, name: string, count: number) {
    if (count > 0) { flash("Нельзя удалить: " + count + " товаров в категории", false); return }
    if (!confirm("Удалить категорию \"" + name + "\"?")) return
    await fetch("/api/admin/categories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    await load(); flash("Удалено")
  }

  async function create() {
    if (!newName || !newSlug) return
    setSaving(true)
    const r = await fetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName, slug: newSlug }) })
    if (r.ok) { setNewName(""); setNewSlug(""); await load(); flash("Категория создана") }
    else flash("Ошибка создания", false)
    setSaving(false)
  }

  const total = cats.reduce((s, c) => s + c._count.products, 0)

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Категории</h1>
          <p className="text-[var(--text-3)] text-sm mt-1">{cats.length} категорий · {total} товаров</p>
        </div>
        {msg && <span className={"text-sm font-medium " + (msg.ok ? "text-emerald-400" : "text-red-400")}>{msg.text}</span>}
      </div>

      <div className="card p-4 mb-6">
        <h3 className="font-semibold text-[var(--text)] mb-3 text-sm">Новая категория</h3>
        <div className="flex gap-2 flex-wrap">
          <input value={newName}
            onChange={e => { setNewName(e.target.value); setNewSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")) }}
            placeholder="Название (напр. Steam)" className="gp-input py-2 text-sm flex-1 min-w-[140px]" />
          <input value={newSlug} onChange={e => setNewSlug(e.target.value)}
            placeholder="slug (напр. steam)" className="gp-input py-2 text-sm w-36 font-mono" />
          <button onClick={create} disabled={!newName || !newSlug || saving}
            className="btn-primary py-2 px-4 text-sm disabled:opacity-50">Создать</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--text-3)] text-xs">
              <th className="text-left px-4 py-3">Название</th>
              <th className="text-left px-4 py-3">Slug</th>
              <th className="text-right px-4 py-3">Товаров</th>
              <th className="text-right px-4 py-3 w-36">Действия</th>
            </tr>
          </thead>
          <tbody>
            {cats.map(c => (
              <tr key={c.id} className="border-b border-[var(--border)] last:border-0 hover:bg-white/2">
                {editing === c.id ? (
                  <>
                    <td className="px-3 py-2"><input value={editName} onChange={e => setEditName(e.target.value)} className="gp-input py-1 text-sm w-full" /></td>
                    <td className="px-3 py-2"><input value={editSlug} onChange={e => setEditSlug(e.target.value)} className="gp-input py-1 text-sm w-full font-mono" /></td>
                    <td className="px-4 py-2 text-right text-[var(--text-3)]">{c._count.products}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => save(c.id)} disabled={saving} className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs hover:bg-emerald-500/30">OK</button>
                        <button onClick={() => setEditing(null)} className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs">✕</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3">
                      <Link href={"/catalog/" + c.slug} target="_blank" className="text-[var(--text)] font-medium hover:text-brand transition-colors">{c.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-3)] font-mono text-xs">{c.slug}</td>
                    <td className="px-4 py-3 text-right text-[var(--text-3)]">{c._count.products}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => { setEditing(c.id); setEditName(c.name); setEditSlug(c.slug) }}
                          className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs hover:bg-blue-500/30">Изм.</button>
                        <button onClick={() => remove(c.id, c.name, c._count.products)}
                          className={"px-2 py-1 rounded text-xs " + (c._count.products > 0 ? "bg-gray-500/10 text-gray-600 cursor-not-allowed" : "bg-red-500/20 text-red-400 hover:bg-red-500/30")}>
                          Удал.
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {cats.length === 0 && !loading && <div className="text-center py-12 text-[var(--text-3)]">Категорий нет</div>}
      </div>
    </div>
  )
}