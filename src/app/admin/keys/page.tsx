"use client"
import { useEffect, useState } from "react"

interface Key { id: string; keyValue: string; isUsed: boolean; orderId?: string; usedAt?: string; createdAt: string; product: { name: string } }
interface Product { id: string; name: string }

export default function KeysPage() {
  const [keys, setKeys] = useState<Key[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState("")
  const [filter, setFilter] = useState("all")
  const [bulkText, setBulkText] = useState("")
  const [msg, setMsg] = useState("")
  const [total, setTotal] = useState(0)

  async function loadProducts() {
    const r = await fetch("/api/admin/products?status=active&page=1")
    const d = await r.json()
    setProducts(d.products ?? [])
  }
  async function load() {
    const params = new URLSearchParams({ filter, ...(selectedProduct ? { productId: selectedProduct } : {}) })
    const r = await fetch(`/api/admin/keys?${params}`)
    const d = await r.json()
    setKeys(d.keys ?? []); setTotal(d.total ?? 0)
  }
  async function upload() {
    if (!selectedProduct) return setMsg("Выберите товар")
    const lines = bulkText.split("\n").map(l => l.trim()).filter(Boolean)
    if (!lines.length) return setMsg("Введите ключи")
    const r = await fetch("/api/admin/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: selectedProduct, keys: lines }) })
    const d = await r.json()
    setMsg(r.ok ? `Загружено ${d.created} ключей` : d.error)
    setBulkText(""); await load()
  }
  async function remove(id: string) {
    if (!confirm("Удалить ключ?")) return
    await fetch(`/api/admin/keys?id=${id}`, { method: "DELETE" }); await load()
  }

  useEffect(() => { loadProducts() }, [])
  useEffect(() => { load() }, [filter, selectedProduct])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[var(--text)] mb-6">Склад ключей</h1>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <p className="font-medium text-[var(--text)] mb-3">Загрузить ключи (по одному на строку)</p>
          <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] mb-3">
            <option value="">Выберите товар</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} placeholder={"KEY-1111-2222-3333\nKEY-4444-5555-6666\n..."} rows={6} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] font-mono resize-none" />
          {msg && <p className="text-sm mt-2 text-[var(--text-2)]">{msg}</p>}
          <button onClick={upload} className="mt-3 px-4 py-2 bg-brand text-white rounded-lg text-sm">Загрузить</button>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex flex-col justify-center items-center text-center">
          <p className="text-4xl font-bold text-brand">{total}</p>
          <p className="text-[var(--text-3)] mt-1">ключей {filter === "free" ? "свободно" : filter === "used" ? "использовано" : "всего"}</p>
        </div>
      </div>
      <div className="flex gap-2 mb-4">
        {(["all", "free", "used"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-sm ${filter === f ? "bg-brand text-white" : "border border-[var(--border)] text-[var(--text-2)]"}`}>
            {f === "all" ? "Все" : f === "free" ? "Свободны" : "Использованы"}
          </button>
        ))}
      </div>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        {keys.map(k => (
          <div key={k.id} className="flex items-center gap-4 px-4 py-3 border-b border-[var(--border)] last:border-0 text-sm">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${k.isUsed ? "bg-red-400" : "bg-green-400"}`} />
            <span className="font-mono text-[var(--text)] flex-1">{k.keyValue}</span>
            <span className="text-[var(--text-3)]">{k.product.name}</span>
            <span className="text-[var(--text-3)]">{new Date(k.createdAt).toLocaleDateString("ru")}</span>
            {!k.isUsed && <button onClick={() => remove(k.id)} className="text-red-400 px-2">✕</button>}
          </div>
        ))}
        {keys.length === 0 && <p className="p-6 text-center text-[var(--text-3)]">Ключей нет</p>}
      </div>
    </div>
  )
}
