import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { logAdmin } from "../../../../lib/admin-log"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  let pattern = "*"
  try { const b = await req.json(); pattern = b.pattern ?? "*" } catch {}
  try {
    const { createClient } = await import("redis")
    const url = process.env.REDIS_URL ?? "redis://localhost:6379"
    const c = createClient({ url })
    await c.connect()
    const keys = await c.keys(pattern)
    if (keys.length > 0) await c.del(keys)
    await c.disconnect()
    await logAdmin("cache.flush", "redis", undefined, { pattern, deleted: keys.length })
    return NextResponse.json({ ok: true, deleted: keys.length, pattern })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const { createClient } = await import("redis")
    const url = process.env.REDIS_URL ?? "redis://localhost:6379"
    const c = createClient({ url })
    await c.connect()
    const info = await c.info("memory")
    const keys = await c.dbSize()
    await c.disconnect()
    const memMatch = info.match(/used_memory_human:(\S+)/)
    return NextResponse.json({ ok: true, keys, memory: memMatch?.[1] ?? "?" })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}