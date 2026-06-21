"use client"
import { useEffect, useState } from "react"

interface Category { id: string; name: string; slug: string; metaTitle?: string; metaDesc?: string }
interface SEOData { global: Record<string, string>; categories: Category[] }

const GLOBAL_FIELDS = [
  { key: "site_title", label: "Заголовок сайта" },
  { key: "site_description", label: "Описание сайта" },
  { key: "og_image", label: "OG-изображение (URL)" },
  { key: "robots", label: "Robots.txt (noindex/nofollow)" },
]

export default function SEOPage() {
  const [data, setData] = useState<SEOData | null>(null)
  const [global, setGlobal] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState("")

  async function load() {
    const r = await fetch("/api/admin/seo")
    const d = await r.json()
    setData(d); setGlobal(d.global ?? {})
  }
  async function saveGlobal(key: string) {
    await fetch("/api/admin/seo", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "global", key, value: global[key] ?? "" }) })
    setMsg(`Сохранено: ${key}`)
    setTimeout(() => setMsg(""), 2000)
  }
  async function saveCat(cat: Category) {
    await fetch("/api/admin/seo", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "category", categoryId: cat.id, metaTitle: cat.metaTitle, metaDesc: cat.metaDesc }) })
    setMsg(`Сохранено: ${cat.name}`)
    setTimeout(() => setMsg(""), 2000)
  }
  function updateCat(id: string, field: "metaTitle" | "metaDesc", value: string) {
    if (!data) return
    setData(prev => prev ? { ...prev, categories: prev.categories.map(c => c.id === id ? { ...c, [field]: value } : c) } : prev)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-[var(--text)] mb-6">SEO-настройки</h1>
      {msg && <div className="mb-4 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm">{msg}</div>}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-6">
        <p className="font-medium text-[var(--text)] mb-4">Глобальные настройки</p>
        <div className="space-y-3">
          {GLOBAL_FIELDS.map(f => (
            <div key={f.key}>
              <label className="text-xs text-[var(--text-3)] mb-1 block">{f.label}</label>
              <div className="flex gap-2">
                <input
                  value={global[f.key] ?? ""}
                  onChange={e => setGlobal(g => ({ ...g, [f.key]: e.target.value }))}
                  className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)]"
                />
                <button onClick={() => saveGlobal(f.key)} className="px-3 py-2 bg-brand text-white rounded-lg text-sm">✓</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {data?.categories && data.categories.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <p className="font-medium text-[var(--text)] mb-4">SEO по категориям</p>
          <div className="space-y-4">
            {data.categories.map(cat => (
              <div key={cat.id} className="border border-[var(--border)] rounded-lg p-3">
                <p className="text-sm font-medium text-[var(--text)] mb-2">{cat.name} <span className="text-[var(--text-3)] font-normal">/{cat.slug}</span></p>
                <div className="grid gap-2">
                  <input
                    value={cat.metaTitle ?? ""}
                    onChange={e => updateCat(cat.id, "metaTitle", e.target.value)}
                    placeholder="Meta Title"
                    className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)]"
                  />
                  <div className="flex gap-2">
                    <input
                      value={cat.metaDesc ?? ""}
                      onChange={e => updateCat(cat.id, "metaDesc", e.target.value)}
                      placeholder="Meta Description"
                      className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)]"
                    />
                    <button onClick={() => saveCat(cat)} className="px-3 py-2 bg-brand text-white rounded-lg text-sm">✓</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
