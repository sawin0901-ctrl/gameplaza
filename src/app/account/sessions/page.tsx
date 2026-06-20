"use client"
import { useState, useEffect } from "react"
import Link from "next/link"

interface LoginEntry {
  id: string
  ip: string | null
  userAgent: string | null
  city: string | null
  country: string | null
  success: boolean
  createdAt: string
}

function parseDevice(ua: string | null): string {
  if (!ua) return "Неизвестно"
  if (/iPhone|iPad/i.test(ua)) return "iPhone / iPad"
  if (/Android/i.test(ua)) return "Android"
  if (/Windows/i.test(ua)) return "Windows"
  if (/Mac OS/i.test(ua)) return "macOS"
  if (/Linux/i.test(ua)) return "Linux"
  return "Другое"
}

function parseBrowser(ua: string | null): string {
  if (!ua) return ""
  if (/Edg\//i.test(ua)) return "Edge"
  if (/Chrome/i.test(ua)) return "Chrome"
  if (/Firefox/i.test(ua)) return "Firefox"
  if (/Safari/i.test(ua)) return "Safari"
  if (/Opera/i.test(ua)) return "Opera"
  return ""
}

export default function AccountSessionsPage() {
  const [history, setHistory] = useState<LoginEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/account/login-history")
      .then(r => r.json())
      .then(d => setHistory(d.history ?? []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-[var(--text-3)] hover:text-[var(--text)] text-sm">← Главная</Link>
        <span className="text-[var(--border)]">/</span>
        <span className="text-[var(--text)] text-sm">История входов</span>
      </div>

      <h1 className="text-2xl font-bold text-[var(--text)] mb-2">История входов</h1>
      <p className="text-[var(--text-3)] text-sm mb-6">Последние 50 входов в ваш аккаунт</p>

      {loading ? (
        <div className="card p-8 text-center text-gray-600">Загрузка...</div>
      ) : history.length === 0 ? (
        <div className="card p-8 text-center text-gray-600">История входов пуста</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-gray-500 text-xs">
                <th className="text-left px-4 py-3">Дата и время</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Устройство</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">IP</th>
                <th className="text-center px-4 py-3">Статус</th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(h.createdAt).toLocaleString("ru-RU", {
                      day: "numeric", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="text-white text-xs">{parseDevice(h.userAgent)}</div>
                    <div className="text-gray-600 text-xs">{parseBrowser(h.userAgent)}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-500 text-xs font-mono">
                    {h.ip ?? "—"}
                    {(h.city || h.country) && (
                      <div className="text-gray-600 font-sans">{[h.city, h.country].filter(Boolean).join(", ")}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`badge text-xs ${h.success ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                      {h.success ? "Успешно" : "Неудача"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {history.some(h => !h.success) && (
        <div className="card p-4 mt-4 bg-yellow-500/5 border border-yellow-500/20">
          <p className="text-yellow-400 text-sm">
            ⚠️ Обнаружены неудачные попытки входа. Если это не вы — немедленно смените пароль.
          </p>
        </div>
      )}
    </div>
  )
}
