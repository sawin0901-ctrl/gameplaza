import Redis from "ioredis"

let _redis: Redis | null = null

function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null
  if (!_redis) {
    _redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: false,
    })
    _redis.on("error", () => {})
  }
  return _redis
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const val = await getRedis()?.get(key)
    return val ? (JSON.parse(val) as T) : null
  } catch {
    return null
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  try {
    await getRedis()?.setex(key, ttlSeconds, JSON.stringify(value))
  } catch {}
}

export async function cacheDel(...keys: string[]): Promise<void> {
  try {
    if (keys.length) await getRedis()?.del(...keys)
  } catch {}
}
