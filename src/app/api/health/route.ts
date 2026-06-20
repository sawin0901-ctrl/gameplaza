import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  const [db, redis] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    (async () => {
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
    })(),
  ])

  const status = db && redis ? "ok" : db ? "degraded" : "error"
  return NextResponse.json(
    { status, services: { db, redis }, ts: new Date().toISOString() },
    { status: db ? 200 : 503 },
  )
}
