"use client"
import { useState, useEffect } from "react"
import Link from "next/link"

interface OrderItem { name: string; price: number; digiId: number; imageUrl: string | null }
interface Order {
  id: string; status: string; totalAmount: number; discount: number
  promoCode: string | null; createdAt: string; items: OrderItem[]
}

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  processing: "bg-blue-500/20 text-blue-400",
  completed: "bg-emerald-500/20 text-emerald-400",
  cancelled: "bg-red-500/20 text-red-400",
  refunded: "bg-gray-500/20 text-gray-400",
}
const STATUS_LABEL: Record<string, string> = {
  pending: "Ожидание оплаты", processing: "В обработке", completed: "Выполнен",
  cancelled: "Отменён", refunded: "Возврат",
}

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/orders")
      .then(r => r.json())
      .then(d => setOrders(d.orders ?? []))
      .finally(() => setLoading(false))
  }, [])

  const fmt = (n: number) => n.toLocaleString("ru-RU") + " ₽"

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center text-gray-600">Загрузка заказов...</div>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-gray-500 hover:text-white text-sm">← Главная</Link>
        <span className="text-gray-700">/</span>
        <span className="text-white text-sm">Мои заказы</span>
      </div>

      <h1 className="text-2xl font-bold text-white mb-6">Мои заказы</h1>

      {orders.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-4">🛒</div>
          <p className="text-gray-400 mb-4">У вас пока нет заказов</p>
          <Link href="/catalog" className="btn-primary py-2 px-6 text-sm">Перейти в каталог</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <div key={o.id} className="card overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/2 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-white font-mono text-sm font-semibold">
                      #{o.id.slice(-8).toUpperCase()}
                    </div>
                    <div className="text-gray-600 text-xs mt-0.5">
                      {new Date(o.createdAt).toLocaleDateString("ru-RU", {
                        day: "numeric", month: "long", year: "numeric"
                      })}
                    </div>
                  </div>
                  <span className={`badge text-xs ${STATUS_COLOR[o.status] ?? "bg-gray-500/20 text-gray-400"}`}>
                    {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-white font-semibold">{fmt(o.totalAmount)}</div>
                  {o.discount > 0 && <div className="text-emerald-400 text-xs">−{fmt(o.discount)}</div>}
                  <div className="text-gray-600 text-xs mt-0.5">{o.items.length} товар{o.items.length === 1 ? "" : o.items.length < 5 ? "а" : "ов"}</div>
                </div>
              </button>

              {expanded === o.id && (
                <div className="border-t border-[#1f2937] p-4 space-y-3">
                  {o.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      {item.imageUrl && (
                        <img src={item.imageUrl} alt="" className="w-10 h-10 rounded object-cover opacity-80" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm line-clamp-1">{item.name}</div>
                        <div className="text-gray-600 text-xs">ID: {item.digiId}</div>
                      </div>
                      <div className="text-white text-sm font-semibold shrink-0">{fmt(item.price)}</div>
                    </div>
                  ))}
                  {o.promoCode && (
                    <div className="flex items-center gap-2 pt-2 border-t border-[#1f2937]">
                      <span className="text-gray-500 text-xs">Промокод:</span>
                      <span className="text-brand text-xs font-mono font-semibold">{o.promoCode}</span>
                      <span className="text-emerald-400 text-xs">−{fmt(o.discount)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
