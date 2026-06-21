"use client"
import { useEffect, useState } from "react"

interface Flag { key: string; enabled: boolean; updatedAt: string }

const PRESETS = [
  { key: "maintenance_mode", label: "Режим обслуживания", description: "Скрыть сайт для пользователей" },
  { key: "show_banners", label: "Показывать баннеры", description: "Слайдер на главной странице" },
  { key: "reviews_enabled", label: "Отзывы включены", description: "Пользователи могут оставлять отзывы" },
  { key: "promo_codes_enabled", label: "Промокоды активны", description: "Применение промокодов при оплате" },
  { key: "referral_program", label: "Реферальная программа", description: "Начисление бонусов за приглашения" },
  { key: "flash_sales_enabled", label: "Flash-распродажи", description: "Показывать счётчик на товарах со скидкой" },
]

export default function FeaturesPage() {
  const [flags, setFlags] = useState<Flag[]>([])
  const [newKey, setNewKey] = useState("")
  const [msg, setMsg] = useState("")

  async function load() { const r = await fetch("/api/admin/features"); const d = await r.json(); setFlags(d.flags ?? []) }
  async function toggle(key: string, current: boolean) {
    await fetch("/api/admin/features", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, enabled: !current }) })
    await load()
  }
  async function create() {
    if (!newKey.trim()) return setMsg("Введите ключ")
    await fetch("/api/admin/features", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: newKey.trim(), enabled: false }) })
    setNewKey(""); setMsg(""); await load()
  }
  async function remove(key: string) {
    await fetch(`/api/admin/features?key=${encodeURIComponent(key)}`, { method: "DELETE" }); await load()
  }

  function getFlagValue(key: string) { return flags.find(f => f.key === key)?.enabled ?? false }

  useEffect(() => { load() }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[var(--text)] mb-2">Feature Flags / A-B тесты</h1>
      <p className="text-[var(--text-3)] text-sm mb-6">Управляйте функциями сайта без деплоя</p>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-[var(--border)]"><p className="font-medium text-[var(--text)]">Предустановленные флаги</p></div>
        {PRESETS.map(p => {
          const enabled = getFlagValue(p.key)
          return (
            <div key={p.key} className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] last:border-0">
              <div>
                <p className="text-[var(--text)] text-sm font-medium">{p.label}</p>
                <p className="text-[var(--text-3)] text-xs">{p.description}</p>
                <p className="text-[var(--text-3)] text-xs font-mono mt-0.5">{p.key}</p>
              </div>
              <button onClick={() => toggle(p.key, enabled)}
                className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? "bg-brand" : "bg-[var(--border)]"}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-5" : ""}`} />
              </button>
            </div>
          )
        })}
      </div>
      {flags.filter(f => !PRESETS.some(p => p.key === f.key)).length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-[var(--border)]"><p className="font-medium text-[var(--text)]">Пользовательские флаги</p></div>
          {flags.filter(f => !PRESETS.some(p => p.key === f.key)).map(f => (
            <div key={f.key} className="flex items-center gap-4 px-4 py-3 border-b border-[var(--border)] last:border-0">
              <p className="font-mono text-sm text-[var(--text)] flex-1">{f.key}</p>
              <button onClick={() => toggle(f.key, f.enabled)} className={`relative w-11 h-6 rounded-full transition-colors ${f.enabled ? "bg-brand" : "bg-[var(--border)]"}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${f.enabled ? "translate-x-5" : ""}`} />
              </button>
              <button onClick={() => remove(f.key)} className="text-red-400 px-2">✕</button>
            </div>
          ))}
        </div>
      )}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
        <p className="font-medium text-[var(--text)] mb-3">Добавить флаг</p>
        <div className="flex gap-2">
          <input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="my_feature_key" className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] font-mono" />
          <button onClick={create} className="px-4 py-2 bg-brand text-white rounded-lg text-sm">Добавить</button>
        </div>
        {msg && <p className="text-sm mt-2 text-[var(--text-2)]">{msg}</p>}
      </div>
    </div>
  )
}
