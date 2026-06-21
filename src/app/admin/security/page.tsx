"use client"
import { useState, useEffect, useCallback } from "react"

type Check = Record<string, boolean>
type SuspiciousIp = { ip: string; count: number }
type AdminLogin = { email: string; ip: string | null; userAgent: string | null; createdAt: string }
type CspViolation = { message: string; count: number; lastSeen: string; hasNew: boolean }
type Data = {
  failedTotal: number; failedToday: number; cspViolations: number
  cspViolationsList: CspViolation[]
  suspiciousIps: SuspiciousIp[]; recentAdminLogins: AdminLogin[]; checks: Check
}

const CHECK_LABELS: Record<string, string> = {
  rateLimit: "Rate Limiting (вход, регистрация, поиск)",
  bcrypt: "Bcrypt хеширование паролей (rounds=12)",
  hsts: "HSTS (Strict-Transport-Security)",
  csp: "Content-Security-Policy",
  xFrameOptions: "X-Frame-Options: DENY",
  loginHistory: "Журнал входов (IP + User-Agent)",
  adminMiddleware: "Защита /admin middleware (JWT + role)",
  passwordHashing: "Пароли только в хешированном виде",
  inputValidation: "Валидация входных данных (Zod)",
}

function Badge({ ok }: { ok: boolean }) {
  return (
    <span className={"text-xs px-2 py-0.5 rounded-full font-medium " + (ok ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400")}>
      {ok ? "✓ OK" : "✗ РИСК"}
    </span>
  )
}

export default function SecurityPage() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissing, setDismissing] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetch("/api/admin/security").then(r => r.json()).then(setData).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function dismissAllCsp() {
    setDismissing(true)
    await fetch("/api/admin/security", { method: "DELETE" })
    await load()
    setDismissing(false)
  }

  if (loading) return <div className="p-6 text-[var(--text-3)]">Загрузка...</div>
  if (!data)   return <div className="p-6 text-red-400">Ошибка загрузки</div>

  const riskScore = data.failedToday > 20 ? "high" : data.failedToday > 5 ? "medium" : "low"
  const newCsp = data.cspViolationsList.filter(v => v.hasNew).length

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-[var(--text)]">Безопасность</h1>
        <span className={"px-3 py-1 rounded-full text-sm font-semibold " + (riskScore === "high" ? "bg-red-500/20 text-red-400" : riskScore === "medium" ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400")}>
          {riskScore === "high" ? "⚠ Высокий риск" : riskScore === "medium" ? "⚡ Средний риск" : "✓ Норма"}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Неудачных входов за 24ч", value: data.failedToday, warn: data.failedToday > 10 },
          { label: "Неудачных входов за 7д",  value: data.failedTotal, warn: data.failedTotal > 50 },
          { label: "Подозрительных IP",        value: data.suspiciousIps.length, warn: data.suspiciousIps.length > 0 },
          { label: "CSP нарушений за 7д",      value: data.cspViolations, warn: data.cspViolations > 0 },
        ].map(s => (
          <div key={s.label} className={"card p-4 " + (s.warn && s.value > 0 ? "border-yellow-500/30" : "")}>
            <p className={"text-2xl font-bold " + (s.warn && s.value > 0 ? "text-yellow-400" : "text-[var(--text)]")}>{s.value}</p>
            <p className="text-xs text-[var(--text-3)] mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* CSP Violations */}
      {data.cspViolationsList.length > 0 && (
        <div className="card p-5 mb-6 border-yellow-500/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-[var(--text)]">CSP нарушения</h2>
              {newCsp > 0 && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">{newCsp} новых</span>}
            </div>
            {newCsp > 0 && (
              <button
                onClick={dismissAllCsp}
                disabled={dismissing}
                className="text-xs px-3 py-1.5 rounded bg-[var(--bg-3)] hover:bg-[var(--bg-2)] text-[var(--text-2)] disabled:opacity-50 transition-colors"
              >
                {dismissing ? "Сбрасываем..." : "Отметить все решёнными"}
              </button>
            )}
          </div>
          <div className="space-y-1">
            {data.cspViolationsList.map((v, i) => (
              <div key={i} className={"flex items-start justify-between gap-4 py-2 border-b border-[var(--border)] last:border-0 " + (v.hasNew ? "opacity-100" : "opacity-50")}>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-mono text-[var(--text-2)] break-all">{v.message}</p>
                  <p className="text-xs text-[var(--text-3)] mt-0.5">{new Date(v.lastSeen).toLocaleString("ru")}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-[var(--text-3)]">{v.count}x</span>
                  {v.hasNew && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">новая</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security checklist */}
      <div className="card p-5 mb-6">
        <h2 className="font-semibold text-[var(--text)] mb-4">Защитные механизмы</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {Object.entries(data.checks).map(([key, ok]) => (
            <div key={key} className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0">
              <span className="text-sm text-[var(--text-2)]">{CHECK_LABELS[key] ?? key}</span>
              <Badge ok={ok} />
            </div>
          ))}
        </div>
      </div>

      {/* Suspicious IPs */}
      {data.suspiciousIps.length > 0 && (
        <div className="card p-5 mb-6">
          <h2 className="font-semibold text-[var(--text)] mb-4">⚠ Подозрительные IP (3+ неудачных за 7д)</h2>
          <div className="space-y-2">
            {data.suspiciousIps.map(ip => (
              <div key={ip.ip} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <code className="text-sm text-yellow-400 font-mono">{ip.ip}</code>
                <span className="text-sm text-[var(--text-2)]">{ip.count} попыток</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent admin logins */}
      <div className="card p-5 mb-6">
        <h2 className="font-semibold text-[var(--text)] mb-4">Последние входы администраторов</h2>
        {data.recentAdminLogins.length === 0
          ? <p className="text-[var(--text-3)] text-sm">Нет данных</p>
          : <div className="space-y-2">
              {data.recentAdminLogins.map((l, i) => (
                <div key={i} className="text-sm border-b border-[var(--border)] last:border-0 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text)] font-medium">{l.email}</span>
                    <span className="text-xs text-[var(--text-3)]">{new Date(l.createdAt).toLocaleString("ru")}</span>
                  </div>
                  <div className="text-[var(--text-3)] text-xs mt-0.5">
                    IP: {l.ip ?? "—"} · {l.userAgent?.slice(0, 60) ?? "—"}
                  </div>
                </div>
              ))}
            </div>
        }
      </div>

      {/* Recommendations */}
      <div className="card p-5 border-blue-500/20">
        <h2 className="font-semibold text-[var(--text)] mb-4">Рекомендации по серверу</h2>
        <div className="space-y-2 text-sm text-[var(--text-2)]">
          <p>• Убедитесь что Nginx блокирует <code className="text-yellow-400">/.git</code>, <code className="text-yellow-400">/.env</code>, <code className="text-yellow-400">/.bak</code></p>
          <p>• Rate limiter сбрасывается при рестарте PM2 — для production рекомендуется Redis-backed rate limit</p>
          <p>• CSP содержит <code className="text-yellow-400">unsafe-eval</code> — необходим для Digiseller виджета оплаты</p>
          <p>• SSL: проверьте через ssllabs.com/ssltest/ — должно быть A или A+</p>
          <p>• Порты: убедитесь что 5432 (PostgreSQL) и 6379 (Redis) не открыты наружу</p>
        </div>
      </div>
    </div>
  )
}