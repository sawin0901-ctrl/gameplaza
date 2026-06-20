"use client"
import { useState, useEffect, useCallback } from "react"

interface PromoCode {
  id: string
  code: string
  description: string | null
  type: "percent" | "fixed"
  value: number
  minOrderAmount: number | null
  maxUses: number | null
  usedCount: number
  expiresAt: string | null
  isActive: boolean
  createdAt: string
}

export default function AdminPromoPage() {
  const [promos, setPromos] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [form, setForm] = useState({
    code: "", description: "", type: "percent", value: "", minOrderAmount: "", maxUses: "", expiresAt: "",
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch("/api/admin/promo")
      const d = await r.json()
      setPromos(d.promos ?? [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null); setSuccess(null)
    try {
      const body = {
        code: form.code.toUpperCase(),
        description: form.description || undefined,
        type: form.type,
        value: parseFloat(form.value),
        minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : null,
        maxUses: form.maxUses ? parseInt(form.maxUses) : null,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      }
      const r = await fetch("/api/admin/promo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const d = await r.json()
      if (!r.ok) { setError(d.error?.fieldErrors ? Object.values(d.error.fieldErrors).flat().join(", ") : d.error); return }
      setSuccess("Промокод создан"); setShowForm(false)
      setForm({ code: "", description: "", type: "percent", value: "", minOrderAmount: "", maxUses: "", expiresAt: "" })
      load()
    } catch { setError("Ошибка запроса") }
    setSaving(false)
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch("/api/admin/promo", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, isActive: !current }) })
    load()
  }

  async function deletePromo(id: string) {
    if (!confirm("Удалить промокод?")) return
    await fetch(`/api/admin/promo?id=${id}`, { method: "DELETE" })
    load()
  }

  const fmt = (n: number) => n.toLocaleString("ru-RU")

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Промокоды</h1>
          <p className="text-gray-500 text-sm mt-1">Скидки и купоны для покупателей</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary py-2 px-4 text-sm">
          {showForm ? "✕ Отмена" : "+ Создать промокод"}
        </button>
      </div>

      {error && <div className="card p-3 mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
      {success && <div className="card p-3 mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">{success}</div>}

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="card p-5 mb-6">
          <h3 className="text-white font-semibold mb-4">Новый промокод</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-xs block mb-1">Код *</label>
              <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="SUMMER25" className="gp-input w-full py-2 font-mono uppercase" required maxLength={50} />
              <p className="text-gray-600 text-xs mt-1">Только буквы A-Z, цифры, _ и -</p>
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1">Описание</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Летняя акция 2025" className="gp-input w-full py-2" maxLength={200} />
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1">Тип скидки *</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="gp-input w-full py-2">
                <option value="percent">Процент (%)</option>
                <option value="fixed">Фиксированная сумма (₽)</option>
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1">Размер скидки *</label>
              <input value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                type="number" min="0.01" step="0.01" placeholder={form.type === "percent" ? "10" : "500"}
                className="gp-input w-full py-2" required />
              <p className="text-gray-600 text-xs mt-1">{form.type === "percent" ? "Процент от суммы заказа" : "Сумма в рублях"}</p>
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1">Мин. сумма заказа (₽)</label>
              <input value={form.minOrderAmount} onChange={e => setForm(f => ({ ...f, minOrderAmount: e.target.value }))}
                type="number" min="0" placeholder="1000" className="gp-input w-full py-2" />
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1">Макс. использований</label>
              <input value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
                type="number" min="1" placeholder="Без ограничений" className="gp-input w-full py-2" />
            </div>
            <div className="md:col-span-2">
              <label className="text-gray-400 text-xs block mb-1">Срок действия до</label>
              <input value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                type="datetime-local" className="gp-input w-full py-2" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={saving} className="btn-primary py-2 px-6 disabled:opacity-50">
              {saving ? "Создание..." : "Создать промокод"}
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-600">Загрузка...</div>
        ) : promos.length === 0 ? (
          <div className="p-8 text-center text-gray-600">Промокодов ещё нет</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1f2937] text-gray-500 text-xs">
                <th className="text-left px-4 py-3">Код</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Скидка</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Использований</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Истекает</th>
                <th className="text-center px-4 py-3">Статус</th>
                <th className="text-right px-4 py-3">Действия</th>
              </tr>
            </thead>
            <tbody>
              {promos.map(p => {
                const expired = p.expiresAt && new Date(p.expiresAt) < new Date()
                const exhausted = p.maxUses !== null && p.usedCount >= p.maxUses
                return (
                  <tr key={p.id} className="border-b border-[#1f2937] last:border-0 hover:bg-white/2">
                    <td className="px-4 py-3">
                      <div className="font-mono text-brand font-semibold">{p.code}</div>
                      {p.description && <div className="text-gray-600 text-xs mt-0.5">{p.description}</div>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-white">
                      {p.type === "percent" ? `${p.value}%` : `${fmt(p.value)} ₽`}
                      {p.minOrderAmount && <div className="text-gray-600 text-xs">от {fmt(p.minOrderAmount)} ₽</div>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-400">
                      {p.usedCount}{p.maxUses ? ` / ${p.maxUses}` : ""}
                      {exhausted && <span className="text-red-400 text-xs ml-1">(лимит)</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">
                      {p.expiresAt ? (
                        <span className={expired ? "text-red-400" : ""}>
                          {new Date(p.expiresAt).toLocaleDateString("ru-RU")}
                          {expired && " (истёк)"}
                        </span>
                      ) : "Бессрочный"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`badge ${p.isActive && !expired && !exhausted ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                        {p.isActive && !expired && !exhausted ? "Активен" : "Неактивен"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => toggleActive(p.id, p.isActive)}
                          className="px-2 py-1 text-xs rounded border border-[#1f2937] text-gray-400 hover:text-white">
                          {p.isActive ? "Откл." : "Вкл."}
                        </button>
                        <button onClick={() => deletePromo(p.id)}
                          className="px-2 py-1 text-xs rounded border border-red-500/20 text-red-400 hover:bg-red-500/10">
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
