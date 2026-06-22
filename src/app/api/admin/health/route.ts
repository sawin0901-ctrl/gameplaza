import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"
import axios from "axios"

export const dynamic = "force-dynamic"

async function checkDB() {
  const t = Date.now()
  try { await prisma.$queryRaw`SELECT 1`; return { ok: true, ms: Date.now() - t } }
  catch (e) { return { ok: false, ms: Date.now() - t, error: (e instanceof Error ? e.message.replace(/pass\S*/gi, "***").replace(/(\w+):\/\/[^@]*@/g, "$1://***@").slice(0, 200) : "Error") } }
}

async function checkRedis() {
  const t = Date.now()
  try {
    // ioredis is bundled with bullmq
    const { default: Redis } = await import("ioredis")
    const url = process.env.REDIS_URL ?? "redis://localhost:6379"
    const client = new Redis(url, { lazyConnect: true, connectTimeout: 5000, maxRetriesPerRequest: 1 })
    await client.connect()
    await client.ping()
    client.disconnect()
    return { ok: true, ms: Date.now() - t }
  } catch (e) { return { ok: false, ms: Date.now() - t, error: (e instanceof Error ? e.message.replace(/pass\S*/gi, "***").replace(/(\w+):\/\/[^@]*@/g, "$1://***@").slice(0, 200) : "Error") } }
}

async function checkDigiseller() {
  const t = Date.now()
  try {
    const res = await axios.get("https://api.digiseller.ru/api/", { timeout: 8000, validateStatus: () => true })
    return { ok: res.status < 500, ms: Date.now() - t, status: res.status }
  } catch (e) { return { ok: false, ms: Date.now() - t, error: (e instanceof Error ? e.message.replace(/pass\S*/gi, "***").replace(/(\w+):\/\/[^@]*@/g, "$1://***@").slice(0, 200) : "Error") } }
}

async function checkMail() {
  const t = Date.now()
  try {
    const nodemailer = (await import("nodemailer")).default
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "",
      port: Number(process.env.SMTP_PORT ?? 587),
      auth: { user: process.env.SMTP_USER ?? "", pass: process.env.SMTP_PASS ?? "" },
    })
    await transport.verify()
    return { ok: true, ms: Date.now() - t }
  } catch (e) { return { ok: false, ms: Date.now() - t, error: (e instanceof Error ? e.message.replace(/pass\S*/gi, "***").replace(/(\w+):\/\/[^@]*@/g, "$1://***@").slice(0, 200) : "Error") } }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const [db, redis, digiseller, mail] = await Promise.all([checkDB(), checkRedis(), checkDigiseller(), checkMail()])
  const allOk = db.ok && redis.ok && digiseller.ok
  return NextResponse.json({ ok: allOk, db, redis, digiseller, mail, checkedAt: new Date().toISOString() })
}