import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"
import axios from "axios"

export const dynamic = "force-dynamic"

async function checkDB() {
  const t = Date.now()
  try { await prisma.$queryRaw`SELECT 1`; return { ok: true, ms: Date.now() - t } }
  catch (e) { return { ok: false, ms: Date.now() - t, error: String(e) } }
}

async function checkRedis() {
  const t = Date.now()
  try {
    const { createClient } = await import("redis")
    const url = process.env.REDIS_URL ?? "redis://localhost:6379"
    const c = createClient({ url })
    await c.connect(); await c.ping(); await c.disconnect()
    return { ok: true, ms: Date.now() - t }
  } catch (e) { return { ok: false, ms: Date.now() - t, error: String(e) } }
}

async function checkDigiseller() {
  const t = Date.now()
  try {
    const res = await axios.get("https://api.digiseller.ru/api/", { timeout: 8000, validateStatus: () => true })
    return { ok: res.status < 500, ms: Date.now() - t, status: res.status }
  } catch (e) { return { ok: false, ms: Date.now() - t, error: String(e) } }
}

async function checkMail() {
  const t = Date.now()
  try {
    const nodemailer = (await import("nodemailer")).default
    const t2 = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "", port: Number(process.env.SMTP_PORT ?? 587),
      auth: { user: process.env.SMTP_USER ?? "", pass: process.env.SMTP_PASS ?? "" },
    })
    await t2.verify()
    return { ok: true, ms: Date.now() - t }
  } catch (e) { return { ok: false, ms: Date.now() - t, error: String(e) } }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const [db, redis, digiseller, mail] = await Promise.all([checkDB(), checkRedis(), checkDigiseller(), checkMail()])
  const allOk = db.ok && redis.ok && digiseller.ok
  return NextResponse.json({ ok: allOk, db, redis, digiseller, mail, checkedAt: new Date().toISOString() })
}