"use client"
import { Suspense, useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const params = useSearchParams()
  const callbackUrl = params.get("callbackUrl") ?? "/"
  const registered = params.get("registered") === "1"
  const verified = params.get("verified") === "1"
  const reset = params.get("reset") === "1"
  const invalidToken = params.get("error") === "invalid_token"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const res = await signIn("credentials", { email: email.trim(), password, redirect: false })
    setLoading(false)
    if (res?.error) {
      setError("Неверный email или пароль")
    } else {
      router.push(callbackUrl)
      router.refresh()
    }
  }

  return (
    <div className="card p-8">
      {registered && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-400 text-sm mb-4">
          Аккаунт создан! Войдите в систему. Проверьте почту для подтверждения email.
        </div>
      )}
      {verified && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-400 text-sm mb-4">
          Email подтверждён! Теперь вы можете войти.
        </div>
      )}
      {reset && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-400 text-sm mb-4">
          Пароль успешно изменён. Войдите с новым паролем.
        </div>
      )}
      {invalidToken && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm mb-4">
          Ссылка недействительна или устарела.{" "}
          <Link href="/auth/forgot-password" className="underline">Запросить новую</Link>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm text-gray-400 mb-1.5 block">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com" required autoComplete="email" className="gp-input" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm text-gray-400">Пароль</label>
            <Link href="/auth/forgot-password"
              className="text-xs text-gray-500 hover:text-brand transition-colors">
              Забыли пароль?
            </Link>
          </div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" required autoComplete="current-password" className="gp-input" />
        </div>
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}
        <button type="submit" disabled={loading}
          className="btn-primary w-full py-3 text-base mt-2 disabled:opacity-60 disabled:cursor-not-allowed">
          {loading ? "Входим..." : "Войти"}
        </button>
      </form>
      <div className="border-t border-[#1f2937] mt-6 pt-6">
        <p className="text-center text-gray-500 text-sm">
          Нет аккаунта?{" "}
          <Link href="/auth/register" className="text-brand hover:text-brand-400 font-medium transition-colors">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
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
          <h1 className="text-2xl font-bold text-white">Вход в аккаунт</h1>
          <p className="text-gray-500 text-sm mt-1">Введите email и пароль для входа</p>
        </div>
        <Suspense fallback={<div className="card p-8 h-64 animate-pulse" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
