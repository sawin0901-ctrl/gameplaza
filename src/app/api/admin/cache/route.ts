import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { logAdmin } from "../../../../lib/admin-log"

export const dynamic = "force-dynamic"

async function getRedis() {
  const { default: Redis } = await import("ioredis")
  const url = process.env.REDIS_URL ?? "redis://localhost:6379"
  return new Redis(url, { lazyConnect: true, connectTimeout: 5000, maxRetriesPerRequest: 1 })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const client = await getRedis()
    await client.connect()
    const info = await client.info("memory")
    const keys = await client.dbsize()
    client.disconnect()
    const memMatch = info.match(/used_memory_human:(\S+)/)
    return NextResponse.json({ ok: true, keys, memory: memMatch?.[1] ?? "?" })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  let pattern = "*"
  try { const b = await req.json(); pattern = b.pattern ?? "*" } catch {}
  try {
    const client = await getRedis()
    await client.connect()
    const keys = await client.keys(pattern)
    if (keys.length > 0) await client.del(...keys)
    client.disconnect()
    await logAdmin("cache.flush", "redis", undefined, { pattern, deleted: keys.length })
    return NextResponse.json({ ok: true, deleted: keys.length, pattern })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}