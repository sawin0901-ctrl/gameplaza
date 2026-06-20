"use client"
import { useState } from "react"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Ошибка"); return }
      setSent(true)
    } catch {
      setError("Ошибка сети")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center font-bold text-white">G</div>
            <span className="font-bold text-xl">
              <span className="text-brand">Game</span><span className="text-white">Plaza</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Забыли пароль?</h1>
          <p className="text-gray-500 text-sm mt-1">Введите email — отправим ссылку для сброса</p>
        </div>

        <div className="card p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">📧</div>
              <h2 className="text-white font-semibold mb-2">Письмо отправлено</h2>
              <p className="text-gray-500 text-sm mb-6">
                Если аккаунт с таким email существует, вы получите письмо со ссылкой для сброса пароля.
                Ссылка действительна 1 час.
              </p>
              <Link href="/auth/login" className="text-brand hover:text-brand-400 text-sm font-medium transition-colors">
                Вернуться ко входу
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">Email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required autoComplete="email"
                  className="gp-input"
                />
              </div>
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading}
                className="btn-primary w-full py-3 text-base mt-2 disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? "Отправляем..." : "Отправить ссылку"}
              </button>
              <div className="text-center">
                <Link href="/auth/login" className="text-gray-500 hover:text-white text-sm transition-colors">
                  Вернуться ко входу
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
