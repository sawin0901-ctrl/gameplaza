"use client"
import { useEffect, useState } from "react"

interface Sale { id: string; discountValue: number; discountType: string; startAt: string; endAt: string; isActive: boolean; product: { name: string; price: number; imageUrl?: string } }
interface Product { id: string; name: string; price: number }

export default function FlashSalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [form, setForm] = useState({ productId: "", discountValue: 20, discountType: "percent", startAt: "", endAt: "" })
  const [msg, setMsg] = useState("")

  async function load() { const r = await fetch("/api/admin/flash-sales"); const d = await r.json(); setSales(d.sales ?? []) }
  async function loadProducts() { const r = await fetch("/api/admin/products?status=active&page=1"); const d = await r.json(); setProducts(d.products ?? []) }
  async function create() {
    if (!form.productId || !form.startAt || !form.endAt) return setMsg("Заполните все поля")
    const r = await fetch("/api/admin/flash-sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    if (r.ok) { setMsg("Распродажа создана"); await load() }
    else setMsg((await r.json()).error)
  }
  async function toggle(s: Sale) {
    await fetch("/api/admin/flash-sales", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id, isActive: !s.isActive }) })
    await load()
  }
  async function remove(id: string) {
    if (!confirm("Удалить?")) return
    await fetch(`/api/admin/flash-sales?id=${id}`, { method: "DELETE" }); await load()
  }

  function isActive(s: Sale) { const now = Date.now(); return s.isActive && new Date(s.startAt).getTime() <= now && new Date(s.endAt).getTime() >= now }
  function isExpired(s: Sale) { return new Date(s.endAt).getTime() < Date.now() }

  useEffect(() => { load(); loadProducts() }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[var(--text)] mb-6">Flash-распродажи</h1>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-6">
        <p className="font-medium text-[var(--text)] mb-3">Создать распродажу</p>
        <div className="grid grid-cols-2 gap-3">
          <select value={form.productId} onChange={e => setForm(f => ({...f, productId: e.target.value}))} className="col-span-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)]">
            <option value="">Выберите товар</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name} — {p.price} ₽</option>)}
          </select>
          <div className="flex gap-2">
            <input type="number" value={form.discountValue} onChange={e => setForm(f => ({...f, discountValue: Number(e.target.value)}))} placeholder="Скидка" className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)]" />
            <select value={form.discountType} onChange={e => setForm(f => ({...f, discountType: e.target.value}))} className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)]">
              <option value="percent">%</option>
              <option value="fixed">₽</option>
            </select>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="text-xs text-[var(--text-3)] mb-1">Начало</p>
              <input type="datetime-local" value={form.startAt} onChange={e => setForm(f => ({...f, startAt: e.target.value}))} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)]" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-[var(--text-3)] mb-1">Конец</p>
              <input type="datetime-local" value={form.endAt} onChange={e => setForm(f => ({...f, endAt: e.target.value}))} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)]" />
            </div>
          </div>
        </div>
        {msg && <p className="text-sm mt-2 text-[var(--text-2)]">{msg}</p>}
        <button onClick={create} className="mt-3 px-4 py-2 bg-brand text-white rounded-lg text-sm">Создать</button>
      </div>
      <div className="space-y-3">
        {sales.map(s => (
          <div key={s.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="font-medium text-[var(--text)]">{s.product.name}</p>
              <div className="flex gap-3 mt-1 text-xs text-[var(--text-3)]">
                <span>Скидка: <span className="text-brand font-semibold">{s.discountValue}{s.discountType === "percent" ? "%" : "₽"}</span></span>
                <span>{new Date(s.startAt).toLocaleString("ru")} → {new Date(s.endAt).toLocaleString("ru")}</span>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isActive(s) ? "bg-green-500/20 text-green-400" : isExpired(s) ? "bg-[var(--bg-secondary)] text-[var(--text-3)]" : "bg-yellow-500/20 text-yellow-400"}`}>
              {isActive(s) ? "Активна" : isExpired(s) ? "Истекла" : "Ожидает"}
            </span>
            <button onClick={() => toggle(s)} className="text-[var(--text-3)] text-sm px-2 hover:text-[var(--text)]">{s.isActive ? "Выкл" : "Вкл"}</button>
            <button onClick={() => remove(s.id)} className="text-red-400 px-2">✕</button>
          </div>
        ))}
        {sales.length === 0 && <p className="text-center text-[var(--text-3)] py-8">Распродаж нет</p>}
      </div>
    </div>
  )
}
