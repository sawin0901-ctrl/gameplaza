type Entry = { count: number; resetAt: number }
const store = new Map<string, Entry>()

const cleanup = setInterval(() => {
  const now = Date.now()
  store.forEach((entry, key) => {
    if (now > entry.resetAt) store.delete(key)
  })
}, 10 * 60 * 1000)

if (typeof cleanup.unref === "function") cleanup.unref()

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= max) return false
  entry.count++
  return true
}

export function rateLimitRemaining(key: string, max: number): number {
  const entry = store.get(key)
  if (!entry || Date.now() > entry.resetAt) return max
  return Math.max(0, max - entry.count)
}
