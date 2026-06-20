import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET
  const hasSecret = secret && req.headers.get("x-admin-secret") === secret

  const dbOk = await prisma.$queryRaw`SELECT 1`
    .then(() => true)
    .catch(() => false)

  const status = dbOk ? "ok" : "error"

  // Без секрета возвращаем только статус — без деталей инфраструктуры
  if (!hasSecret) {
    return NextResponse.json({ status }, { status: dbOk ? 200 : 503 })
  }

  // С секретом — полная диагностика для мониторинг-систем
  const redisOk = await (async () => {
    try {
      const { default: Redis } = await import("ioredis")
      const r = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        lazyConnect: true,
      })
      try {
        await r.connect()
        return (await r.ping()) === "PONG"
      } catch {
        return false
      } finally {
        r.disconnect()
      }
    } catch {
      return false
    }
  })()

  const fullStatus = dbOk && redisOk ? "ok" : dbOk ? "degraded" : "error"
  return NextResponse.json(
    { status: fullStatus, services: { db: dbOk, redis: redisOk }, ts: new Date().toISOString() },
    { status: dbOk ? 200 : 503 },
  )
}
