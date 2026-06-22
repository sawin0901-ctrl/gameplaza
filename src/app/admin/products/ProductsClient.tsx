"use client"
import { useState, useCallback } from "react"
import Link from "next/link"

interface Product {
  id: string; name: string; price: number; isActive: boolean
  digisellerProductId: number; categoryId: string | null
  category: { name: string } | null
}

async function loadProducts(page: number, q: string, status: string) {
  const sp = new URLSearchParams({ page: String(page), q, status })
  const r = await fetch("/api/admin/products?" + sp.toString())
  return r.json() as Promise<{ products: Product[]; total: number; pages: number }>
}

export default function AdminProductsClient({ initialProducts, initialTotal, initialPages, initialQ, initialStatus }: {
  initialProducts: Product[]; initialTotal: number; initialPages: number; initialQ: string; initialStatus: string
}) {
  const [products, setProducts] = useState(initialProducts)
  const [total, setTotal] = useState(initialTotal)
  const [pages, setPages] = useState(initialPages)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState(initialQ)
  const [status, setStatus] = useState(initialStatus)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkMsg, setBulkMsg] = useState<string | null>(null)
  const [editingPrice, setEditingPrice] = useState<string | null>(null)
  const [editPriceVal, setEditPriceVal] = useState("")

  const reload = useCallback(async (p = page, newQ = q, newStatus = status) => {
    setLoading(true)
    const data = await loadProducts(p, newQ, newStatus)
    setProducts(data.products); setTotal(data.total); setPages(data.pages)
    setLoading(false); setSelected(new Set())
  }, [page, q, status])

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleAll() {
    setSelected(prev => prev.size === products.length ? new Set() : new Set(products.map(p => p.id)))
  }

  async function bulkAction(action: "activate" | "deactivate" | "delete") {
    if (selected.size === 0) return
    const ids = [...selected]
    if (action === "delete" && !confirm("Удалить " + ids.length + " товаров?")) return
    setBulkLoading(true); setBulkMsg(null)
    try {
      const r = await fetch("/api/admin/products/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, action }) })
      const d = await r.json(); setBulkMsg(d.message ?? "Готово"); await reload()
    } catch { setBulkMsg("Ошибка") }
    setBulkLoading(false)
  }

  async function savePrice(id: string) {
    const price = parseFloat(editPriceVal)
    if (!price || price <= 0) { setEditingPrice(null); return }
    await fetch("/api/admin/products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, price }) }).catch(() => {})
    setEditingPrice(null); await reload()
  }

  function exportCsv() {
    const header = "ID,Название,Категория,Цена,Статус\n"
    const rows = products.map(p => [
      String(p.digisellerProductId),
      p.name.replace(/,/g, " "),
      (p.category?.name ?? "").replace(/,/g, " "),
      String(p.price),
      p.isActive ? "Активен" : "Скрыт",
    ].join(",")).join("\n")
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = "products.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Товары</h1>
          <p className="text-[var(--text-3)] text-sm mt-1">Всего: {total.toLocaleString("ru-RU")}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="btn-ghost py-2 px-3 text-sm">&#128229; CSV</button>
          <Link href="/admin/import" className="btn-primary py-2 px-4 text-sm">&#11015;&#65039; Импорт</Link>
        </div>
      </div>

      <div className="card p-4 mb-4 flex flex-wrap gap-3">
        <div className="flex gap-2 flex-1 min-w-[200px]">
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && reload(1, q, status)}
            placeholder="Поиск по названию..." className="gp-input py-2 text-sm flex-1" />
          <button onClick={() => reload(1, q, status)} className="btn-primary py-2 px-4 text-sm">Найти</button>
        </div>
        <div className="flex gap-1">
          {[["all","Все"],["active","Активные"],["hidden","Скрытые"]].map(([v,l]) => (
            <button key={v} onClick={() => { setStatus(v); reload(1, q, v) }}
              className={"px-3 py-2 rounded-lg text-xs border transition-colors " + (status === v ? "bg-brand border-brand text-white" : "border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text)]")}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {selected.size > 0 && (
        <div className="card p-3 mb-3 flex items-center gap-3 border-brand/20">
          <span className="text-[var(--text-3)] text-sm">Выбрано: <span className="text-[var(--text)] font-semibold">{selected.size}</span></span>
          <div className="flex gap-2 ml-auto">
            <button onClick={() => bulkAction("activate")} disabled={bulkLoading} className="px-3 py-1.5 rounded bg-emerald-500/20 text-emerald-400 text-xs hover:bg-emerald-500/30 disabled:opacity-50">Активировать</button>
            <button onClick={() => bulkAction("deactivate")} disabled={bulkLoading} className="px-3 py-1.5 rounded bg-yellow-500/20 text-yellow-400 text-xs hover:bg-yellow-500/30 disabled:opacity-50">Скрыть</button>
            <button onClick={() => bulkAction("delete")} disabled={bulkLoading} className="px-3 py-1.5 rounded bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30 disabled:opacity-50">Удалить</button>
          </div>
          {bulkMsg && <span className="text-[var(--text-3)] text-xs">{bulkMsg}</span>}
        </div>
      )}

      <div className={"card overflow-hidden transition-opacity " + (loading ? "opacity-50" : "")}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--text-3)] text-xs">
              <th className="px-4 py-3 w-8">
                <input type="checkbox" checked={selected.size === products.length && products.length > 0} onChange={toggleAll} className="rounded" />
              </th>
              <th className="text-left px-4 py-3">Товар</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Категория</th>
              <th className="text-right px-4 py-3">Цена</th>
              <th className="text-center px-4 py-3">Статус</th>
              <th className="text-right px-4 py-3 hidden lg:table-cell">ID</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} className={"border-b border-[var(--border)] last:border-0 hover:bg-white/2 " + (selected.has(p.id) ? "bg-brand/5" : "")}>
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} className="rounded" />
                </td>
                <td className="px-4 py-3">
                  <Link href={"/product/" + p.slug} target="_blank" className="text-[var(--text)] hover:text-brand transition-colors line-clamp-1">
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-[var(--text-3)]">{p.category?.name ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  {editingPrice === p.id ? (
                    <div className="flex items-center gap-1 justify-end">
                      <input autoFocus value={editPriceVal} onChange={e => setEditPriceVal(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") savePrice(p.id); if (e.key === "Escape") setEditingPrice(null) }}
                        className="w-20 text-right gp-input py-0.5 text-sm" />
                      <button onClick={() => savePrice(p.id)} className="text-emerald-400 px-1">&#10003;</button>
                      <button onClick={() => setEditingPrice(null)} className="text-gray-500 px-1">&#10005;</button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingPrice(p.id); setEditPriceVal(String(p.price)) }}
                      className="text-[var(--text)] font-medium hover:text-brand transition-colors cursor-pointer" title="Кликните для редактирования">
                      {p.price.toLocaleString("ru-RU")} &#8381;
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={"badge " + (p.isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400")}>
                    {p.isActive ? "Активен" : "Скрыт"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-[var(--text-3)] text-xs hidden lg:table-cell">{p.digisellerProductId}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && !loading && <div className="text-center py-16 text-[var(--text-3)]">Товары не найдены</div>}
      </div>

      {pages > 1 && (
        <div className="flex gap-1 mt-4 justify-center">
          {page > 1 && <button onClick={() => { setPage(p => p - 1); reload(page - 1) }} className="px-3 py-1.5 rounded border border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text)] text-sm">&#8592;</button>}
          <span className="px-3 py-1.5 text-[var(--text-3)] text-sm">Стр. {page} из {pages}</span>
          {page < pages && <button onClick={() => { setPage(p => p + 1); reload(page + 1) }} className="px-3 py-1.5 rounded border border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text)] text-sm">&#8594;</button>}
        </div>
      )}
    </div>
  )
}