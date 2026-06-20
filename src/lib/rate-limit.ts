type Entry = { count: number; resetAt: number }
const store = new Map<string, Entry>()

// Чистим устаревшие записи каждые 10 минут, чтобы не было утечки памяти
const cleanup = setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}, 10 * 60 * 1000)

// unref — не блокируем завершение процесса Node.js
if (typeof cleanup.unref === "function") cleanup.unref()

/**
 * Возвращает true, если запрос разрешён.
 * Возвращает false, если лимит превышен.
 */
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

/** Сколько попыток осталось до блокировки. */
export function rateLimitRemaining(key: string, max: number): number {
  const entry = store.get(key)
  if (!entry || Date.now() > entry.resetAt) return max
  return Math.max(0, max - entry.count)
}
