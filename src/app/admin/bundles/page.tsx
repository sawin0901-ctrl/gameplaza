"use client"
import { useEffect, useState } from "react"

interface BundleItem { product: { name: string; price: number } }
interface Bundle { id: string; name: string; slug: string; price: number; isActive: boolean; description?: string; items: BundleItem[] }
interface Product { id: string; name: string; price: number }

export default function BundlesPage() {
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [form, setForm] = useState({ name: "", slug: "", description: "", price: 0, productIds: [] as string[] })
  const [msg, setMsg] = useState("")

  async function load() { const r = await fetch("/api/admin/bundles"); const d = await r.json(); setBundles(d.bundles ?? []) }
  async function loadProducts() { const r = await fetch("/api/admin/products?status=active&page=1"); const d = await r.json(); setProducts(d.products ?? []) }
  async function create() {
    if (!form.name || !form.slug || !form.price || !form.productIds.length) return setMsg("Заполните все поля и выберите товары")
    const r = await fetch("/api/admin/bundles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    if (r.ok) { setMsg("Набор создан"); setForm({ name: "", slug: "", description: "", price: 0, productIds: [] }); await load() }
    else setMsg((await r.json()).error)
  }
  async function toggle(b: Bundle) {
    await fetch("/api/admin/bundles", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: b.id, isActive: !b.isActive }) })
    await load()
  }
  async function remove(id: string) {
    if (!confirm("Удалить набор?")) return
    await fetch(`/api/admin/bundles?id=${id}`, { method: "DELETE" }); await load()
  }
  function toggleProduct(id: string) {
    setForm(f => ({ ...f, productIds: f.productIds.includes(id) ? f.productIds.filter(p => p !== id) : [...f.productIds, id] }))
  }
  function autoSlug(name: string) { return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") }

  useEffect(() => { load(); loadProducts() }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[var(--text)] mb-6">Наборы / Бандлы</h1>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-6">
        <p className="font-medium text-[var(--text)] mb-3">Создать набор</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value, slug: autoSlug(e.target.value)}))} placeholder="Название набора *" className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)]" />
          <input value={form.slug} onChange={e => setForm(f => ({...f, slug: e.target.value}))} placeholder="slug *" className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] font-mono" />
          <input type="number" value={form.price || ""} onChange={e => setForm(f => ({...f, price: Number(e.target.value)}))} placeholder="Цена набора (₽) *" className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)]" />
          <input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Описание (необязательно)" className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)]" />
        </div>
        <p className="text-xs text-[var(--text-3)] mb-2">Выберите товары для набора:</p>
        <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
          {products.map(p => (
            <label key={p.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition ${form.productIds.includes(p.id) ? "border-brand bg-brand/10 text-brand" : "border-[var(--border)] text-[var(--text-2)]"}`}>
              <input type="checkbox" checked={form.productIds.includes(p.id)} onChange={() => toggleProduct(p.id)} className="hidden" />
              <span className="truncate">{p.name}</span>
            </label>
          ))}
        </div>
        {form.productIds.length > 0 && <p className="text-xs text-brand mt-2">Выбрано: {form.productIds.length} товаров</p>}
        {msg && <p className="text-sm mt-2 text-[var(--text-2)]">{msg}</p>}
        <button onClick={create} className="mt-3 px-4 py-2 bg-brand text-white rounded-lg text-sm">Создать набор</button>
      </div>
      <div className="space-y-3">
        {bundles.map(b => (
          <div key={b.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-[var(--text)]">{b.name}</p>
                <p className="text-xs text-[var(--text-3)] font-mono mt-0.5">/{b.slug}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {b.items.map((item, i) => (
                    <span key={i} className="px-2 py-0.5 bg-[var(--bg-secondary)] rounded text-xs text-[var(--text-2)]">{item.product.name}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-brand font-bold">{b.price} ₽</span>
                <button onClick={() => toggle(b)} className={`px-2 py-0.5 rounded-full text-xs font-semibold ${b.isActive ? "bg-green-500/20 text-green-400" : "bg-[var(--bg-secondary)] text-[var(--text-3)]"}`}>{b.isActive ? "Активен" : "Скрыт"}</button>
                <button onClick={() => remove(b.id)} className="text-red-400 px-2">✕</button>
              </div>
            </div>
          </div>
        ))}
        {bundles.length === 0 && <p className="text-center text-[var(--text-3)] py-8">Наборов нет</p>}
      </div>
    </div>
  )
}
