"use client"
import { useEffect, useState } from "react"
import Image from "next/image"

interface ProductStat { productId?: string; name: string; sales: number; revenue: number; slug?: string; imageUrl?: string; rating?: number; soldCount?: number }

export default function ProductAnalyticsPage() {
  const [products, setProducts] = useState<ProductStat[]>([])
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(false)

  async function load(d = days) {
    setLoading(true)
    const r = await fetch(`/api/admin/analytics/products?days=${d}`)
    const data = await r.json()
    setProducts(data.products ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const totalRevenue = products.reduce((s, p) => s + p.revenue, 0)
  const totalSales = products.reduce((s, p) => s + p.sales, 0)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--text)]">Аналитика по товарам</h1>
        <div className="flex gap-2">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => { setDays(d); load(d) }} className={`px-3 py-1.5 rounded-lg text-sm ${days === d ? "bg-brand text-white" : "border border-[var(--border)] text-[var(--text-2)]"}`}>
              {d} дней
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-brand">{totalSales}</p>
          <p className="text-[var(--text-3)] text-sm mt-1">Продаж за {days} дней</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-400">{totalRevenue.toLocaleString("ru")} ₽</p>
          <p className="text-[var(--text-3)] text-sm mt-1">Выручка за {days} дней</p>
        </div>
      </div>
      {loading ? (
        <p className="text-center text-[var(--text-3)] py-12">Загрузка...</p>
      ) : (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-4 py-2 border-b border-[var(--border)] text-xs font-medium text-[var(--text-3)] uppercase">
            <span>#</span><span>Товар</span><span>Продажи</span><span>Выручка</span><span>Рейтинг</span>
          </div>
          {products.map((p, i) => (
            <div key={p.productId ?? i} className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-4 py-3 border-b border-[var(--border)] last:border-0 items-center">
              <span className="text-[var(--text-3)] text-sm font-bold w-6">{i + 1}</span>
              <div className="flex items-center gap-3 min-w-0">
                {p.imageUrl && (
                  <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-[var(--bg-secondary)]">
                    <Image src={p.imageUrl} alt={p.name} width={32} height={32} className="w-full h-full object-cover" />
                  </div>
                )}
                <span className="text-sm text-[var(--text)] truncate">{p.name}</span>
              </div>
              <span className="text-sm font-semibold text-[var(--text)]">{p.sales}</span>
              <span className="text-sm font-semibold text-green-400">{p.revenue.toLocaleString("ru")} ₽</span>
              <span className="text-sm text-yellow-400">{p.rating ? `★ ${p.rating.toFixed(1)}` : "—"}</span>
            </div>
          ))}
          {products.length === 0 && <p className="p-8 text-center text-[var(--text-3)]">Нет данных за выбранный период</p>}
        </div>
      )}
    </div>
  )
}
