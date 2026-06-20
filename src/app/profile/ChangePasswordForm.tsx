"use client"
import { useState } from "react"

export default function ChangePasswordForm() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (form.newPassword !== form.confirm) {
      setError("Пароли не совпадают")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setSuccess(true)
      setForm({ currentPassword: "", newPassword: "", confirm: "" })
      setTimeout(() => { setSuccess(false); setOpen(false) }, 2000)
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full py-3 rounded-xl border border-[#1f2937] text-gray-400 hover:text-white hover:border-gray-600 transition-colors text-sm">
        Изменить пароль
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-3">
      <h3 className="text-white font-medium text-sm">Изменение пароля</h3>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      {success && <p className="text-emerald-400 text-xs">Пароль успешно изменён</p>}
      <input
        type="password" placeholder="Текущий пароль" value={form.currentPassword}
        onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
        className="gp-input text-sm w-full" required
      />
      <input
        type="password" placeholder="Новый пароль" value={form.newPassword}
        onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
        className="gp-input text-sm w-full" required
      />
      <input
        type="password" placeholder="Повторите новый пароль" value={form.confirm}
        onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
        className="gp-input text-sm w-full" required
      />
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={loading} className="btn-primary text-sm px-4 py-2 flex-1 disabled:opacity-50">
          {loading ? "Сохраняю..." : "Сохранить"}
        </button>
        <button type="button" onClick={() => { setOpen(false); setError("") }} className="btn-ghost text-sm px-4 py-2">
          Отмена
        </button>
      </div>
    </form>
  )
}
