"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (password !== confirm) {
      setError("Пароли не совпадают")
      return
    }
    if (password.length < 6) {
      setError("Пароль — минимум 6 символов")
      return
    }

    setLoading(true)
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? "Ошибка регистрации")
      return
    }

    router.push("/auth/login?registered=1")
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center font-bold text-white">G</div>
            <span className="font-bold text-xl">
              <span className="text-brand">Game</span><span className="text-[var(--text)]">Plaza</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-[var(--text)]">Создать аккаунт</h1>
          <p className="text-[var(--text-3)] text-sm mt-1">Зарегистрируйтесь бесплатно</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-[var(--text-2)] mb-1.5 block">Имя</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ваше имя"
                required
                autoComplete="name"
                className="gp-input"
              />
            </div>
            <div>
              <label className="text-sm text-[var(--text-2)] mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="gp-input"
              />
            </div>
            <div>
              <label className="text-sm text-[var(--text-2)] mb-1.5 block">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                required
                autoComplete="new-password"
                className="gp-input"
              />
            </div>
            <div>
              <label className="text-sm text-[var(--text-2)] mb-1.5 block">Повторите пароль</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                className="gp-input"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Создаём аккаунт..." : "Зарегистрироваться"}
            </button>
          </form>

          <div className="border-t border-[var(--border)] mt-6 pt-6">
            <p className="text-center text-gray-500 text-sm">
              Уже есть аккаунт?{" "}
              <Link href="/auth/login" className="text-brand hover:text-brand-400 font-medium transition-colors">
                Войти
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-gray-700 text-xs mt-6">
          Регистрируясь, вы соглашаетесь с{" "}
          <Link href="/terms" className="hover:text-gray-500 underline">условиями использования</Link>
        </p>
      </div>
    </div>
  )
}
