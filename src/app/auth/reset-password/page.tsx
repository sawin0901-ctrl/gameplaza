"use client"
import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"

function ResetForm() {
  const params = useSearchParams()
  const token = params.get("token") ?? ""
  const router = useRouter()

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  if (!token) {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <p className="text-gray-400 text-sm mb-4">Ссылка недействительна или устарела.</p>
        <Link href="/auth/forgot-password" className="btn-primary px-6 py-2 text-sm inline-block">
          Запросить новую ссылку
        </Link>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (password !== confirm) { setError("Пароли не совпадают"); return }
    if (password.length < 6) { setError("Пароль — минимум 6 символов"); return }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Ошибка"); return }
      router.push("/auth/login?reset=1")
    } catch {
      setError("Ошибка сети")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm text-gray-400 mb-1.5 block">Новый пароль</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Минимум 6 символов" required autoComplete="new-password"
            className="gp-input" />
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-1.5 block">Повторите пароль</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
            placeholder="Повторите пароль" required autoComplete="new-password"
            className="gp-input" />
        </div>
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}
        <button type="submit" disabled={loading}
          className="btn-primary w-full py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed">
          {loading ? "Сохраняем..." : "Сохранить новый пароль"}
        </button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
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
          <h1 className="text-2xl font-bold text-white">Новый пароль</h1>
          <p className="text-gray-500 text-sm mt-1">Придумайте надёжный пароль для аккаунта</p>
        </div>
        <Suspense fallback={<div className="card p-8 h-64 animate-pulse" />}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  )
}
